import { mapHashFields, queryRows } from './common.js';

/**
 * 再生履歴viewを扱うDAO。
 */
class HistoryRepository {
  /**
   * @param {{query(sql:string, params?:unknown[]): Promise<[unknown[], unknown]|unknown[]>}} db mysql2 Pool/Connection。
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * 再生履歴をplay_date降順で範囲取得する。
   *
   * @param {number} start LIMIT。
   * @param {number} end OFFSET。
   * @returns {Promise<Object[]>} API表示用履歴DTO配列。
   */
  async listHistory(start, end) {
    return (await queryRows(this.db, 'SELECT * FROM v_history ORDER BY play_date DESC LIMIT ? OFFSET ?', [start, end]))
      .map((row) => mapHashFields(row));
  }
}

export { HistoryRepository };
