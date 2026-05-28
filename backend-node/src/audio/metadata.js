const path = require('node:path');

/**
 * @typedef {Object} NormalizedMetadata
 * @property {boolean} hasTags ffprobe結果にtagが存在したか。
 * @property {string|false} title タイトル。タグが無い場合はファイル名。
 * @property {string|false} artist artist/album_artist/bandの優先順で得たアーティスト。
 * @property {string|false} album album/productの優先順で得たアルバム。
 * @property {string|false} genre ジャンル。
 * @property {string|false} lyrics 歌詞。
 * @property {string|false} track トラック番号。
 * @property {string|false} year 年または日付の先頭10文字。
 * @property {{mime:string|null,length:number|null}|null} picture 埋め込み画像の概要。
 * @property {Object} raw ffprobeの元データ。
 */

/**
 * ffprobe結果をPHPのgetID3利用箇所に近い形へ正規化する。
 *
 * @param {Object} probeResult ffprobe JSON。
 * @param {string} filePath タイトルfallbackに使うファイルパス。
 * @returns {NormalizedMetadata} 登録処理が扱いやすいメタデータDTO。
 */
function normalizeMetadata(probeResult, filePath) {
  const formatTags = probeResult?.format?.tags || {};
  const streamTags = Object.assign({}, ...((probeResult?.streams || []).map((stream) => stream.tags || {})));
  const tags = { ...streamTags, ...formatTags };

  const title = firstTag(tags, ['title', 'TITLE']) || path.basename(filePath);
  const artist = firstTag(tags, ['artist', 'ARTIST', 'album_artist', 'ALBUMARTIST', 'band', 'BAND']);
  const album = firstTag(tags, ['album', 'ALBUM', 'product', 'PRODUCT']);
  const genre = firstTag(tags, ['genre', 'GENRE']);
  const lyrics = firstTag(tags, ['lyrics', 'LYRICS', 'unsyncedlyrics', 'UNSYNCEDLYRICS']);
  const track = firstTag(tags, ['track', 'TRACK', 'track_number', 'TRACKNUMBER']);
  const year = firstTag(tags, ['date', 'DATE', 'year', 'YEAR']);

  return {
    hasTags: Object.keys(tags).length > 0,
    title: stringOrFalse(title),
    artist: stringOrFalse(artist),
    album: stringOrFalse(album),
    genre: stringOrFalse(genre),
    lyrics: stringOrFalse(lyrics),
    track: stringOrFalse(track),
    year: year ? String(year).slice(0, 10) : false,
    picture: extractPicture(probeResult),
    raw: probeResult,
  };
}

/**
 * `music-metadata`で音楽タグを読み、登録処理用DTOへ正規化する。
 *
 * @param {string} filePath 解析対象音源ファイルパス。
 * @param {{parseFile?:Function}} [options] テスト用parser差し替え。
 * @returns {Promise<NormalizedMetadata>} 正規化済みメタデータ。
 */
async function readMetadata(filePath, options = {}) {
  const parseFile = options.parseFile || (await import('music-metadata')).parseFile;
  return normalizeMusicMetadata(await parseFile(filePath, { duration: false }), filePath);
}

/**
 * `music-metadata`の解析結果をPHP getID3相当DTOへ変換する。
 *
 * @param {Object} metadata `music-metadata` parse結果。
 * @param {string} filePath タイトルfallbackに使うファイルパス。
 * @returns {NormalizedMetadata} 正規化済みメタデータ。
 */
function normalizeMusicMetadata(metadata, filePath) {
  const common = metadata?.common || {};
  const native = metadata?.native || {};
  const title = common.title || path.basename(filePath);
  const artist = common.artist || common.albumartist || firstNativeTag(native, ['artist', 'albumartist', 'album_artist', 'band']);
  const album = common.album || firstNativeTag(native, ['album', 'product']);
  const picture = Array.isArray(common.picture) && common.picture[0] ? common.picture[0] : null;
  return {
    hasTags: hasMetadataTags(common, native),
    title: stringOrFalse(title),
    artist: stringOrFalse(artist),
    album: stringOrFalse(album),
    genre: stringOrFalse(Array.isArray(common.genre) ? common.genre[0] : common.genre),
    lyrics: stringOrFalse(Array.isArray(common.lyrics) ? common.lyrics[0] : common.lyrics),
    track: common.track?.no ? String(common.track.no) : stringOrFalse(firstNativeTag(native, ['track', 'tracknumber'])),
    year: common.year ? String(common.year).slice(0, 10) : stringOrFalse(firstNativeTag(native, ['date', 'year'])),
    picture: picture ? {
      data: picture.data,
      mime: picture.format || null,
      length: picture.data?.length || null,
    } : null,
    raw: metadata,
  };
}

/**
 * native tag群から候補名に一致する最初の値を返す。
 *
 * @param {Object.<string, Array<{id:string,value:unknown}>>} native native tag object。
 * @param {string[]} names 候補tag名。
 * @returns {unknown|false} 見つかった値。無ければfalse。
 */
function firstNativeTag(native, names) {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  for (const tags of Object.values(native || {})) {
    for (const tag of tags || []) {
      if (wanted.has(String(tag.id).toLowerCase())) {
        return Array.isArray(tag.value) ? tag.value[0] : tag.value;
      }
    }
  }
  return false;
}

/**
 * 実タグがあるかを判定する。
 *
 * @param {Object} common common tags。
 * @param {Object} native native tags。
 * @returns {boolean} tagがあればtrue。
 */
function hasMetadataTags(common, native) {
  return Object.keys(common || {}).length > 0 || Object.values(native || {}).some((tags) => (tags || []).length > 0);
}

/**
 * 複数のtag名候補から最初に存在する値を返す。
 *
 * @param {Object.<string, unknown>} tags ffprobe tag object。
 * @param {string[]} names 優先順のtag名候補。
 * @returns {string|false|unknown} 見つかった値。無ければfalse。
 */
function firstTag(tags, names) {
  for (const name of names) {
    if (tags[name] !== undefined && tags[name] !== null && tags[name] !== '') {
      return Array.isArray(tags[name]) ? tags[name][0] : tags[name];
    }
  }
  return false;
}

/**
 * 空値をfalseへ揃え、値があれば文字列化する。
 *
 * @param {unknown} value 変換対象。
 * @returns {string|false} 文字列値、または未検出を示すfalse。
 */
function stringOrFalse(value) {
  return value === false || value === undefined || value === null || value === '' ? false : String(value);
}

/**
 * ffprobe stream情報から埋め込み画像の概要を取り出す。
 *
 * @param {Object} probeResult ffprobe JSON。
 * @returns {{mime:string|null,length:number|null}|null} 画像概要。存在しなければnull。
 */
function extractPicture(probeResult) {
  const pictureStream = (probeResult?.streams || []).find((stream) => stream.disposition?.attached_pic);
  if (!pictureStream) {
    return null;
  }
  return {
    mime: pictureStream.codec_name ? `image/${pictureStream.codec_name.replace('mjpeg', 'jpeg')}` : null,
    length: Number(pictureStream.duration_ts || 0) || null,
  };
}

module.exports = {
  firstNativeTag,
  hasMetadataTags,
  normalizeMusicMetadata,
  normalizeMetadata,
  readMetadata,
};
