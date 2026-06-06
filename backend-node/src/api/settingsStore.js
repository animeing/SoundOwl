import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * @typedef {Record<string, string|string[]>} RuntimeSettings
 * フロントから保存され、get_setting.php 相当 API で返す実行時設定です。
 * 値は文字列、exclusionPaths など複数値の項目は文字列配列として保持します。
 */

/**
 * JSON 設定ファイルを読み書きするストアを作成します。
 * @param {string} filePath 読み書きする settings.json のパス。
 * @returns {{read:()=>Promise<RuntimeSettings>,write:(values:Record<string, any>)=>Promise<void>}} 設定の読み込みと保存を行うストア。
 */
function createSettingsStore(filePath) {
  return {
    /**
     * 設定ファイルを読み込み、文字列配列や文字化け補正を適用して返します。
     * @returns {Promise<RuntimeSettings>} 正規化済みの実行時設定。
     */
    async read() {
      return normalizeSettings(JSON.parse(stripBom(await fs.readFile(filePath, 'utf8'))));
    },
    /**
     * 投稿された設定値を正規化して JSON ファイルへ保存します。
     * @param {Record<string, any>} values フォームまたは JSON body から受け取った設定値。
     * @returns {Promise<void>} 保存完了後に解決します。
     */
    async write(values) {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `${JSON.stringify(normalizeSettings(values), null, 2)}\n`);
    },
  };
}

/**
 * 設定値を API 応答と保存に使う形へ正規化します。
 * @param {Record<string, any>} values フォーム、JSON、設定ファイルから読み込んだ key/value。
 * @returns {RuntimeSettings} null/undefined を空文字にし、配列項目と文字化けを補正した設定。
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
 * パイプ区切り、改行区切り、配列のいずれでも渡される文字列リストを配列へ統一します。
 * @param {string|string[]|number|boolean|null|undefined} value 設定画面から渡された単一値または複数値。
 * @returns {string[]} 空要素を除外し、Latin-1 経由の文字化けを補正した文字列配列。
 */
function normalizeStringArray(value) {
  const items = Array.isArray(value) ? value : String(value || '').split(/[|\r\n]+/);
  return items
    .filter((item) => item !== null && item !== undefined && String(item) !== '')
    .map((item) => repairLatin1Mojibake(String(item).trim()))
    .filter(Boolean);
}

/**
 * UTF-8 文字列が Latin-1 として解釈された場合だけ、元の UTF-8 文字列へ戻します。
 * @param {string} value 補正候補の文字列。
 * @returns {string} 日本語として復元できた場合は復元後の文字列。それ以外は入力値。
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
 * UTF-8 BOM が付いた JSON を JSON.parse できるように BOM だけを除去します。
 * @param {string} text ファイルから読み込んだ文字列。
 * @returns {string} 先頭 BOM を除去した文字列。
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
