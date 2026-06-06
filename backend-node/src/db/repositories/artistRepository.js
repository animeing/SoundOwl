import { compressNullableHash, queryRows } from './common.js';

/**
 * artistテーブルと、artist基準の一覧表示を扱うDAO。
 */
class ArtistRepository {
  /**
   * @param {{query(sql:string, params?:unknown[]): Promise<[unknown[], unknown]|unknown[]>}} db mysql2 Pool/Connection。
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * artist名でartistを検索する。
   *
   * @param {string} artistName artist名。
   * @returns {Promise<Object|null>} artist DTO。存在しない場合はnull。
   */
  async findArtistByName(artistName) {
    const rows = await queryRows(this.db, 'SELECT * FROM artist WHERE artist_name = ?', [artistName]);
    return rows[0] || null;
  }

  /**
   * artist一覧を範囲取得し、代表album情報を付与する。
   *
   * @param {number} start OFFSET。
   * @param {number} end LIMIT。
   * @returns {Promise<Object[]>} API表示用artist DTO配列。
   */
  async listArtists(start, end) {
    const artists = await queryRows(this.db, 'SELECT * FROM artist ORDER BY (artist_name) LIMIT ? OFFSET ?', [end, start]);
    const results = [];
    for (const artist of artists) {
      const albums = await queryRows(
        this.db,
        "SELECT album_key, title FROM album WHERE artist_id = ? AND album_art <> '' LIMIT 1",
        [artist.artist_id],
      );
      results.push({
        artist_id: compressNullableHash(artist.artist_id),
        artist_name: artist.artist_name,
        album: albums[0] ? {
          album_key: compressNullableHash(albums[0].album_key),
          title: albums[0].title,
        } : {
          album_key: '',
          title: '',
        },
      });
    }
    return results;
  }

  /**
   * artistを登録する。
   *
   * @param {{artist_id:string, artist_name:string}} artist 登録するartist DTO。
   * @returns {Promise<Object>} 登録したartist DTO。
   */
  async insertArtist(artist) {
    await queryRows(this.db, 'INSERT INTO artist (artist_id, artist_name) VALUES (?, ?)', [artist.artist_id, artist.artist_name]);
    return artist;
  }
}

export { ArtistRepository };
