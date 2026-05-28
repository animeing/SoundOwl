const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { sha1 } = require('../utils/hash');

const SOUND_EXTENSIONS = /\.(mp3|m4a|wav|ogg|flac|ape)$/i;

/**
 * 音楽ファイル登録サービス。
 *
 * PHPの`sound_regist.php`相当の責務を担う。ファイル走査、メタデータ抽出、
 * artist/album/sound_linkの登録、音量解析jobのenqueueまでを行う。
 */
class SoundRegistrar {
  /**
   * @param {Object} dependencies 依存オブジェクト。
   * @param {import('../db/soundRepository').SoundRepository|Object} dependencies.repository SoundRepository互換DAO。
   * @param {{enqueueAudioProcessing(job:{file_path:string,hash:string}): Promise<unknown>}} dependencies.redis Redis DAO。
   * @param {(filePath:string) => Promise<import('../audio/metadata').NormalizedMetadata>} dependencies.metadataReader メタデータ取得関数。
   * @param {() => Date} [dependencies.clock] 登録時刻を返す関数。テストで固定するため注入可能。
   */
  constructor({ repository, redis, metadataReader, clock = () => new Date() }) {
    this.repository = repository;
    this.redis = redis;
    this.metadataReader = metadataReader;
    this.clock = clock;
  }

  /**
   * ディレクトリを再帰走査し、未登録の音楽ファイルを登録する。
   *
   * @param {string} rootDirectory 走査対象ディレクトリ。
   * @param {string[]} [exclusionPaths=[]] 除外する正規表現文字列。PHPの`EXCLUSION_PATHS`相当。
   * @returns {Promise<{count:number}>} 登録後のsound_link総件数。
   */
  async registerDirectory(rootDirectory, exclusionPaths = []) {
    const files = await listSoundFiles(rootDirectory, exclusionPaths);
    let count = 0;
    for (const file of files) {
      if (!(await this.repository.findSoundByPath(file))) {
        try {
          await this.registerFile(file);
        } catch {
          // Keep directory scans resilient: one unreadable or unanalyzable file must not fail the whole registration.
        }
      }
    }
    count = await this.repository.countSounds();
    return { count };
  }

  /**
   * 既存sound_hashからdata_linkを取得して1曲だけ再登録する。
   *
   * @param {string} soundHash 更新対象sound_hash。
   * @returns {Promise<{count:number}>} 処理後のsound_link総件数。
   */
  async refreshByHash(soundHash) {
    const sound = await this.repository.findSoundByHash(soundHash);
    if (!sound) {
      return { count: await this.repository.countSounds() };
    }
    try {
      await this.registerFile(sound.data_link, sound.sound_hash);
    } catch {
      return { count: await this.repository.countSounds() };
    }
    return { count: await this.repository.countSounds() };
  }

  /**
   * 1つの音楽ファイルを登録または更新し、音量解析jobをenqueueする。
   *
   * @param {string} filePath 登録対象音楽ファイルパス。
   * @returns {Promise<{action:'inserted'|'updated', sound:Object}|null>} 非対応拡張子ならnull。
   */
  async registerFile(filePath, soundHashOverride = null) {
    if (!SOUND_EXTENSIONS.test(filePath)) {
      return null;
    }

    const metadata = await this.metadataReader(filePath);
    const soundHash = soundHashOverride || sha1(filePath);
    const existing = await this.repository.findSoundByHash(soundHash);
    const sound = await this.buildSoundRecord(filePath, soundHash, metadata, existing);
    const result = await this.repository.upsertSound(sound);
    await this.redis.enqueueAudioProcessing({ file_path: filePath, hash: soundHash });
    return result;
  }

  /**
   * メタデータと既存行からsound_link DTOを組み立てる。
   *
   * @param {string} filePath 音楽ファイルパス。
   * @param {string} soundHash filePathのSHA1。
   * @param {import('../audio/metadata').NormalizedMetadata} metadata 正規化済みメタデータ。
   * @param {Object|null} existing 既存sound_link行。新規時はnull。
   * @returns {Promise<Object>} SoundLinkDto相当の値。
   */
  async buildSoundRecord(filePath, soundHash, metadata, existing) {
    const sound = {
      sound_hash: soundHash,
      add_time: formatDateTime(this.clock()),
      title: metadata.title || path.basename(filePath),
      genre: metadata.genre === false ? '' : metadata.genre,
      lyrics: metadata.lyrics === false ? null : metadata.lyrics,
      album_hash: null,
      album_title: null,
      artist_id: null,
      artist_name: null,
      track_no: metadata.track === false ? null : metadata.track,
      play_count: existing?.play_count ?? 0,
      data_link: filePath,
      loudness_target: existing?.loudness_target ?? 0,
    };

    if (metadata.artist) {
      const artist = await this.findOrCreateArtist(metadata.artist);
      sound.artist_id = artist.artist_id;
      sound.artist_name = artist.artist_name;
    }

    if (metadata.album) {
      const album = await this.findOrCreateAlbum(metadata.album, sound.artist_id, metadata);
      sound.album_hash = album.album_key;
      sound.album_title = album.title;
    } else if (metadata.album === false) {
      sound.album_hash = '';
    }

    return sound;
  }

