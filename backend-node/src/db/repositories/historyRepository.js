import { mapHashFields, queryRows } from './common.js';

/**
 * HistoryRepositoryを扱う class です。
 */
class HistoryRepository {
/**
 * 依存関係を受け取って instance を初期化します。
 * @param {{query:function(string, Array<unknown>=):Promise<unknown>}} db mysql2互換の query 関数を持つ DB client。
 */
    constructor(db) {
    this.db = db;
  }

    /**
     * listHistory は、指定条件に一致するデータ一覧を取得します。
     * @param {number} start 取得範囲の開始位置。
     * @param {number} end 取得範囲の終了位置。
     * @returns {Promise<unknown[]>} 条件に一致したデータ一覧。
     */
    async listHistory(start, end) {
    return (await queryRows(this.db, 'SELECT * FROM v_history ORDER BY play_date DESC LIMIT ? OFFSET ?', [end, start]))
      .map((row) => mapHashFields(row));
  }
}

export { HistoryRepository };
