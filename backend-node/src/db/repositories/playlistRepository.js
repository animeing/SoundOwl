import { mapHashFields, queryRows } from './common.js';

/**
 * playlistとplaylist_dataを扱うDAO。
 */
class PlaylistRepository {
  /**
   * @param {{query(sql:string, params?:unknown[]): Promise<[unknown[], unknown]|unknown[]>}} db mysql2 Pool/Connection。
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * playlist_dataを1件取得する。
   *
   * @param {string} playList playlist名。
   * @returns {Promise<Object|null>} playlist_data行。存在しない場合はnull。
   */
  async findPlaylistData(playList) {
    const rows = await queryRows(this.db, 'SELECT * FROM playlist_data WHERE play_list = ?', [playList]);
    return rows[0] || null;
  }

  /**
   * playlist名一覧を取得する。
   *
   * @returns {Promise<Object[]>} playlist名一覧。
   */
  async listPlaylistNames() {
    return queryRows(this.db, 'SELECT play_list FROM playlist_data ORDER BY update_datetime DESC');
  }

  /**
   * playlist内の音源を順序付きで取得する。
   *
   * @param {string} name playlist名。
   * @returns {Promise<Object[]>} API表示用sound DTO配列。
   */
  async listPlaylistSounds(name) {
    return (await queryRows(this.db, 'SELECT * FROM v_playlist WHERE play_list = ? ORDER BY sound_point', [name]))
      .map((row) => mapHashFields(row));
  }

  /**
   * playlistを作成する。
   *
   * @param {string} name playlist名。
   * @param {string[]} soundHashes sound_hash配列。
   * @returns {Promise<void>} 作成完了時にresolve。
   */
  async createPlaylist(name, soundHashes) {
    await queryRows(this.db, 'INSERT INTO playlist_data (play_list) VALUES (?)', [name]);
    for (const [index, soundHash] of soundHashes.entries()) {
      await queryRows(this.db, 'INSERT INTO playlist (play_list, sound_point, sound_hash) VALUES (?, ?, ?)', [name, index, soundHash]);
    }
  }

  /**
   * playlistを削除する。
   *
   * @param {string} name playlist名。
   * @returns {Promise<void>} 削除完了時にresolve。
   */
  async deletePlaylist(name) {
    await queryRows(this.db, 'DELETE FROM playlist_data WHERE play_list = ?', [name]);
  }
}

export { PlaylistRepository };
