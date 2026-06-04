import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * JSON設定ファイルの読み書きを行う。
 *
 * @param {string} filePath setting JSONのパス。
 * @returns {{read(): Promise<Object.<string,string>>, write(values:Object.<string,unknown>): Promise<void>}} 設定store。
 */
function createSettingsStore(filePath) {
  return {
    async read() {
      return normalizeSettings(JSON.parse(stripBom(await fs.readFile(filePath, 'utf8'))));
    },
    async write(values) {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `${JSON.stringify(normalizeSettings(values), null, 2)}\n`);
    },
  };
}

/**
 * 設定値をAPI互換の文字列値へ揃える。
 *
 * @param {Object.<string,unknown>} values JSONから読んだ設定値。
 * @returns {Object.<string,string>} API返却/保存用設定値。
 */
function normalizeSettings(values) {
  const result = {};
  for (const [key, value] of Object.entries(values || {})) {
    if (key === 'exclusionPaths') {
      result[key] = normalizeStringArray(value);
    } else if (Array.isArray(value)) {
      result[key] = value
        .filter((item) => item !== null && item !== undefined && String(item) !== '')
        .map((item) => repairLatin1Mojibake(String(item)));
    } else {
      result[key] = value === null || value === undefined ? '' : repairLatin1Mojibake(String(value));
    }
  }
  return result;
}

/**
 * 設定JSON内の配列値を文字列配列へ正規化する。
 *
 * `exclusionPaths` は旧設定の`|`区切り文字列も配列へ移行する。
 *
 * @param {unknown} value 配列、または旧区切り文字列。
 * @returns {string[]} 空値を除いた文字列配列。
 */
function normalizeStringArray(value) {
  const items = Array.isArray(value) ? value : String(value || '').split(/[|\r\n]+/);
  return items
    .filter((item) => item !== null && item !== undefined && String(item) !== '')
    .map((item) => repairLatin1Mojibake(String(item).trim()))
    .filter(Boolean);
}

/**
 * UTF-8文字列をLatin-1として扱ったことで発生した既存設定の文字化けを修復する。
 *
 * 例: `è½èª` -> `落語`。
 * すでに正常な日本語は対象外にするため、全コードポイントがLatin-1範囲内で、
 * 復元後に置換文字がなく、日本語文字を含む場合だけ変換する。
 *
 * @param {string} value 設定値。
 * @returns {string} 修復可能ならUTF-8へ戻した文字列。通常値はそのまま返す。
 */
function repairLatin1Mojibake(value) {
  if (![...value].every((char) => char.codePointAt(0) <= 0xff)) {
    return value;
  }
  const repaired = Buffer.from(value, 'latin1').toString('utf8');
  if (repaired.includes('\uFFFD')) {
    return value;
  }
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(repaired) ? repaired : value;
}

/**
 * UTF-8 BOM付きJSONも受け入れるため、先頭BOMだけを取り除く。
 *
 * @param {string} text JSON文字列。
 * @returns {string} JSON.parseへ渡せる文字列。
 */
function stripBom(text) {
  return text.replace(/^\uFEFF/, '');
}

export {
  createSettingsStore,
  normalizeSettings,
  normalizeStringArray,
  repairLatin1Mojibake,
  stripBom,
};
