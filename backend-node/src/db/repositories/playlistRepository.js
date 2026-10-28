import { mapHashFields, queryRows } from './common.js';

/**
 * playlistとplaylist_dataを扱うDAO。
 */
class PlaylistRepository {
  /**
   * @param {import('mysql2/promise').Pool} db トランザクション用の接続を取得できる mysql2 Pool。
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
   * 親playlist_dataと順序付きの全曲明細を、同じDB接続上でまとめて作成する。
   * INSERTや確定に失敗した場合はrollbackを試み、元のエラーを呼び出し側へ返す。
   *
   * @param {string} name playlist名。
   * @param {string[]} soundHashes sound_hash配列。配列内の順序をsound_pointに保存する。
   * @returns {Promise<void>} 全行の確定完了時にresolve。
   */
  async createPlaylist(name, soundHashes) {
    const playlistConnection = await this.db.getConnection();
    try {
      await playlistConnection.beginTransaction();
      try {
        await queryRows(playlistConnection, 'INSERT INTO playlist_data (play_list) VALUES (?)', [name]);
        for (const [index, soundHash] of soundHashes.entries()) {
          await queryRows(
            playlistConnection,
            'INSERT INTO playlist (play_list, sound_point, sound_hash) VALUES (?, ?, ?)',
            [name, index, soundHash],
          );
        }
        await playlistConnection.commit();
      } catch (createError) {
        try {
          await playlistConnection.rollback();
        } catch (rollbackError) {
          throw new AggregateError([createError, rollbackError], 'playlist creation and rollback failed');
        }
        throw createError;
      }
    } finally {
      playlistConnection.release();
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
