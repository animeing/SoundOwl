import { compressNullableHash, queryRows } from './common.js';

/**
 * albumテーブルと、album基準の一覧表示を扱うDAO。
 */
class AlbumRepository {
  /**
   * @param {{query(sql:string, params?:unknown[]): Promise<[unknown[], unknown]|unknown[]>}} db mysql2 Pool/Connection。
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * album titleで候補を検索する。
   *
   * @param {string} title album title。
   * @returns {Promise<Object[]>} 同名album候補。
   */
  async findAlbumByTitle(title) {
    return queryRows(this.db, 'SELECT * FROM album WHERE title = ?', [title]);
  }

  /**
   * album一覧を範囲取得する。
   *
   * @param {number} start OFFSET。
   * @param {number} end LIMIT。
   * @returns {Promise<Object[]>} API表示用album DTO配列。
   */
  async listAlbums(start, end) {
    const albums = await queryRows(this.db, 'SELECT a.*, r.artist_name FROM album a LEFT JOIN artist r ON a.artist_id = r.artist_id LIMIT ? OFFSET ?', [end, start]);
    return albums.map((album) => ({
      album_key: compressNullableHash(album.album_key),
      title: album.title,
      artist: {
        artist_id: album.artist_id,
        artist_name: album.artist_name || '',
      },
    }));
  }

  /**
   * albumをsound_linkの合計play_count順で取得する。
   *
   * @param {number} [limit=100] 最大件数。
   * @returns {Promise<Object[]>} `{title, albumKey}`配列。
   */
  async listAlbumsByPlayCount(limit = 100) {
    const rows = await queryRows(
      this.db,
      `SELECT album_title AS title, album_hash AS albumKey
       FROM sound_link
       WHERE album_title IS NOT NULL
       GROUP BY album_hash, album_title
       ORDER BY SUM(play_count) DESC
       LIMIT ?`,
      [limit],
    );
    return rows
      .filter((row) => row.albumKey)
      .map((row) => ({ title: row.title, albumKey: compressNullableHash(row.albumKey) }));
  }

  /**
   * album_keyでalbumを1件取得する。
   *
   * @param {string} albumHash album_key。
   * @returns {Promise<Object|null>} album DTO。存在しない場合はnull。
   */
  async findAlbumByHash(albumHash) {
    const rows = await queryRows(this.db, 'SELECT * FROM album WHERE album_key = ?', [albumHash]);
    return rows[0] || null;
  }

  /**
   * albumを登録する。
   *
   * @param {Object} album 登録するalbum DTO。
   * @returns {Promise<Object>} 登録したalbum DTO。
   */
  async insertAlbum(album) {
    await queryRows(
      this.db,
      `INSERT INTO album
       (album_key, album_id, title, artist_id, album_art, art_mime, art_length, year)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        album.album_key,
        album.album_id,
        album.title,
        album.artist_id ?? null,
        album.album_art ?? null,
        album.art_mime ?? null,
        album.art_length ?? null,
        album.year ?? null,
      ],
    );
    return album;
  }
}

export { AlbumRepository };
