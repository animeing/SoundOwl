const { compressHash } = require('../utils/hash');

/**
 * @typedef {Object} SoundLinkDto
 * @property {string} sound_hash 音源を一意に識別するSHA1 hash。
 * @property {string} add_time `YYYY-MM-DD HH:mm:ss`形式の登録日時。
 * @property {string} title 表示タイトル。
 * @property {string|null} [genre] ジャンル。未設定時はnullまたは空文字。
 * @property {string|null} [lyrics] 歌詞。
 * @property {string|null} [album_hash] アルバムキー。
 * @property {string|null} [album_title] アルバムタイトル。
 * @property {string|null} [artist_id] アーティストID。
 * @property {string|null} [artist_name] アーティスト名。
 * @property {string|null} [track_no] トラック番号。
 * @property {number} [play_count] 再生回数。
 * @property {string} data_link 音源ファイルの絶対パス。
 * @property {number|string} [loudness_target] ffmpeg解析で得る平均音量dB。
 */

/**
 * @typedef {Object} ArtistDto
 * @property {string} artist_id アーティスト名のSHA1。
 * @property {string} artist_name アーティスト名。
 */

/**
 * @typedef {Object} AlbumDto
 * @property {string} album_key アルバムを一意に識別するキー。
 * @property {string} album_id アルバムタイトルのSHA1。
 * @property {string} title アルバムタイトル。
 * @property {string|null} [artist_id] アーティストID。
 * @property {Buffer|null} [album_art] アルバムアート画像バイナリ。
 * @property {string|null} [art_mime] 画像MIME。
 * @property {number|null} [art_length] 画像サイズ。
 * @property {string|null} [year] 年または日付文字列。
 */

/**
 * SoundOwl DBへのDAO相当クラス。
 *
 * SequelizeなどのORMではなく明示SQLにしている理由は、既存PHPのSQL/VIEW/TRIGGERと
 * 契約テストの期待値をそのまま追跡しやすくするため。値はplaceholderで渡し、
 * SQL injectionを避ける境界はこのRepositoryに集約する。
 */
class SoundRepository {
  /**
   * @param {{query(sql:string, params?:unknown[]): Promise<[unknown[], unknown]|unknown[]>}} db mysql2 Pool/Connection互換。
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * sound_hashで音源を1件取得する。
   *
   * @param {string} soundHash SHA1音源hash。
   * @returns {Promise<SoundLinkDto|null>} 見つかった音源。存在しなければnull。
   */
  async findSoundByHash(soundHash) {
    const rows = await this.query('SELECT * FROM sound_link WHERE sound_hash = ?', [soundHash]);
    return rows[0] || null;
  }

  /**
   * data_linkで音源を1件取得する。
   *
   * @param {string} dataLink 音源ファイルパス。
   * @returns {Promise<SoundLinkDto|null>} 見つかった音源。存在しなければnull。
   */
  async findSoundByPath(dataLink) {
    const rows = await this.query('SELECT * FROM sound_link WHERE data_link = ?', [dataLink]);
    return rows[0] || null;
  }

  /**
   * add_time降順で音源一覧を取得する。
   *
   * @param {number} [limit=100] 最大件数。
   * @returns {Promise<SoundLinkDto[]>} 音源一覧。
   */
  async listSoundsByAddTime(limit = 100) {
    return this.mapSoundRows(await this.query('SELECT * FROM sound_link ORDER BY add_time DESC LIMIT ?', [limit]));
  }

  /**
   * play_count降順で音源一覧を取得する。
   *
   * @param {number} [limit=100] 最大件数。
   * @returns {Promise<SoundLinkDto[]>} 音源一覧。
   */
  async listSoundsByPlayCount(limit = 100) {
    return this.mapSoundRows(await this.query('SELECT * FROM sound_link ORDER BY play_count DESC LIMIT ?', [limit]));
  }

