import crypto from 'node:crypto';

const COMPRESS_TABLE = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@,.<>[]:;!$()';

/**
 * 任意の文字列または Buffer から SHA-1 hex 文字列を作成します。
 * @param {string|Buffer|Uint8Array} value hash 化する値。
 * @returns {string} 40 桁の SHA-1 hex 文字列。
 */
function sha1(value) {
  return crypto.createHash('sha1').update(value).digest('hex');
}

/**
 * SHA-1 hex を既存 API 互換の短縮 hash 表現へ圧縮します。
 * @param {string} hex SHA-1 などの hex 文字列。
 * @returns {string} 9 桁ごとの hex chunk を独自 72 進数へ変換し、_ で連結した短縮 hash。
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
 * 独自短縮 hash を元の hex 文字列へ戻します。
 * @param {string} value _ 区切りの短縮 hash。
 * @returns {string} 展開した hex 文字列。
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
 * BigInt を短縮 hash 用の独自 72 進数文字列へ変換します。
 * @param {bigint} value 変換する非負整数。
 * @returns {string} COMPRESS_TABLE を基数にした文字列。0n の場合は空文字。
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
 * 短縮 hash 用の独自 72 進数文字列を BigInt へ戻します。
 * @param {string} value COMPRESS_TABLE の文字だけで構成された値。
 * @returns {bigint} 復元した非負整数。未定義文字は無視します。
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

export {
  COMPRESS_TABLE,
  compressHash,
  decompressHash,
  sha1,
};