  /**
   * アーティストを検索し、存在しなければPHPと同じく名前SHA1で作成する。
   *
   * @param {string} artistName アーティスト名。
   * @returns {Promise<{artist_id:string,artist_name:string}>} アーティストDTO。
   */
  async findOrCreateArtist(artistName) {
    const existing = await this.repository.findArtistByName(artistName);
    if (existing) {
      return existing;
    }
    return this.repository.insertArtist({
      artist_id: sha1(artistName),
      artist_name: artistName,
    });
  }

  /**
   * アルバムを検索し、artist/year等の一致条件で見つからなければ作成する。
   *
   * @param {string} albumTitle アルバムタイトル。
   * @param {string|null} artistId アーティストID。
   * @param {import('../audio/metadata').NormalizedMetadata} metadata アルバム作成に使うメタデータ。
   * @returns {Promise<Object>} AlbumDto相当の値。
   */
  async findOrCreateAlbum(albumTitle, artistId, metadata) {
    const existing = await this.repository.findAlbumByTitle(albumTitle);
    const match = existing.find((album) => isSameAlbum(album, { artistId, metadata }));
    if (match) {
      return match;
    }

    const albumId = sha1(albumTitle);
    const album = {
      album_key: artistId ? `${albumId}${artistId}` : `${albumId}${sha1(`${albumTitle}:${Date.now()}`)}`,
      album_id: albumId,
      title: albumTitle,
      artist_id: artistId,
      album_art: metadata.picture?.data ?? null,
      art_mime: metadata.picture?.mime ?? null,
      art_length: metadata.picture?.length ?? null,
      year: metadata.year || null,
    };
    return this.repository.insertAlbum(album);
  }
}

/**
 * 既存album行と読み取ったタグが同一アルバムか判定する。
 *
 * PHP実装と同じく、artist一致を最優先にし、別artistでもart情報またはyearが一致すれば
 * 同じアルバム候補として扱う。
 *
 * @param {Object} album 既存AlbumDto相当。
 * @param {{artistId:string|null,metadata:Object}} context 比較対象のartist/metadata。
 * @returns {boolean} 同一アルバムと見なせる場合true。
 */
function isSameAlbum(album, { artistId, metadata }) {
  if (album.artist_id === artistId) {
    return true;
  }
  if (hasSameArtwork(album, metadata.picture)) {
    return true;
  }
  return Boolean(metadata.year && album.year === metadata.year);
}

/**
 * アルバムアートのMIME/長さ/内容hashが一致するか判定する。
 *
 * @param {Object} album 既存AlbumDto相当。
 * @param {{data?:Buffer,mime?:string,length?:number}|null} picture 読み取った画像情報。
 * @returns {boolean} アートが同一ならtrue。
 */
function hasSameArtwork(album, picture) {
  if (!picture || !album.album_art) {
    return false;
  }
  if (album.art_length !== null && picture.length !== null && Number(album.art_length) !== Number(picture.length)) {
    return false;
  }
  if (album.art_mime && picture.mime && album.art_mime !== picture.mime) {
    return false;
  }
  return sha256(album.album_art) === sha256(picture.data);
}

/**
 * Buffer互換値のSHA256を返す。
 *
 * @param {Buffer|Uint8Array|string} value hash対象。
 * @returns {string} hex SHA256。
 */
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * ディレクトリ配下の対応音楽ファイルを列挙する。
 *
 * @param {string} rootDirectory 走査対象ディレクトリ。
 * @param {string[]} [exclusionPaths=[]] 除外正規表現文字列。
 * @returns {Promise<string[]>} 対応拡張子のファイルパス配列。
 */
async function listSoundFiles(rootDirectory, exclusionPaths = []) {
  const result = [];
  await walk(rootDirectory, result, exclusionPaths.map((pattern) => new RegExp(pattern)));
  return result;
}

/**
 * 再帰的にファイルを走査する内部処理。
 *
 * @param {string} directory 走査対象ディレクトリ。
 * @param {string[]} result 結果配列。
 * @param {RegExp[]} exclusionPatterns 除外正規表現。
 * @returns {Promise<void>} 走査完了時にresolveする。
 */
async function walk(directory, result, exclusionPatterns) {
  if (directory.includes('RECYCLE.BIN') || exclusionPatterns.some((pattern) => pattern.test(directory))) {
    return;
  }
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const base = directory.replaceAll('\\', '/').replace(/\/$/, '');
    const fullPath = `${base}/${entry.name}`;
    if (entry.isDirectory()) {
      await walk(fullPath, result, exclusionPatterns);
    } else if (entry.isFile() && SOUND_EXTENSIONS.test(fullPath)) {
      result.push(fullPath);
    }
  }
}

/**
 * DateをPHPの`Y-m-d H:i:s`相当へ変換する。
 *
 * @param {Date} date 変換対象日時。
 * @returns {string} `YYYY-MM-DD HH:mm:ss`形式の文字列。
 */
function formatDateTime(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

module.exports = {
  SOUND_EXTENSIONS,
  SoundRegistrar,
  formatDateTime,
  hasSameArtwork,
  isSameAlbum,
  listSoundFiles,
};
