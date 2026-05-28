const crypto = require('node:crypto');

const COMPRESS_TABLE = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@,.<>[]:;!$()';

/**
 * SHA1ハッシュを16進文字列で返す。
 *
 * @param {string|Buffer} value ハッシュ化する値。現行PHPでは音楽ファイルパス文字列を主に使う。
 * @returns {string} 40桁のSHA1 hex文字列。
 */
function sha1(value) {
  return crypto.createHash('sha1').update(value).digest('hex');
}

/**
 * PHPの`ComplessUtil::compless`と互換の形式にSHA1 hex文字列を圧縮する。
 *
 * @param {string} hex 40桁想定のhex文字列。9文字ごとのchunkに分割される。
 * @returns {string} `_`区切り、先頭0を`-`で表現した圧縮hash。
 */
function compressHash(hex) {
  if (!hex) {
    hex = '';
  }
  return String(hex).match(/.{1,9}/g).map((chunk) => {
    const trimmed = chunk.replace(/^0+/, '');
    const prefix = '-'.repeat(chunk.length - trimmed.length);
    return `${prefix}${toCustomBase(trimmed === '' ? 0n : BigInt(`0x${trimmed}`))}`;
  }).join('_');
}

/**
 * PHPの`ComplessUtil::decompless`と互換の形式で圧縮hashをhex文字列へ戻す。
 *
 * @param {string} value `compressHash`が返す圧縮hash。
 * @returns {string} 復元したhex文字列。入力が不正な文字を含む場合、PHP同様に無視されうる。
 */
function decompressHash(value) {
  return String(value).split('_').map((chunk) => {
    const data = chunk.replace(/^-+/, '');
    const prefix = '0'.repeat(chunk.length - data.length);
    const decoded = fromCustomBase(data).toString(16);
    return `${prefix}${decoded}`;
  }).join('');
}

/**
 * 10進BigIntをSoundOwl独自の72進表現へ変換する。
 *
 * @param {bigint} value 変換対象の非負整数。
 * @returns {string} `COMPRESS_TABLE`を桁として使った文字列。
 */
function toCustomBase(value) {
  if (value === 0n) {
    return '';
  }
  const base = BigInt(COMPRESS_TABLE.length);
  let result = '';
  let current = value;
  while (current > 0n) {
    const mod = current % base;
    result = `${COMPRESS_TABLE[Number(mod)]}${result}`;
    current = (current - mod) / base;
  }
  return result;
}

/**
 * SoundOwl独自の72進表現をBigIntへ戻す。
 *
 * @param {string} value `COMPRESS_TABLE`の文字で構成された値。
 * @returns {bigint} 復元した非負整数。不明な文字はPHP実装と同様に寄与しない。
 */
function fromCustomBase(value) {
  let result = 0n;
  const base = BigInt(COMPRESS_TABLE.length);
  for (const char of String(value)) {
    const index = COMPRESS_TABLE.indexOf(char);
    if (index >= 0) {
      result = result * base + BigInt(index);
    }
  }
  return result;
}

module.exports = {
  COMPRESS_TABLE,
  compressHash,
  decompressHash,
  sha1,
};
