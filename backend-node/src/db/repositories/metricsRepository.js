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

  /**
   * Analysis/Sound Count の差分に含まれる音源を、安定した順序で取得します。
   * 0 dB は成功した解析値の場合もあるため、失敗と決めつけずに返します。
   * @param {{limit:number,offset:number}} page 一度に返す最大件数と開始位置。
   * @returns {Promise<{total:number,sounds:Array<{hash:string,title:string,path:string}>,limit:number,offset:number}>} 差分の件数と音源一覧。
   */
  async listSoundsWithoutAnalysis({ limit, offset }) {
    const where = 'loudness_target = 0 OR loudness_target IS NULL';
    const total = countFromRows(await queryRows(this.db, `SELECT COUNT(*) AS count FROM sound_link WHERE ${where}`));
    const rows = limit > 0 ? await queryRows(this.db,
      `SELECT sound_hash, title, data_link FROM sound_link WHERE ${where} ORDER BY add_time DESC, sound_hash ASC LIMIT ? OFFSET ?`,
      [limit, offset]) : [];
    return {
      total,
      sounds: rows.map((row) => ({ hash: row.sound_hash, title: row.title, path: row.data_link })),
      limit,
      offset,
    };
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
