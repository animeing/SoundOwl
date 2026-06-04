import { SoundCatalogRepository } from './repositories/soundCatalogRepository.js';
import { ArtistRepository } from './repositories/artistRepository.js';
import { AlbumRepository } from './repositories/albumRepository.js';
import { PlaylistRepository } from './repositories/playlistRepository.js';
import { HistoryRepository } from './repositories/historyRepository.js';
import { MetricsRepository } from './repositories/metricsRepository.js';

/**
 * SoundOwl backend が利用するDB操作をまとめるfacade。
 * 個別SQLは用途別Repositoryへ分割し、handler/service層はこのfacadeを通してDBへアクセスする。
 * PHP互換APIの移行中も既存メソッド名を維持し、将来必要になれば用途別Repositoryを直接注入できるようにする。
 */
class SoundOwlRepository {
  /**
   * 用途別Repositoryを同じDB接続で初期化する。
   *
   * @param {{query(sql:string, params?:unknown[]): Promise<[unknown[], unknown]|unknown[]>}} db mysql2 PoolまたはConnection。
   */
  constructor(db) {
    this.soundCatalog = new SoundCatalogRepository(db);
    this.artist = new ArtistRepository(db);
    this.album = new AlbumRepository(db);
    this.playlist = new PlaylistRepository(db);
    this.history = new HistoryRepository(db);
    this.metrics = new MetricsRepository(db);
  }

  /**
   * sound_hashで音源を1件取得する。
   *
   * @param {string} soundHash 音源のSHA-1 hash。
   * @returns {Promise<Object|null>} sound_link行。存在しない場合はnull。
   */
  findSoundByHash(...args) { return this.soundCatalog.findSoundByHash(...args); }

  /**
   * data_linkで音源を1件取得する。
   *
   * @param {string} dataLink 音声ファイルパス。
   * @returns {Promise<Object|null>} sound_link行。存在しない場合はnull。
   */
  findSoundByPath(...args) { return this.soundCatalog.findSoundByPath(...args); }

  /**
   * 追加日時が新しい順に音源一覧を取得する。
   *
   * @param {number} [limit=100] 取得する最大件数。
   * @returns {Promise<Object[]>} API表示用sound DTO配列。
   */
  listSoundsByAddTime(...args) { return this.soundCatalog.listSoundsByAddTime(...args); }

  /**
   * 再生回数が多い順に音源一覧を取得する。
   *
   * @param {number} [limit=100] 取得する最大件数。
   * @returns {Promise<Object[]>} API表示用sound DTO配列。
   */
  listSoundsByPlayCount(...args) { return this.soundCatalog.listSoundsByPlayCount(...args); }

  /**
   * 音源詳細を取得し、配信用MIME情報を付与する。
   *
   * @param {string} soundHash 音源のSHA-1 hash。
   * @returns {Promise<Object|null>} API詳細DTO。存在しない場合はnull。
   */
  findSoundDetail(...args) { return this.soundCatalog.findSoundDetail(...args); }

  /**
   * artist/title/album_titleを対象に音源を検索する。
   *
   * @param {string} word 検索語。
   * @returns {Promise<Object[]>} API表示用sound DTO配列。
   */
  searchSounds(...args) { return this.soundCatalog.searchSounds(...args); }

  /**
   * 音源の再生回数を増やし、再生履歴を追加する。
   *
   * @param {string} soundHash 音源のSHA-1 hash。
   * @param {Date} playedAt 再生日時。
   * @returns {Promise<void>} 更新完了時にresolveする。
   */
  incrementPlayCount(...args) { return this.soundCatalog.incrementPlayCount(...args); }

  /**
   * 音源を登録または更新する。
   *
   * @param {Object} sound 保存するsound_link DTO。
   * @returns {Promise<{action:'inserted'|'updated', sound:Object}>} 登録または更新結果。
   */
  upsertSound(...args) { return this.soundCatalog.upsertSound(...args); }

  /**
   * album配下の音源をtrack_no順に取得する。
   *
   * @param {string} albumHash album_key。
   * @returns {Promise<Object[]>} API表示用sound DTO配列。
   */
  listAlbumSounds(...args) { return this.soundCatalog.listAlbumSounds(...args); }

  /**
   * artist配下の音源をtrack_no順に取得する。
   *
   * @param {string} artistHash artist_id。
   * @returns {Promise<Object[]>} API表示用sound DTO配列。
   */
  listArtistSounds(...args) { return this.soundCatalog.listArtistSounds(...args); }

  /**
   * 音源のloudness_targetを更新する。
   *
   * @param {string} soundHash 音源のSHA-1 hash。
   * @param {number} loudnessTarget ffmpeg解析で得た音量補正値。
   * @returns {Promise<void>} 更新完了時にresolveする。
   */
  updateLoudness(...args) { return this.soundCatalog.updateLoudness(...args); }

