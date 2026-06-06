import { compressHash } from '../../utils/hash.js';

/**
 * @typedef {Record<string, any>} DbRow
 * MariaDB から返る 1 行分のオブジェクトです。列構成は SELECT 対象によって変わります。
 */

/**
 * mysql2 の query 結果から行配列だけを取り出します。
 * @param {{query:(sql:string, params?:Array<any>)=>Promise<[DbRow[], any]>|Promise<DbRow[]>}} db mysql2 互換の query 関数を持つ DB クライアント。
 * @param {string} sql 実行する SQL。
 * @param {Array<any>} [params=[]] プレースホルダへ渡す値。
 * @returns {Promise<DbRow[]>} SELECT 結果の行配列。テスト fake が行配列を直接返した場合もそのまま返します。
 */
async function queryRows(db, sql, params = []) {
  const result = await db.query(sql, params);
  return Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
}

/**
 * sound_link の DB 行を API 応答用の楽曲レコードへ整形します。
 * @param {DbRow} row sound_link の 1 行。
 * @returns {DbRow & {album:{album_hash:string|null,album_title:string|null}}} hash 圧縮、日時整形、歌詞改行正規化、album オブジェクト追加後の楽曲レコード。
 */
function mapSoundRecord(row) {
  const record = mapHashFields(row);
  if (typeof record.lyrics === 'string') {
    record.lyrics = normalizeLineBreaks(record.lyrics);
  }
  record.album = {
    album_hash: record.album_hash,
    album_title: record.album_title,
  };
  return record;
}

/**
 * API に返す hash と日時をフロント互換形式へ変換します。
 * @param {DbRow} row sound_hash、album_hash、artist_id、日時列を含む可能性がある DB 行。
 * @returns {DbRow} hash 列を圧縮表現にし、Date を yyyy-MM-dd HH:mm:ss へ整形した行。
 */
function mapHashFields(row) {
  return {
    ...row,
    add_time: normalizeDateTime(row.add_time),
    play_date: normalizeDateTime(row.play_date),
    sound_hash: compressNullableHash(row.sound_hash),
    album_hash: compressNullableHash(row.album_hash),
    artist_id: compressNullableHash(row.artist_id),
  };
}

/**
 * null 許容の SHA-1 文字列をフロント互換の短縮 hash へ変換します。
 * @param {string|null|undefined} hash SHA-1 hex 文字列。未設定の場合は null を返します。
 * @returns {string|null} 圧縮済み hash。入力が空の場合は null。
 */
function compressNullableHash(hash) {
  return hash ? compressHash(hash) : null;
}

/**
 * 音声ファイルパスの拡張子から Content-Type を決定します。
 * @param {string} filePath 音声ファイルパス。
 * @returns {string} 推定した MIME type。不明な場合は audio/octet-stream。
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
 * DB から Date として返った日時を API 互換文字列へ変換します。
 * @param {Date|string|null|undefined} value DB から返った日時値。
 * @returns {string|null|undefined} Date の場合は yyyy-MM-dd HH:mm:ss、その他は入力値をそのまま返します。
 */
function normalizeDateTime(value) {
  if (value instanceof Date) {
    return formatDateTime(value);
  }
  return value;
}

/**
 * Date を MariaDB と既存 API 互換の日時文字列へ変換します。
 * @param {Date} date 変換する日時。
 * @returns {string} yyyy-MM-dd HH:mm:ss 形式の日時文字列。
 */
function formatDateTime(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * CRLF/CR の改行を LF に統一します。
 * @param {string} value 改行を含む可能性がある文字列。
 * @returns {string} LF 改行へ統一した文字列。
 */
function normalizeLineBreaks(value) {
  return value.replace(/\r\n?/g, '\n');
}
export {
  compressNullableHash,
  formatDateTime,
  mapHashFields,
  mapSoundRecord,
  mimeFromPath,
  queryRows,
};
