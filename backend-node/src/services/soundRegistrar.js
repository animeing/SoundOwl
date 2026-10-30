import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { sha1 } from '../utils/hash.js';

const SOUND_EXTENSIONS = /\.(mp3|m4a|wav|ogg|flac|ape)$/i;

/** Public stage description; the original exception remains available as cause for server logs. */
class RegistrationFailure extends Error {
  constructor(reason, cause) {
    super(reason, { cause });
  }
}

/** Return a safe reason without exposing database or parser exception details to clients. */
function registrationFailureReason(error) {
  return error instanceof RegistrationFailure ? error.message : 'Could not process this sound.';
}

/**
 * 音楽ディレクトリの走査、タグ読み込み、アーティスト・アルバム・曲データ登録を担当するサービスです。
 */
class SoundRegistrar {
  /**
   * SoundRegistrar を初期化します。
   * @param {{repository:Record<string, Function>,redis:{enqueueAudioProcessing:(job:{file_path:string,hash:string})=>Promise<unknown>},metadataReader:(filePath:string)=>Promise<{hasTags:boolean,title:string|false,artist:string|false,album:string|false,genre:string|false,lyrics:string|false,track:string|false,year:string|false,picture:{data?:Buffer,mime?:string|null,length?:number|null}|null,raw:unknown}>,failureStore?:{record:Function,resolve:Function}|null,clock?:()=>Date}} dependencies 曲登録に必要な依存関係。
   * @param {object} dependencies.repository 曲、アーティスト、アルバム、件数を読み書きする repository。
   * @param {Function} dependencies.repository.findSoundByPath data_link から既存曲を検索します。
   * @param {Function} dependencies.repository.findSoundByHash sound_hash から既存曲を検索します。
   * @param {Function} dependencies.repository.upsertSound 登録用に組み立てた曲レコードを追加または更新します。
   * @param {Function} dependencies.repository.findArtistByName アーティスト名から既存アーティストを検索します。
   * @param {Function} dependencies.repository.insertArtist アーティストを新規登録します。
   * @param {Function} dependencies.repository.findAlbumByTitle アルバム名から同名アルバム候補を取得します。
   * @param {Function} dependencies.repository.insertAlbum アルバムを新規登録します。
   * @param {Function} dependencies.repository.countSounds 登録済み曲数を取得します。
   * @param {object} dependencies.redis 音量解析キューへ登録ジョブを投入する DAO。
   * @param {Function} dependencies.redis.enqueueAudioProcessing Step2 の音量解析キューへ {file_path, hash} を投入します。
   * @param {Function} dependencies.metadataReader 音声ファイルパスから正規化済みメタデータを読み込む関数。
   * @param {object|null} [dependencies.failureStore] Step1 の未解決失敗を保存し、成功時に消すストア。
   * @param {Function} [dependencies.clock] add_time を固定したいテストで差し替える現在時刻取得関数。
   */
  constructor({ repository, redis, metadataReader, failureStore = null, clock = () => new Date() }) {
    this.repository = repository;
    this.redis = redis;
    this.metadataReader = metadataReader;
    this.failureStore = failureStore;
    this.clock = clock;
  }

  /**
   * 音楽ディレクトリを再帰走査し、未登録の音源ファイルを登録します。
   * @param {string} rootDirectory 走査を開始する音楽ディレクトリ。
   * @param {string[]} [exclusionPaths=[]] 走査対象から除外するパス正規表現文字列。
   * @returns {Promise<{count:number,failedCount:number,failures:Array<{target:string,reason:string}>}> 曲総数と今回処理できなかった音源。
   */
  async registerDirectory(rootDirectory, exclusionPaths = []) {
    const files = await listSoundFiles(rootDirectory, exclusionPaths);
    const failures = [];
    for (const file of files) {
      if (!(await this.repository.findSoundByPath(file))) {
        try {
          await this.registerFile(file);
        } catch (error) {
          // Continue the scan, but report each incomplete file instead of presenting the whole run as successful.
          console.error('Sound registration failed:', file, error);
          const reason = registrationFailureReason(error);
          await this.failureStore?.record(1, file, reason);
          failures.push({ target: file, reason });
        }
      }
    }
    return { count: await this.repository.countSounds(), failedCount: failures.length, failures };
  }