  /**
   * 音源詳細を取得する。
   *
   * @param {string} soundHash sound_hash。
   * @returns {Promise<SoundLinkDto|null>} 音源詳細。存在しなければnull。
   */
  async findSoundDetail(soundHash) {
    const sound = await this.findSoundByHash(soundHash);
    return sound ? { ...mapSoundRecord(sound), mime: mimeFromPath(sound.data_link) } : null;
  }

  /**
   * artist/title/album_titleから音源を検索する。
   *
   * @param {string} word 検索語。
   * @returns {Promise<SoundLinkDto[]>} 検索結果。
   */
  async searchSounds(word) {
    const like = `%${word}%`;
    return this.mapSoundRows(await this.query(
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
   * @param {string} soundHash sound_hash。
   * @param {Date} playedAt 再生日時。
   * @returns {Promise<void>} 更新完了時にresolveする。
   */
  async incrementPlayCount(soundHash, playedAt) {
    await this.query('UPDATE sound_link SET play_count = play_count + 1 WHERE sound_hash = ?', [soundHash]);
    await this.query('INSERT INTO sound_play_history (sound_hash, play_date) VALUES (?, ?)', [soundHash, formatDateTime(playedAt)]);
  }

  /**
   * 音源をinsertまたはupdateする。
   *
   * @param {SoundLinkDto} sound 保存する音源DTO。
   * @returns {Promise<{action:'inserted'|'updated', sound:SoundLinkDto}>} 実行結果と保存後DTO。
   */
  async upsertSound(sound) {
    const exists = await this.findSoundByHash(sound.sound_hash);
    if (exists) {
      await this.query(
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

    await this.query(
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
   * アーティスト名でアーティストを検索する。
   *
   * @param {string} artistName アーティスト名。
   * @returns {Promise<ArtistDto|null>} 見つかったアーティスト。存在しなければnull。
   */
  async findArtistByName(artistName) {
    const rows = await this.query('SELECT * FROM artist WHERE artist_name = ?', [artistName]);
    return rows[0] || null;
  }

  /**
   * artist一覧を範囲取得する。
   *
   * @param {number} start LIMIT。
   * @param {number} end OFFSET。
   * @returns {Promise<Object[]>} artist一覧。
   */
  async listArtists(start, end) {
    const artists = await this.query('SELECT * FROM artist ORDER BY (artist_name) LIMIT ? OFFSET ?', [end, start]);
    const results = [];
    for (const artist of artists) {
      const albums = await this.query(
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
   * artist配下の音源をtrack_no順で取得する。
   *
   * @param {string} artistHash artist_id。
   * @returns {Promise<SoundLinkDto[]>} 音源一覧。
   */
  async listArtistSounds(artistHash) {
    return this.mapSoundRows(await this.query('SELECT * FROM sound_link WHERE artist_id = ? ORDER BY LENGTH(track_no), track_no', [artistHash]));
  }

  /**
   * アーティストを登録する。
   *
   * @param {ArtistDto} artist 登録するアーティストDTO。
   * @returns {Promise<ArtistDto>} 登録したDTO。
   */
  async insertArtist(artist) {
    await this.query('INSERT INTO artist (artist_id, artist_name) VALUES (?, ?)', [artist.artist_id, artist.artist_name]);
    return artist;
  }

  /**
   * アルバムタイトルで候補を検索する。
   *
   * @param {string} title アルバムタイトル。
   * @returns {Promise<AlbumDto[]>} 同名アルバム候補。
   */
  async findAlbumByTitle(title) {
    return this.query('SELECT * FROM album WHERE title = ?', [title]);
  }

  /**
   * album一覧を範囲取得する。
   *
   * @param {number} start LIMIT。
   * @param {number} end OFFSET。
   * @returns {Promise<AlbumDto[]>} album一覧。
   */
  async listAlbums(start, end) {
    const albums = await this.query('SELECT a.*, r.artist_name FROM album a LEFT JOIN artist r ON a.artist_id = r.artist_id LIMIT ? OFFSET ?', [end, start]);
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
   * album配下の音源をtrack_no順で取得する。
   *
   * @param {string} albumHash album_key。
   * @returns {Promise<SoundLinkDto[]>} 音源一覧。
   */
  async listAlbumSounds(albumHash) {
    return this.mapSoundRows(await this.query('SELECT * FROM sound_link WHERE album_hash = ? ORDER BY LENGTH(track_no), track_no', [albumHash]));
  }

  /**
   * albumを合計play_count順で取得する。
   *
   * @param {number} [limit=100] 最大件数。
   * @returns {Promise<Object[]>} `{title, albumKey}`配列。
   */
  async listAlbumsByPlayCount(limit = 100) {
    const rows = await this.query(
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
   * album_keyでアルバムを1件取得する。
   *
   * @param {string} albumHash album_key。
   * @returns {Promise<AlbumDto|null>} 見つかったアルバム。存在しなければnull。
   */
  async findAlbumByHash(albumHash) {
    const rows = await this.query('SELECT * FROM album WHERE album_key = ?', [albumHash]);
    return rows[0] || null;
  }

  /**
   * playlist_dataを1件取得する。
   *
   * @param {string} playList プレイリスト名。
   * @returns {Promise<{play_list:string, art:Buffer|null}|null>} プレイリストデータ。存在しなければnull。
   */
  async findPlaylistData(playList) {
    const rows = await this.query('SELECT * FROM playlist_data WHERE play_list = ?', [playList]);
    return rows[0] || null;
  }

  /**
   * 再生履歴をplay_date降順で取得する。
   *
   * @param {number} start LIMIT。
   * @param {number} end OFFSET。
   * @returns {Promise<Object[]>} 履歴一覧。
   */
  async listHistory(start, end) {
    return (await this.query('SELECT * FROM v_history ORDER BY play_date DESC LIMIT ? OFFSET ?', [start, end]))
      .map((row) => mapHashFields(row));
  }

  /**
   * playlist名一覧を取得する。
   *
   * @returns {Promise<Object[]>} playlist名一覧。
   */
  async listPlaylistNames() {
    return this.query('SELECT play_list FROM playlist_data ORDER BY update_datetime DESC');
  }

  /**
   * playlist内音源を取得する。
   *
   * @param {string} name playlist名。
   * @returns {Promise<Object[]>} playlist音源一覧。
   */
  async listPlaylistSounds(name) {
    return (await this.query('SELECT * FROM v_playlist WHERE play_list = ? ORDER BY sound_point', [name]))
      .map((row) => mapHashFields(row));
  }

  /**
   * playlistを作成する。
   *
   * @param {string} name playlist名。
   * @param {string[]} soundHashes sound_hash配列。
   * @returns {Promise<void>} 作成完了時にresolveする。
   */
  async createPlaylist(name, soundHashes) {
    await this.query('INSERT INTO playlist_data (play_list) VALUES (?)', [name]);
    for (const [index, soundHash] of soundHashes.entries()) {
      await this.query('INSERT INTO playlist (play_list, sound_point, sound_hash) VALUES (?, ?, ?)', [name, index, soundHash]);
    }
  }

  /**
   * playlistを削除する。
   *
   * @param {string} name playlist名。
   * @returns {Promise<void>} 削除完了時にresolveする。
   */
  async deletePlaylist(name) {
    await this.query('DELETE FROM playlist_data WHERE play_list = ?', [name]);
  }

  /**
   * アルバムを登録する。
   *
   * @param {AlbumDto} album 登録するアルバムDTO。
   * @returns {Promise<AlbumDto>} 登録したDTO。
   */
  async insertAlbum(album) {
    await this.query(
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

  /**
   * 音源のloudness_targetを更新する。
   *
   * @param {string} soundHash 更新対象の音源hash。
   * @param {number} loudnessTarget ffmpeg volumedetectのmean_volume値。
   * @returns {Promise<void>} 更新完了時にresolveする。
   */
  async updateLoudness(soundHash, loudnessTarget) {
    await this.query('UPDATE sound_link SET loudness_target = ? WHERE sound_hash = ?', [loudnessTarget, soundHash]);
  }

  /**
   * sound_linkの総件数を取得する。
   *
   * @returns {Promise<number>} 登録済み音源件数。
   */
  async countSounds() {
    const rows = await this.query('SELECT COUNT(*) AS count FROM sound_link');
    return Number(rows[0]?.count || rows[0]?.COUNTER || 0);
  }

  /**
   * artist件数を取得する。
   *
   * @returns {Promise<number>} artist件数。
   */
  async countArtists() {
    const rows = await this.query('SELECT COUNT(*) AS count FROM artist');
    return Number(rows[0]?.count || rows[0]?.COUNTER || 0);
  }

  /**
   * album件数を取得する。
   *
   * @returns {Promise<number>} album件数。
   */
  async countAlbums() {
    const rows = await this.query('SELECT COUNT(*) AS count FROM album');
    return Number(rows[0]?.count || rows[0]?.COUNTER || 0);
  }

  /**
   * loudness_target入力済み音源件数を取得する。
   *
   * @returns {Promise<number>} 解析済み音源件数。
   */
  async countAnalysisSounds() {
    const rows = await this.query('SELECT COUNT(*) AS count FROM sound_link WHERE loudness_target <> 0');
    return Number(rows[0]?.count || rows[0]?.COUNTER || 0);
  }

  /**
   * sound_link行配列をPHP API互換の表示DTOへ変換する。
   *
   * @param {Object[]} rows DBから取得したsound_link行。
   * @returns {Object[]} hash圧縮とalbumネストを適用したAPI DTO配列。
   */
  mapSoundRows(rows) {
    return rows.map((row) => mapSoundRecord(row));
  }

  /**
   * DBドライバの戻り値差を吸収してrows配列だけを返す。
   *
   * @param {string} sql 実行SQL。外部値は必ずparamsで渡す。
   * @param {unknown[]} [params=[]] placeholderに渡す値。
   * @returns {Promise<unknown[]>} SELECTでは行配列、更新系ではドライバ戻り値。
   */
  async query(sql, params = []) {
    const result = await this.db.query(sql, params);
    return Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
  }
}

/**
 * sound_link行をPHP API互換の表示DTOへ変換する。
 *
 * @param {Object} row sound_link行。
 * @returns {Object} API表示用sound DTO。
 */
function mapSoundRecord(row) {
  const record = mapHashFields(row);
  record.album = {
    album_hash: record.album_hash,
    album_title: record.album_title,
  };
  return record;
}

/**
 * DTO内の既知hash列をPHP互換圧縮hashへ変換する。
 *
 * @param {Object} row DB行。
 * @returns {Object} hash列を圧縮した浅いcopy。
 */
function mapHashFields(row) {
  return {
    ...row,
    add_time: normalizeDateTime(row.add_time),
    play_date: normalizeDateTime(row.play_date),
    sound_hash: compressNullableHash(row.sound_hash),
    album_hash: compressNullableHash(row.album_hash),
  };
}

/**
 * SHA1 hashをPHP `ComplessUtil::compless`互換表現へ変換する。
 *
 * @param {string|null|undefined} hash 40桁SHA1 hash。
 * @returns {string|null} 圧縮hash。空値はnull。
 */
function compressNullableHash(hash) {
  return hash ? compressHash(hash) : null;
}

/**
 * ファイル拡張子から音声MIMEを推定する。
 *
 * @param {string} filePath 音源ファイルパス。
 * @returns {string} audio MIME。
 */
function mimeFromPath(filePath) {
  const ext = String(filePath || '').split('.').pop().toLowerCase();
  const mimes = {
    wav: 'audio/wav',
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
    ape: 'audio/ape',
  };
  return mimes[ext] || 'audio/octet-stream';
}

/**
 * DB driverがDateで返した日時をPHP JSONと同じ`YYYY-MM-DD HH:mm:ss`へ戻す。
 *
 * @param {unknown} value DB日時値。
 * @returns {unknown} 整形済み日時、または元の値。
 */
function normalizeDateTime(value) {
  if (value instanceof Date) {
    return formatDateTime(value);
  }
  return value;
}

function formatDateTime(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

module.exports = { SoundRepository };
