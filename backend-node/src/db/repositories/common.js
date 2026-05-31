const { compressHash } = require('../../utils/hash');

/**
 * mysql2の戻り値差を吸収して、常にrows配列を返す。
 *
 * @param {{query(sql:string, params?:unknown[]): Promise<[unknown[], unknown]|unknown[]>}} db mysql2 Pool/Connection。
 * @param {string} sql 実行するSQL。外部値は必ずparamsで渡す。
 * @param {unknown[]} [params=[]] placeholderへ渡す値。
 * @returns {Promise<unknown[]>} SELECTでは行配列、更新系ではdriver戻り値。
 */
async function queryRows(db, sql, params = []) {
  const result = await db.query(sql, params);
  return Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
}

/**
 * sound_link行をPHP互換API DTOへ変換する。
 *
 * @param {Object} row sound_link行。
 * @returns {Object} hash圧縮済みのsound DTO。
 */
function mapSoundRecord(row) {
  const record = mapHashFields(row);
  record.album = {
    album_hash: record.album_hash,
    album_title: record.album_title,
  };
  return record;
}

/**
 * 既知のhash列をPHP互換の圧縮hashへ変換する。
 *
 * @param {Object} row DB行。
 * @returns {Object} hash列を圧縮したcopy。
 */
function mapHashFields(row) {
  return {
    ...row,
    add_time: normalizeDateTime(row.add_time),
    play_date: normalizeDateTime(row.play_date),
    sound_hash: compressNullableHash(row.sound_hash),
    album_hash: compressNullableHash(row.album_hash),
  };
}

/**
 * SHA1 hashをPHP `ComplessUtil::compless` 互換表現へ変換する。
 *
 * @param {string|null|undefined} hash 40桁SHA1 hash。
 * @returns {string|null} 圧縮hash。空値はnull。
 */
function compressNullableHash(hash) {
  return hash ? compressHash(hash) : null;
}

/**
 * 音声ファイルパスからAPI用MIMEを推定する。
 *
 * @param {string} filePath 音声ファイルパス。
 * @returns {string} audio MIME。
 */
function mimeFromPath(filePath) {
  const ext = String(filePath || '').split('.').pop().toLowerCase();
  const mimes = {
    wav: 'audio/wav',
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
    ape: 'audio/ape',
  };
  return mimes[ext] || 'audio/octet-stream';
}

/**
 * DB driverがDateで返した日時をPHP JSONと同じ文字列表現へ戻す。
 *
 * @param {unknown} value DB日時値。
 * @returns {unknown} 整形済み日時、または元の値。
 */
function normalizeDateTime(value) {
  if (value instanceof Date) {
    return formatDateTime(value);
  }
  return value;
}

/**
 * Dateを`YYYY-MM-DD HH:mm:ss`へ変換する。
 *
 * @param {Date} date 変換対象日時。
 * @returns {string} PHP API互換の日時文字列。
 */
function formatDateTime(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

module.exports = {
  compressNullableHash,
  formatDateTime,
  mapHashFields,
  mapSoundRecord,
  mimeFromPath,
  queryRows,
};