  /**
   * 既存曲のファイルパスを使ってメタデータを再読み込みし、曲情報を再登録します。
   * @param {string} soundHash 再登録対象の sound_hash。
   * @returns {Promise<{count:number,error?:{target:string,reason:string,code?:string}}>} 成功時の曲総数、または対象と公開用の失敗理由。
   */
  async refreshByHash(soundHash) {
    const existingSoundRecord = await this.repository.findSoundByHash(soundHash);
    if (!existingSoundRecord) {
      return {
        count: await this.repository.countSounds(),
        error: { target: soundHash, reason: 'Sound not found.', code: 'SOUND_NOT_FOUND' },
      };
    }
    try {
      const soundUpsertResult = await this.registerFile(existingSoundRecord.data_link, existingSoundRecord.sound_hash);
      if (soundUpsertResult === null) {
        throw new RegistrationFailure('Unsupported audio format.');
      }
    } catch (error) {
      console.error('Sound update failed:', existingSoundRecord.data_link, error);
      const reason = registrationFailureReason(error);
      await this.failureStore?.record(1, existingSoundRecord.data_link, reason);
      return {
        count: await this.repository.countSounds(),
        error: { target: existingSoundRecord.data_link, reason },
      };
    }
    return { count: await this.repository.countSounds() };
  }

  /**
   * 1つの音声ファイルを読み込み、曲・アーティスト・アルバムを DB へ保存し、音量解析キューへ投入します。
   * @param {string} filePath 登録対象の音声ファイルパス。
   * @param {string|null} [soundHashOverride=null] 既存曲更新時に使用する sound_hash。未指定時はファイルパスから生成します。
   * @returns {Promise<{action:'inserted'|'updated',sound:Record<string,unknown>}|null>} 保存の種別と保存後の曲レコード。対応拡張子でない場合は null。
   */
  async registerFile(filePath, soundHashOverride = null) {
    if (!SOUND_EXTENSIONS.test(filePath)) {
      return null;
    }

    let soundMetadata;
    try {
      soundMetadata = await this.metadataReader(filePath);
    } catch (error) {
      throw new RegistrationFailure('Could not read audio metadata.', error);
    }
    const soundHash = soundHashOverride || sha1(filePath);
    /** @type {{action:'inserted'|'updated',sound:Record<string,unknown>}} */
    let soundUpsertResult;
    try {
      const existingSoundRecord = await this.repository.findSoundByHash(soundHash);
      const soundRecordToSave = await this.buildSoundRecord(filePath, soundHash, soundMetadata, existingSoundRecord);
      soundUpsertResult = await this.repository.upsertSound(soundRecordToSave);
    } catch (error) {
      throw new RegistrationFailure('Could not save sound information.', error);
    }
    try {
      await this.redis.enqueueAudioProcessing({ file_path: filePath, hash: soundHash });
    } catch (error) {
      throw new RegistrationFailure('Sound saved, but audio analysis could not be queued.', error);
    }
    await this.failureStore?.resolve(1, filePath);
    return soundUpsertResult;
  }

  /**
   * 正規化済みメタデータと既存曲情報から sound_data 保存用レコードを作成します。
   * @param {string} filePath 登録対象ファイルパス。
   * @param {string} soundHash 保存する sound_hash。
   * @param {{title:string|false,artist:string|false,album:string|false,genre:string|false,lyrics:string|false,track:string|false,year:string|false,picture?:{data?:Buffer,mime?:string|null,length?:number|null}|null}} soundMetadata 正規化済みタグ情報。
   * @param {{play_count?:number,loudness_target?:number}|null|undefined} existingSoundRecord 既存登録済み曲。再登録時に再生回数と音量解析値を引き継ぎます。
   * @returns {Promise<Record<string, unknown>>} sound_link へ保存する曲レコード。
   */
  async buildSoundRecord(filePath, soundHash, soundMetadata, existingSoundRecord) {
    const soundRecord = {
      sound_hash: soundHash,
      add_time: formatDateTime(this.clock()),
      title: soundMetadata.title || path.basename(filePath),
      genre: soundMetadata.genre === false ? '' : soundMetadata.genre,
      lyrics: soundMetadata.lyrics === false ? null : soundMetadata.lyrics,
      album_hash: null,
      album_title: null,
      artist_id: null,
      artist_name: null,
      track_no: soundMetadata.track === false ? null : soundMetadata.track,
      play_count: existingSoundRecord?.play_count ?? 0,
      data_link: filePath,
      loudness_target: existingSoundRecord?.loudness_target ?? 0,
    };

    if (soundMetadata.artist) {
      const artist = await this.findOrCreateArtist(soundMetadata.artist);
      soundRecord.artist_id = artist.artist_id;
      soundRecord.artist_name = artist.artist_name;
    }

    if (soundMetadata.album) {
      const album = await this.findOrCreateAlbum(soundMetadata.album, soundRecord.artist_id, soundMetadata);
      soundRecord.album_hash = album.album_key;
      soundRecord.album_title = album.title;
    } else if (soundMetadata.album === false) {
      soundRecord.album_hash = '';
    }

    return soundRecord;
  }

