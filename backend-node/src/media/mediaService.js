const fs = require('node:fs/promises');
const path = require('node:path');

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
 * 画像表示と音声出力の基礎処理。
 *
 * HTTPレスポンス自体は次段階のAPI adapterで行い、このクラスは
 * MIME、byte range、fallback画像、Redisキャッシュ判定に必要な情報だけを返す。
 */
class MediaService {
  /**
   * @param {Object} dependencies 依存オブジェクト。
   * @param {Object} dependencies.repository Album/Playlist/Sound取得用Repository。
   * @param {Object} dependencies.redis Album art cache用Redis DAO。
   * @param {string} dependencies.blankImagePath blank画像ファイルパス。
   */
  constructor({ repository, redis, blankImagePath }) {
    this.repository = repository;
    this.redis = redis;
    this.blankImagePath = blankImagePath;
  }

  /**
   * アルバムアートを取得する。存在しなければblank画像を返す。
   *
   * @param {string|null|undefined} albumHash album_key。
   * @returns {Promise<{status:number,mime:string,body:Buffer,cacheLoad:boolean}>} 画像レスポンス相当のDTO。
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
   * プレイリストアートを取得する。存在しなければblank画像を返す。
   *
   * @param {string|null|undefined} playlistName プレイリスト名。
   * @returns {Promise<{status:number,mime:string,body:Buffer,cacheLoad?:boolean}>} 画像レスポンス相当のDTO。
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
   * 音声配信用のファイルパス、HTTP status、Range headerを計算する。
   *
   * @param {string} soundHash sound_hash。
   * @param {string|null|undefined} rangeHeader HTTP Range header。例: `bytes=1-1024`。
   * @returns {Promise<{status:number,headers:Object,path:string|null,range?:{start:number,end:number}}>} 配信準備結果。
   */
  async prepareSoundStream(soundHash, rangeHeader) {
    const sound = await this.repository.findSoundByHash(soundHash);
    if (!sound) {
      return { status: 404, headers: {}, path: null };
    }
    const stat = await fs.stat(sound.data_link);
    const range = parseRange(rangeHeader, stat.size);
    const mime = mimeFromPath(sound.data_link);
    return {
      status: range.start === 0 ? 200 : 206,
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
   * blank画像を読み込み、画像レスポンスDTOとして返す。
   *
   * @returns {Promise<{status:number,mime:string,body:Buffer,cacheLoad:boolean}>} blank画像DTO。
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
 * HTTP Range headerを開始/終了byteへ変換する。
 *
 * @param {string|null|undefined} rangeHeader Range header。
 * @param {number} size ファイルサイズ。
 * @returns {{start:number,end:number}} byte範囲。未指定/不正時は全体。
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
 * 拡張子から最低限のMIMEを推定する。
 *
 * @param {string} filePath ファイルパス。
 * @returns {string} MIME type。不明時は`application/octet-stream`。
 */
function mimeFromPath(filePath) {
  return MIME_BY_EXTENSION[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

module.exports = {
  MediaService,
  mimeFromPath,
  parseRange,
};