  /**
   * artist名でartistを1件取得する。
   *
   * @param {string} artistName artist名。
   * @returns {Promise<Object|null>} artist DTO。存在しない場合はnull。
   */
  findArtistByName(...args) { return this.artist.findArtistByName(...args); }

  /**
   * artist一覧を範囲指定で取得し、代表album情報を付与する。
   *
   * @param {number} start OFFSET。
   * @param {number} end LIMIT。
   * @returns {Promise<Object[]>} API表示用artist DTO配列。
   */
  listArtists(...args) { return this.artist.listArtists(...args); }

  /**
   * artistを登録する。
   *
   * @param {{artist_id:string, artist_name:string}} artist 登録するartist DTO。
   * @returns {Promise<Object>} 登録したartist DTO。
   */
  insertArtist(...args) { return this.artist.insertArtist(...args); }

  /**
   * album titleでalbum候補を取得する。
   *
   * @param {string} title album title。
   * @returns {Promise<Object[]>} 同名album候補配列。
   */
  findAlbumByTitle(...args) { return this.album.findAlbumByTitle(...args); }

  /**
   * album一覧を範囲指定で取得する。
   *
   * @param {number} start OFFSET。
   * @param {number} end LIMIT。
   * @returns {Promise<Object[]>} API表示用album DTO配列。
   */
  listAlbums(...args) { return this.album.listAlbums(...args); }

  /**
   * albumを配下音源の合計再生回数順で取得する。
   *
   * @param {number} [limit=100] 取得する最大件数。
   * @returns {Promise<Object[]>} `{title, albumKey}` DTO配列。
   */
  listAlbumsByPlayCount(...args) { return this.album.listAlbumsByPlayCount(...args); }

  /**
   * album_keyでalbumを1件取得する。
   *
   * @param {string} albumHash album_key。
   * @returns {Promise<Object|null>} album DTO。存在しない場合はnull。
   */
  findAlbumByHash(...args) { return this.album.findAlbumByHash(...args); }

  /**
   * albumを登録する。
   *
   * @param {Object} album 登録するalbum DTO。
   * @returns {Promise<Object>} 登録したalbum DTO。
   */
  insertAlbum(...args) { return this.album.insertAlbum(...args); }

  /**
   * playlist_dataを1件取得する。
   *
   * @param {string} playList playlist名。
   * @returns {Promise<Object|null>} playlist_data行。存在しない場合はnull。
   */
  findPlaylistData(...args) { return this.playlist.findPlaylistData(...args); }

  /**
   * playlist名一覧を更新日時の新しい順に取得する。
   *
   * @returns {Promise<Object[]>} playlist名DTO配列。
   */
  listPlaylistNames(...args) { return this.playlist.listPlaylistNames(...args); }

  /**
   * playlist内の音源をsound_point順に取得する。
   *
   * @param {string} name playlist名。
   * @returns {Promise<Object[]>} API表示用sound DTO配列。
   */
  listPlaylistSounds(...args) { return this.playlist.listPlaylistSounds(...args); }

  /**
   * playlistを作成する。
   *
   * @param {string} name playlist名。
   * @param {string[]} soundHashes playlistへ登録するsound_hash配列。
   * @returns {Promise<void>} 作成完了時にresolveする。
   */
  createPlaylist(...args) { return this.playlist.createPlaylist(...args); }

  /**
   * playlistを削除する。
   *
   * @param {string} name playlist名。
   * @returns {Promise<void>} 削除完了時にresolveする。
   */
  deletePlaylist(...args) { return this.playlist.deletePlaylist(...args); }

  /**
   * 再生履歴を範囲指定で取得する。
   *
   * @param {number} start OFFSET。
   * @param {number} end LIMIT。
   * @returns {Promise<Object[]>} API表示用履歴DTO配列。
   */
  listHistory(...args) { return this.history.listHistory(...args); }

  /**
   * 登録済み音源数を取得する。
   *
   * @returns {Promise<number>} sound_link件数。
   */
  countSounds(...args) { return this.metrics.countSounds(...args); }

  /**
   * 登録済みartist数を取得する。
   *
   * @returns {Promise<number>} artist件数。
   */
  countArtists(...args) { return this.metrics.countArtists(...args); }

  /**
   * 登録済みalbum数を取得する。
   *
   * @returns {Promise<number>} album件数。
   */
  countAlbums(...args) { return this.metrics.countAlbums(...args); }

  /**
   * loudness_targetが解析済みの音源数を取得する。
   *
   * @returns {Promise<number>} 音量解析済み音源件数。
   */
  countAnalysisSounds(...args) { return this.metrics.countAnalysisSounds(...args); }
}

export { SoundOwlRepository };
