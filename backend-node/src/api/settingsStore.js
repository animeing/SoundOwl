const fs = require('node:fs/promises');
const path = require('node:path');

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
    result[key] = value === null || value === undefined ? '' : String(value);
  }
  return result;
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

module.exports = {
  createSettingsStore,
  normalizeSettings,
  stripBom,
};
