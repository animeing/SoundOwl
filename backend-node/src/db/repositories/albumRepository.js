import { compressNullableHash, queryRows } from './common.js';

/**
 * AlbumRepositoryを扱う class です。
 */
class AlbumRepository {
/**
 * 依存関係を受け取って instance を初期化します。
 * @param {{query:function(string, Array<unknown>=):Promise<unknown>}} db mysql2互換の query 関数を持つ DB client。
 */
    constructor(db) {
    this.db = db;
  }

    /**
     * findAlbumByTitle は、指定条件に一致する1件のデータを取得します。
     * @param {string} title findAlbumByTitle の処理で使用する title。
     * @returns {Promise<unknown>} findAlbumByTitle の処理結果。
     */
    async findAlbumByTitle(title) {
    return queryRows(this.db, 'SELECT * FROM album WHERE title = ?', [title]);
  }

    /**
     * listAlbums は、指定条件に一致するデータ一覧を取得します。
     * @param {number} start 取得範囲の開始位置または offset。
     * @param {number} end 取得範囲の終了位置または limit。
     * @returns {Promise<unknown[]>} 条件に一致したデータ一覧。
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
     * listAlbumsByPlayCount は、指定条件に一致するデータ一覧を取得します。
     * @param {number} limit 取得する最大件数。
     * @returns {Promise<unknown[]>} 条件に一致したデータ一覧。
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
     * findAlbumByHash は、指定条件に一致する1件のデータを取得します。
     * @param {string} albumHash アルバムを一意に識別する album_key または album_hash。
     * @returns {Promise<unknown>} findAlbumByHash の処理結果。
     */
    async findAlbumByHash(albumHash) {
    const rows = await queryRows(this.db, 'SELECT * FROM album WHERE album_key = ?', [albumHash]);
    return rows[0] || null;
  }

    /**
     * insertAlbum は、新規レコードを DB に追加します。
     * @param {Record<string, unknown>} album insertAlbum の処理で使用する album。
     * @returns {Promise<unknown>} insertAlbum の処理結果。
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
