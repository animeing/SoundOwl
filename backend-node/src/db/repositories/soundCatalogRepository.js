const { formatDateTime, mapSoundRecord, mimeFromPath, queryRows } = require('./common');

/**
 * sound_linkを中心に、音源の検索・詳細・登録更新・再生回数・音量解析値を扱うDAO。
 */
class SoundCatalogRepository {
  /**
   * @param {{query(sql:string, params?:unknown[]): Promise<[unknown[], unknown]|unknown[]>}} db mysql2 Pool/Connection。
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * sound_hashで音源を1件取得する。
   *
   * @param {string} soundHash 音源hash。
   * @returns {Promise<Object|null>} sound_link行。存在しない場合はnull。
   */
  async findSoundByHash(soundHash) {
    const rows = await queryRows(this.db, 'SELECT * FROM sound_link WHERE sound_hash = ?', [soundHash]);
    return rows[0] || null;
  }

  /**
   * data_linkで音源を1件取得する。
   *
   * @param {string} dataLink 音声ファイルパス。
   * @returns {Promise<Object|null>} sound_link行。存在しない場合はnull。
   */
  async findSoundByPath(dataLink) {
    const rows = await queryRows(this.db, 'SELECT * FROM sound_link WHERE data_link = ?', [dataLink]);
    return rows[0] || null;
  }

  /**
   * add_time降順で音源一覧を取得する。
   *
   * @param {number} [limit=100] 最大件数。
   * @returns {Promise<Object[]>} API表示用sound DTO配列。
   */
  async listSoundsByAddTime(limit = 100) {
    return mapSoundRows(await queryRows(this.db, 'SELECT * FROM sound_link ORDER BY add_time DESC LIMIT ?', [limit]));
  }

  /**
   * play_count降順で音源一覧を取得する。
   *
   * @param {number} [limit=100] 最大件数。
   * @returns {Promise<Object[]>} API表示用sound DTO配列。
   */
  async listSoundsByPlayCount(limit = 100) {
    return mapSoundRows(await queryRows(this.db, 'SELECT * FROM sound_link ORDER BY play_count DESC LIMIT ?', [limit]));
  }

  /**
   * 音源詳細を取得し、MIMEを付与する。
   *
   * @param {string} soundHash 音源hash。
   * @returns {Promise<Object|null>} API詳細DTO。存在しない場合はnull。
   */
  async findSoundDetail(soundHash) {
    const sound = await this.findSoundByHash(soundHash);
    return sound ? { ...mapSoundRecord(sound), mime: mimeFromPath(sound.data_link) } : null;
  }

  /**
   * artist/title/album_titleから音源を検索する。
   *
   * @param {string} word 検索語。
   * @returns {Promise<Object[]>} API表示用sound DTO配列。
   */
  async searchSounds(word) {
    const like = `%${word}%`;
    return mapSoundRows(await queryRows(
      this.db,
      `SELECT * FROM sound_link
       WHERE artist_name LIKE ? OR title LIKE ? OR album_title LIKE ?
       ORDER BY
         CASE WHEN artist_name = ? THEN 1 WHEN title = ? THEN 1 WHEN album_title = ? THEN 1 ELSE 2 END,
         CHAR_LENGTH(artist_name), CHAR_LENGTH(title), CHAR_LENGTH(album_title)`,
      [like, like, like, word, word, word],
    ));
  }

  /**
   * 再生回数を増やし、再生履歴を追加する。
   *
   * @param {string} soundHash 音源hash。
   * @param {Date} playedAt 再生日時。
   * @returns {Promise<void>} 更新完了時にresolve。
   */
  async incrementPlayCount(soundHash, playedAt) {
    await queryRows(this.db, 'UPDATE sound_link SET play_count = play_count + 1 WHERE sound_hash = ?', [soundHash]);
    await queryRows(this.db, 'INSERT INTO sound_play_history (sound_hash, play_date) VALUES (?, ?)', [soundHash, formatDateTime(playedAt)]);
  }

  /**
   * 音源をinsertまたはupdateする。
   *
   * @param {Object} sound 保存するsound_link DTO。
   * @returns {Promise<{action:'inserted'|'updated', sound:Object}>} 実行結果。
   */
  async upsertSound(sound) {
    const exists = await this.findSoundByHash(sound.sound_hash);
    if (exists) {
      await queryRows(
        this.db,
        `UPDATE sound_link
         SET title = ?, genre = ?, lyrics = ?, album_hash = ?, album_title = ?,
             artist_id = ?, artist_name = ?, track_no = ?, play_count = ?,
             data_link = ?, loudness_target = ?
         WHERE sound_hash = ?`,
        [
          sound.title,
          sound.genre ?? null,
          sound.lyrics ?? null,
          sound.album_hash ?? null,
          sound.album_title ?? null,
          sound.artist_id ?? null,
          sound.artist_name ?? null,
          sound.track_no ?? null,
          sound.play_count ?? exists.play_count ?? 0,
          sound.data_link,
          sound.loudness_target ?? exists.loudness_target ?? 0,
          sound.sound_hash,
        ],
      );
      return { action: 'updated', sound: { ...exists, ...sound } };
    }

    await queryRows(
      this.db,
      `INSERT INTO sound_link
       (sound_hash, add_time, title, genre, lyrics, album_hash, album_title,
        artist_id, artist_name, track_no, play_count, data_link, loudness_target)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sound.sound_hash,
        sound.add_time,
        sound.title,
        sound.genre ?? null,
        sound.lyrics ?? null,
        sound.album_hash ?? null,
        sound.album_title ?? null,
        sound.artist_id ?? null,
        sound.artist_name ?? null,
        sound.track_no ?? null,
        sound.play_count ?? 0,
        sound.data_link,
        sound.loudness_target ?? 0,
      ],
    );
    return { action: 'inserted', sound };
  }

  /**
   * album配下の音源をtrack_no順で取得する。
   *
   * @param {string} albumHash album_key。
   * @returns {Promise<Object[]>} API表示用sound DTO配列。
   */
  async listAlbumSounds(albumHash) {
    return mapSoundRows(await queryRows(this.db, 'SELECT * FROM sound_link WHERE album_hash = ? ORDER BY LENGTH(track_no), track_no', [albumHash]));
  }

  /**
   * artist配下の音源をtrack_no順で取得する。
   *
   * @param {string} artistHash artist_id。
   * @returns {Promise<Object[]>} API表示用sound DTO配列。
   */
  async listArtistSounds(artistHash) {
    return mapSoundRows(await queryRows(this.db, 'SELECT * FROM sound_link WHERE artist_id = ? ORDER BY LENGTH(track_no), track_no', [artistHash]));
  }

  /**
   * 音源のloudness_targetを更新する。
   *
   * @param {string} soundHash 音源hash。
   * @param {number} loudnessTarget ffmpeg volumedetectのmean_volume値。
   * @returns {Promise<void>} 更新完了時にresolve。
   */
  async updateLoudness(soundHash, loudnessTarget) {
    await queryRows(this.db, 'UPDATE sound_link SET loudness_target = ? WHERE sound_hash = ?', [loudnessTarget, soundHash]);
  }
}

/**
 * sound_link行配列をAPI表示用sound DTOへ変換する。
 *
 * @param {Object[]} rows DB行配列。
 * @returns {Object[]} API表示用sound DTO配列。
 */
function mapSoundRows(rows) {
  return rows.map((row) => mapSoundRecord(row));
}

module.exports = { SoundCatalogRepository };
