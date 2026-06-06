import fs from 'node:fs/promises';
import path from 'node:path';

const MIME_BY_EXTENSION = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
};

/**
 * アルバムアート、プレイリスト画像、音声ストリーム配信の準備を担当するサービスです。
 */
class MediaService {
  /**
   * MediaService を初期化します。
   * @param {{repository:{findAlbumByHash:(albumHash:string)=>Promise<{album_art?:Buffer,art_mime?:string}|null>,findPlaylistData:(playlistName:string)=>Promise<{art?:Buffer}|null>,findSoundByHash:(soundHash:string)=>Promise<{data_link:string}|null>},redis:{configureImageCache:()=>Promise<void>,getCachedAlbum:(albumHash:string)=>Promise<{album_art?:Buffer,art_mime?:string}|null>,cacheAlbum:(albumHash:string, album:Record<string, unknown>)=>Promise<unknown>},blankImagePath:string}} dependencies メディア配信に必要な依存関係。
   * @param {object} dependencies.repository アルバム、プレイリスト、曲ファイルパスを取得する repository。
   * @param {Function} dependencies.repository.findAlbumByHash albumHash からアルバム行を取得します。album_art、art_mime を参照します。
   * @param {Function} dependencies.repository.findPlaylistData playlistName からプレイリスト代表画像を取得します。
   * @param {Function} dependencies.repository.findSoundByHash soundHash から音声ファイルパス data_link を取得します。
   * @param {object} dependencies.redis アルバムアートの Redis cache を扱う DAO。
   * @param {Function} dependencies.redis.configureImageCache Redis の画像 cache 設定を初期化します。
   * @param {Function} dependencies.redis.getCachedAlbum albumHash の cache 済みアルバム情報を取得します。
   * @param {Function} dependencies.redis.cacheAlbum albumHash に対応するアルバム情報を cache します。
   * @param {string} dependencies.blankImagePath アートが存在しない場合に返す代替画像ファイルパス。
   */
  constructor({ repository, redis, blankImagePath }) {
    this.repository = repository;
    this.redis = redis;
    this.blankImagePath = blankImagePath;
  }

  /**
   * アルバムハッシュからアルバムアートを取得します。未指定、未登録、画像なしの場合は代替画像を返します。
   * @param {string|null|undefined} albumHash album.album_key として保存されているアルバム識別子。
   * @returns {Promise<{status:number,mime:string,body:Buffer,cacheLoad:boolean}>} 配信する画像本文、MIME、HTTP status、Redis cache hit 有無。
   */
  async getAlbumArt(albumHash) {
    if (!albumHash) {
      return this.blankImage();
    }
    await this.redis.configureImageCache();
    const cached = await this.redis.getCachedAlbum(albumHash);
    const album = cached || await this.repository.findAlbumByHash(albumHash);
    if (!cached) {
      await this.redis.cacheAlbum(albumHash, album || {});
    }
    if (!album?.album_art) {
      return this.blankImage();
    }
    return { status: 200, mime: album.art_mime || 'image/png', body: album.album_art, cacheLoad: Boolean(cached) };
  }

  /**
   * プレイリスト名から代表画像を取得します。未指定または画像なしの場合は代替画像を返します。
   * @param {string|null|undefined} playlistName 画像を取得するプレイリスト名。
   * @returns {Promise<{status:number,mime:string,body:Buffer,cacheLoad?:boolean}>} 配信する画像本文、MIME、HTTP status。
   */
  async getPlaylistArt(playlistName) {
    if (!playlistName) {
      return this.blankImage();
    }
    const playlist = await this.repository.findPlaylistData(playlistName);
    if (!playlist?.art) {
      return this.blankImage();
    }
    return { status: 200, mime: 'image/png', body: playlist.art };
  }

  /**
   * 音声配信のためにファイル存在確認、MIME 推定、Range ヘッダー解析を行います。
   * @param {string} soundHash 再生対象の sound_hash。
   * @param {string|undefined|null} rangeHeader HTTP Range ヘッダー。未指定の場合はファイル全体を配信範囲にします。
   * @returns {Promise<{status:number,headers:Record<string,string|number>,path:string|null,range?:{start:number,end:number}}>} HTTP 配信に必要なヘッダー、ファイルパス、byte range。曲またはファイルが存在しない場合は status 404 と path null を返します。
   */
  async prepareSoundStream(soundHash, rangeHeader) {
    const sound = await this.repository.findSoundByHash(soundHash);
    if (!sound) {
      return { status: 404, headers: {}, path: null };
    }
    let stat;
    try {
      stat = await fs.stat(sound.data_link);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
        return { status: 404, headers: {}, path: null };
      }
      throw error;
    }
    const range = parseRange(rangeHeader, stat.size);
    const mime = mimeFromPath(sound.data_link);
    return {
      status: rangeHeader ? 206 : 200,
      headers: {
        'Accept-Ranges': 'bytes',
        ETag: `"${soundHash}"`,
        Accept: mime,
        'Content-Type': mime,
        'Content-Range': `bytes ${range.start}-${range.end}/${stat.size}`,
        'Content-Length': range.end - range.start + 1,
      },
      path: sound.data_link,
      range,
    };
  }

  /**
   * アルバムアートが無い場合に返す代替画像を読み込みます。
   * @returns {Promise<{status:number,mime:string,body:Buffer,cacheLoad:boolean}>} 代替画像の配信用 DTO。
   */
  async blankImage() {
    return {
      status: 200,
      mime: mimeFromPath(this.blankImagePath),
      body: await fs.readFile(this.blankImagePath),
      cacheLoad: false,
    };
  }
}

/**
 * HTTP Range ヘッダーをファイルサイズ内の開始・終了 byte に変換します。
 * @param {string|undefined|null} rangeHeader `bytes=start-end` 形式の Range ヘッダー。
 * @param {number} size 対象ファイルの総 byte 数。
 * @returns {{start:number,end:number}} 配信する byte 範囲。ヘッダー未指定または不正な場合は全体範囲を返します。
 */
function parseRange(rangeHeader, size) {
  if (!rangeHeader) {
    return { start: 0, end: size - 1 };
  }
  const match = String(rangeHeader).match(/bytes=(\d+)-(\d*)/);
  if (!match) {
    return { start: 0, end: size - 1 };
  }
  const start = Number(match[1]);
  const end = match[2] === '' ? size - 1 : Number(match[2]);
  return { start, end };
}

/**
 * ファイル拡張子から配信用 MIME type を推定します。
 * @param {string} filePath MIME type を判定するファイルパス。
 * @returns {string} 対応拡張子の MIME type。未対応の場合は application/octet-stream。
 */
function mimeFromPath(filePath) {
  return MIME_BY_EXTENSION[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

export {
  MediaService,
  mimeFromPath,
  parseRange,
};
