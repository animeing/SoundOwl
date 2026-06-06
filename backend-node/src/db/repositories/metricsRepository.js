import { queryRows } from './common.js';

/**
 * MetricsRepositoryを扱う class です。
 */
class MetricsRepository {
/**
 * 依存関係を受け取って instance を初期化します。
 * @param {{query:function(string, Array<unknown>=):Promise<unknown>}} db mysql2互換の query 関数を持つ DB client。
 */
    constructor(db) {
    this.db = db;
  }

    /**
     * countSounds は、対象データの件数を取得します。
     * @returns {Promise<number>} 対象データの件数。
     */
    async countSounds() {
    return countFromRows(await queryRows(this.db, 'SELECT COUNT(*) AS count FROM sound_link'));
  }

    /**
     * countArtists は、対象データの件数を取得します。
     * @returns {Promise<number>} 対象データの件数。
     */
    async countArtists() {
    return countFromRows(await queryRows(this.db, 'SELECT COUNT(*) AS count FROM artist'));
  }

    /**
     * countAlbums は、対象データの件数を取得します。
     * @returns {Promise<number>} 対象データの件数。
     */
    async countAlbums() {
    return countFromRows(await queryRows(this.db, 'SELECT COUNT(*) AS count FROM album'));
  }

    /**
     * countAnalysisSounds は、対象データの件数を取得します。
     * @returns {Promise<number>} 対象データの件数。
     */
    async countAnalysisSounds() {
    return countFromRows(await queryRows(this.db, 'SELECT COUNT(*) AS count FROM sound_link WHERE loudness_target <> 0'));
  }
}

/**
 * countFromRows は、対象データの件数を取得します。
 * @param {Record<string, unknown>} rows countFromRows の処理で使用する rows。
 * @returns {number} 対象データの件数。
 */
function countFromRows(rows) {
  return Number(rows[0]?.count || rows[0]?.COUNTER || 0);
}

export { MetricsRepository, countFromRows };
