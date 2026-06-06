import { SoundCatalogRepository } from './repositories/soundCatalogRepository.js';
import { ArtistRepository } from './repositories/artistRepository.js';
import { AlbumRepository } from './repositories/albumRepository.js';
import { PlaylistRepository } from './repositories/playlistRepository.js';
import { HistoryRepository } from './repositories/historyRepository.js';
import { MetricsRepository } from './repositories/metricsRepository.js';

/**
 * @typedef {Record<string, any>} SoundRow
 * sound_link 系の API 応答または登録処理で扱う楽曲レコードです。
 */

/**
 * 楽曲、アーティスト、アルバム、プレイリスト、履歴、集計の各 Repository を束ねる Facade です。
 * API 層や登録処理が複数 Repository の場所を意識しなくて済むように、用途単位のメソッド名で委譲します。
 */
class SoundOwlRepository {
  /**
   * DB クライアントを各 Repository に渡して Facade を初期化します。
   * @param {{query:(sql:string, params?:Array<any>)=>Promise<[Array<Record<string, any>>, any]>|Promise<Array<Record<string, any>>>}} db mysql2 互換の query 関数を持つ DB クライアント。
   */
  constructor(db) {
    this.soundCatalog = new SoundCatalogRepository(db);
    this.artist = new ArtistRepository(db);
    this.album = new AlbumRepository(db);
    this.playlist = new PlaylistRepository(db);
    this.history = new HistoryRepository(db);
    this.metrics = new MetricsRepository(db);
  }

  /** @param {string} soundHash 楽曲を一意に識別する sound_hash。 @returns {Promise<SoundRow|null>} 一致した楽曲行。存在しない場合は null。 */
  findSoundByHash(soundHash) { return this.soundCatalog.findSoundByHash(soundHash); }

  /** @param {string} dataLink 音声ファイルの保存パス。 @returns {Promise<SoundRow|null>} 一致した楽曲行。存在しない場合は null。 */
  findSoundByPath(dataLink) { return this.soundCatalog.findSoundByPath(dataLink); }

  /** @param {number} [limit=100] 取得する最大件数。 @returns {Promise<SoundRow[]>} 追加日時の新しい順に整形した楽曲一覧。 */
  listSoundsByAddTime(limit = 100) { return this.soundCatalog.listSoundsByAddTime(limit); }

  /** @param {number} [limit=100] 取得する最大件数。 @returns {Promise<SoundRow[]>} 再生回数の多い順に整形した楽曲一覧。 */
  listSoundsByPlayCount(limit = 100) { return this.soundCatalog.listSoundsByPlayCount(limit); }

  /** @param {string} soundHash 詳細を取得する sound_hash。 @returns {Promise<(SoundRow & {mime:string})|null>} API 応答用に整形した楽曲詳細。存在しない場合は null。 */
  findSoundDetail(soundHash) { return this.soundCatalog.findSoundDetail(soundHash); }

  /** @param {string} word 検索語。曲名、アーティスト名、アルバム名を部分一致検索します。 @returns {Promise<SoundRow[]>} 検索語に一致した楽曲一覧。 */
  searchSounds(word) { return this.soundCatalog.searchSounds(word); }

  /** @param {string} soundHash 再生済みにする sound_hash。 @param {Date} playedAt 再生日時。 @returns {Promise<void>} 再生回数と履歴を更新し、値は返しません。 */
  incrementPlayCount(soundHash, playedAt) { return this.soundCatalog.incrementPlayCount(soundHash, playedAt); }

  /** @param {SoundRow} sound 登録または更新する楽曲レコード。 @returns {Promise<{action:'inserted'|'updated',sound:SoundRow}>} 追加か更新かと保存後の楽曲情報。 */
  upsertSound(sound) { return this.soundCatalog.upsertSound(sound); }

  /** @param {string} albumHash アルバムを一意に識別する album_hash。 @returns {Promise<SoundRow[]>} アルバム内の楽曲一覧。 */
  listAlbumSounds(albumHash) { return this.soundCatalog.listAlbumSounds(albumHash); }

  /** @param {string} artistHash アーティストを一意に識別する artist_id。 @returns {Promise<SoundRow[]>} アーティストに紐づく楽曲一覧。 */
  listArtistSounds(artistHash) { return this.soundCatalog.listArtistSounds(artistHash); }

