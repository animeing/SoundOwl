import { queryRows } from './common.js';

/**
 * site_status/WebSocket向けの件数取得を扱うDAO。
 */
class MetricsRepository {
  /**
   * @param {{query(sql:string, params?:unknown[]): Promise<[unknown[], unknown]|unknown[]>}} db mysql2 Pool/Connection。
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * sound_linkの件数を取得する。
   *
   * @returns {Promise<number>} 登録済み音源件数。
   */
  async countSounds() {
    return countFromRows(await queryRows(this.db, 'SELECT COUNT(*) AS count FROM sound_link'));
  }

  /**
   * artistの件数を取得する。
   *
   * @returns {Promise<number>} artist件数。
   */
  async countArtists() {
    return countFromRows(await queryRows(this.db, 'SELECT COUNT(*) AS count FROM artist'));
  }

  /**
   * albumの件数を取得する。
   *
   * @returns {Promise<number>} album件数。
   */
  async countAlbums() {
    return countFromRows(await queryRows(this.db, 'SELECT COUNT(*) AS count FROM album'));
  }

  /**
   * loudness_target入力済み音源件数を取得する。
   *
   * @returns {Promise<number>} 解析済み音源件数。
   */
  async countAnalysisSounds() {
    return countFromRows(await queryRows(this.db, 'SELECT COUNT(*) AS count FROM sound_link WHERE loudness_target <> 0'));
  }
}

/**
 * MariaDB driverやalias差を吸収してCOUNT値を取り出す。
 *
 * @param {Object[]} rows COUNT SQLの戻り値。
 * @returns {number} 件数。
 */
function countFromRows(rows) {
  return Number(rows[0]?.count || rows[0]?.COUNTER || 0);
}

export { MetricsRepository, countFromRows };