  /**
   * アーティスト名から既存アーティストを取得し、無ければ新規作成します。
   * @param {string} artistName 登録または検索するアーティスト名。
   * @returns {Promise<{artist_id:string,artist_name:string}>} 登録済みまたは新規作成したアーティスト。
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
   * アルバム名、アーティスト、画像、年の情報から同一アルバムを探し、無ければ作成します。
   * @param {string} albumTitle 登録または検索するアルバム名。
   * @param {string|null} artistId アルバムアーティストの artist_id。タグが無い場合は null。
   * @param {{year?:string|false,picture?:{data?:Buffer,mime?:string|null,length?:number|null}|null}} metadata 正規化済みタグ情報。画像と年の同一判定にも使います。
   * @returns {Promise<Record<string, unknown>>} 登録済みまたは新規作成したアルバム。
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
 * 既存アルバムが今回登録する音源のアルバムと同一か判定します。
 * @param {{artist_id:string|null,album_art?:Buffer,art_length?:number|null,art_mime?:string|null,year?:string|null}} album DB から取得した同名アルバム候補。
 * @param {{artistId:string|null,metadata:{year?:string|false,picture?:{data?:Buffer,mime?:string|null,length?:number|null}|null}}} context 今回登録する音源のアーティスト ID とメタデータ。
 * @returns {boolean} アーティスト ID、画像ハッシュ、年のいずれかが一致すれば true。
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
 * 既存アルバム画像と今回のタグ画像が同じ画像か判定します。
 * @param {{album_art?:Buffer,art_length?:number|null,art_mime?:string|null}} album DB に保存済みのアルバム画像情報。
 * @param {{data?:Buffer,mime?:string|null,length?:number|null}|null|undefined} picture 今回読み込んだタグ画像。
 * @returns {boolean} サイズ、MIME、SHA-256 が矛盾なく一致する場合は true。
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
 * 値の SHA-256 ハッシュを16進文字列で作成します。
 * @param {string|Buffer|Uint8Array} value ハッシュ化する値。
 * @returns {string} SHA-256 の16進文字列。
 */
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

/**
 * 音楽ディレクトリから登録対象の音源ファイル一覧を取得します。
 * @param {string} rootDirectory 走査を開始するディレクトリ。
 * @param {string[]} [exclusionPaths=[]] 除外対象を表す正規表現文字列。
 * @returns {Promise<string[]>} 登録対象拡張子に一致した音源ファイルパス一覧。
 */
async function listSoundFiles(rootDirectory, exclusionPaths = []) {
  const result = [];
  await walk(rootDirectory, result, exclusionPaths.map((pattern) => new RegExp(pattern)));
  return result;
}

/**
 * ディレクトリを再帰走査し、音源ファイルを result に追加します。
 * @param {string} directory 現在走査しているディレクトリ。
 * @param {string[]} result 見つかった音源ファイルパスを蓄積する配列。
 * @param {RegExp[]} exclusionPatterns 除外判定に使う正規表現配列。
 * @returns {Promise<void>} 走査完了後に解決します。
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
 * Date を DB の日時文字列 `YYYY-MM-DD HH:mm:ss` へ変換します。
 * @param {Date} date 変換する日時。
 * @returns {string} DB保存用の日時文字列。
 */
function formatDateTime(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export {
  SOUND_EXTENSIONS,
  SoundRegistrar,
  formatDateTime,
  hasSameArtwork,
  isSameAlbum,
  listSoundFiles,
};