  /** @param {string} soundHash 音量解析結果を更新する sound_hash。 @param {number|string|null} loudnessTarget ffmpeg 解析で得た loudness_target。 @returns {Promise<void>} DB を更新し、値は返しません。 */
  updateLoudness(soundHash, loudnessTarget) { return this.soundCatalog.updateLoudness(soundHash, loudnessTarget); }

  /** @param {string} artistName アーティスト名。 @returns {Promise<Record<string, any>|null>} 一致した artist 行。存在しない場合は null。 */
  findArtistByName(artistName) { return this.artist.findArtistByName(artistName); }

  /** @param {number} start 取得開始位置。 @param {number} end 取得件数。 @returns {Promise<Array<{artist_id:string,artist_name:string,album:{album_key:string,title:string}}>>} アーティスト一覧と代表アルバム。 */
  listArtists(start, end) { return this.artist.listArtists(start, end); }

  /** @param {{artist_id:string,artist_name:string}} artist 登録するアーティスト。 @returns {Promise<{artist_id:string,artist_name:string}>} 登録したアーティスト。 */
  insertArtist(artist) { return this.artist.insertArtist(artist); }

  /** @param {string} title アルバムタイトル。 @returns {Promise<Array<Record<string, any>>>} タイトルが一致した album 行一覧。 */
  findAlbumByTitle(title) { return this.album.findAlbumByTitle(title); }

  /** @param {number} start 取得開始位置。 @param {number} end 取得件数。 @returns {Promise<Array<{album_key:string,title:string,artist:{artist_id:string,artist_name:string}}>>} アルバム一覧。 */
  listAlbums(start, end) { return this.album.listAlbums(start, end); }

  /** @param {number} [limit=100] 取得する最大件数。 @returns {Promise<Array<{title:string,albumKey:string}>>} 再生回数順のアルバム一覧。 */
  listAlbumsByPlayCount(limit = 100) { return this.album.listAlbumsByPlayCount(limit); }

  /** @param {string} albumHash アルバムを一意に識別する album_key。 @returns {Promise<Record<string, any>|null>} 一致した album 行。存在しない場合は null。 */
  findAlbumByHash(albumHash) { return this.album.findAlbumByHash(albumHash); }

  /** @param {Record<string, any>} album 登録するアルバム行。 @returns {Promise<Record<string, any>>} 登録したアルバム行。 */
  insertAlbum(album) { return this.album.insertAlbum(album); }

  /** @param {string} playList プレイリスト名。 @returns {Promise<Record<string, any>|null>} playlist_data の行。存在しない場合は null。 */
  findPlaylistData(playList) { return this.playlist.findPlaylistData(playList); }

  /** @returns {Promise<Array<{play_list:string}>>} 更新日時の新しい順に並んだプレイリスト名一覧。 */
  listPlaylistNames() { return this.playlist.listPlaylistNames(); }

  /** @param {string} name プレイリスト名。 @returns {Promise<Array<Record<string, any>>>} 指定プレイリストに含まれる楽曲一覧。 */
  listPlaylistSounds(name) { return this.playlist.listPlaylistSounds(name); }

  /** @param {string} name 作成するプレイリスト名。 @param {string[]} soundHashes 並び順どおりの sound_hash 配列。 @returns {Promise<void>} playlist_data と playlist を登録し、値は返しません。 */
  createPlaylist(name, soundHashes) { return this.playlist.createPlaylist(name, soundHashes); }

  /** @param {string} name 削除するプレイリスト名。 @returns {Promise<void>} playlist_data を削除し、値は返しません。 */
  deletePlaylist(name) { return this.playlist.deletePlaylist(name); }

  /** @param {number} start 取得開始位置。 @param {number} end 取得件数。 @returns {Promise<Array<Record<string, any>>>} 再生履歴一覧。 */
  listHistory(start, end) { return this.history.listHistory(start, end); }

  /** @returns {Promise<number>} 登録済み楽曲数。 */
  countSounds() { return this.metrics.countSounds(); }

  /** @returns {Promise<number>} 登録済みアーティスト数。 */
  countArtists() { return this.metrics.countArtists(); }

  /** @returns {Promise<number>} 登録済みアルバム数。 */
  countAlbums() { return this.metrics.countAlbums(); }

  /** @returns {Promise<number>} 音量解析済み楽曲数。 */
  countAnalysisSounds() { return this.metrics.countAnalysisSounds(); }
}

export { SoundOwlRepository };
