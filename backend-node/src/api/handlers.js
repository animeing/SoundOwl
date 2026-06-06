import fs from 'node:fs/promises';
import path from 'node:path';
import { decompressHash } from '../utils/hash.js';

/**
 * @typedef {Object} ApiResponse
 * @property {number} status HTTP status。
 * @property {Object.<string,string|number>} headers HTTP headers。
 * @property {unknown} body JSON化する値、Buffer、文字列、またはnull。
 */

/**
 * API handler群を作成する。
 *
 * @param {Object} deps 依存オブジェクト。テストではVitest mockを注入する。
 * @returns {Object.<string, Function>} 各APIのhandler関数。
 */
function createApiHandlers(deps) {
  const {
    repository,
    settingsStore,
    schemaService,
    registrar,
    mediaService,
    pulseStore,
    fontPath,
    placeholderImagePath,
    equalizerPresetPath,
    soundDirectoryOverride,
  } = deps;

  return {
    async siteStatus() {
      return json(await statusPayload(repository, deps.lockService, true, settingsStore));
    },

    async lockStatus() {
      return json(await statusPayload(repository, deps.lockService, false, settingsStore));
    },

    async getSetting() {
      return json(await settingsStore.read());
    },

    async updateSetting({ form }) {
      await settingsStore.write(form);
      return text('');
    },

    async setupDatabaseTable() {
      await schemaService.create();
      return json({ status: 'success' });
    },

    async soundAddtimeList() {
      return json(await repository.listSoundsByAddTime());
    },

    async playCountList() {
      return json(await repository.listSoundsByPlayCount());
    },

    async soundData({ query }) {
      if (!query.SoundHash) {
        return json([]);
      }
      const hash = decompressHash(decodeURIComponent(query.SoundHash));
      return json(await repository.findSoundDetail(hash) || []);
    },

    async soundSearch({ form }) {
      if (!Object.hasOwn(form, 'SearchWord')) {
        return json([]);
      }
      return json(await repository.searchSounds(form.SearchWord));
    },

    async soundPlayed({ query }) {
      if (!query.SoundHash) {
        return json([]);
      }
      const hash = decompressHash(decodeURIComponent(query.SoundHash));
      await repository.incrementPlayCount(hash, new Date());
      return text('');
    },

    async soundRegist({ query }) {
      const release = deps.lockService?.beginStep1 ? deps.lockService.beginStep1() : () => {};
      try {
        if (query.soundhash) {
          return json(await registrar.refreshByHash(decompressHash(decodeURIComponent(query.soundhash))));
        }
        const settings = await settingsStore.read();
        const exclusions = normalizeExclusionPaths(settings.exclusionPaths);
        return json(await registrar.registerDirectory(soundDirectoryOverride || settings.sound_directory, exclusions));
      } finally {
        release();
      }
    },

    async artistList({ form }) {
      if (!hasRange(form)) {
        return json([]);
      }
      return json(await repository.listArtists(Number(form.start), Number(form.end)));
    },

    async artistSounds({ form }) {
      if (!form.ArtistHash) {
        return json([]);
      }
      return json(await repository.listArtistSounds(decompressHash(form.ArtistHash)));
    },

    async albumList({ form }) {
      if (!hasRange(form)) {
        return json([]);
      }
      return json(await repository.listAlbums(Number(form.start), Number(form.end)));
    },

    async albumSounds({ query }) {
      if (!query.AlbumHash) {
        return json([]);
      }
      return json(await repository.listAlbumSounds(decompressHash(decodeURIComponent(query.AlbumHash))));
    },

    async albumCountList() {
      return json(await repository.listAlbumsByPlayCount());
    },

    async historyRangeList({ body }) {
      if (!hasRange(body)) {
        return json([]);
      }
      return json(await repository.listHistory(Number(body.end), Number(body.start)));
    },

    async playlistAction({ form }) {
      switch (form.method) {
        case 'names':
          return json(await repository.listPlaylistNames());
        case 'sounds':
          if (!form.name) {
            return json({ status: 'error', detail: 'name is required.' }, 400);
          }
          return json(await repository.listPlaylistSounds(form.name));
        case 'create':
          if (!form.playlist_name || !Array.isArray(form.sounds) || form.sounds.length === 0) {
            return json({ status: 'error', detail: 'playlist_name and sounds are required.' }, 400);
          }
          await repository.createPlaylist(form.playlist_name, form.sounds.map((hash) => decompressHash(hash)));
          return json({ status: 'success', detail: 'playlist created.' });
        case 'delete':
          if (!form.name) {
            return json({ status: 'error', detail: 'name is required.' }, 400);
          }
          await repository.deletePlaylist(form.name);
          return text('');
        default:
          return json({ status: 'error', detail: 'method is required.' }, 400);
      }
    },

    async audioPulseDataList() {
      return json(await pulseStore.list());
    },

    async audioPulseDataUpload({ file }) {
      if (file) {
        return json(await pulseStore.upload(file));
      } else {
        return json({ status: 'error', message: 'file upload failed.' });
      }
    },

    async audioPulseDataDelete({ form }) {
      if (!form.preset) {
        return json({ status: 'error', message: 'preset is required.' });
      }
      return json(await pulseStore.delete(form.preset));
    },

    async soundEqualizerPreset() {
      return json(JSON.parse(await fs.readFile(equalizerPresetPath, 'utf8')));
    },

    async albumArt({ query }) {
      const result = await mediaService.getAlbumArt(query.media_hash ? decompressHash(decodeURIComponent(query.media_hash)) : null);
      return binary(result.body, result.mime, result.status, result.cacheLoad ? { 'X-Cache-Load': 'True' } : {});
    },

    async playlistArt({ query }) {
      const result = await mediaService.getPlaylistArt(query.playlist);
      return binary(result.body, result.mime, result.status);
    },

    async fontisto() {
      return binary(await fs.readFile(fontPath), 'font/ttf', 200);
    },

    async placeholderImage() {
      return binary(await fs.readFile(placeholderImagePath), 'image/webp', 200);
    },

    async soundStream({ query, headers }) {
      if (!query.media_hash) {
        return binary(null, 'text/plain', 404);
      }
      const hash = decompressHash(decodeURIComponent(query.media_hash));
      if (!/^[0-9a-f]{40}$/i.test(hash)) {
        throw new Error('Invalid media_hash.');
      }
      const result = await mediaService.prepareSoundStream(
        hash,
        headers.range,
      );
      if (result.status === 404) {
        return binary(null, 'text/plain', 404);
      }
      return { status: result.status, headers: result.headers, body: { streamPath: result.path, range: result.range } };
    },
  };
}

/**
 * site/lock status payloadを作成する。
 *
 * @param {Object} repository 件数取得DAO。
 * @param {Object} lockService lock状態取得service。
 * @param {boolean} includeCounts 件数を含めるか。
 * @param {{read:Function}} [settingsStore] WebSocket retry設定取得store。
 * @returns {Promise<Object>} PHP互換status payload。
 */
async function statusPayload(repository, lockService, includeCounts, settingsStore) {
  const lock = await lockService.status();
  const payload = {
    regist_status: lock.regist_status,
    regist_status_step1: lock.regist_status_step1,
    regist_status_step2: lock.regist_status_step2,
  };
  if (includeCounts) {
    payload.regist_data_count = {
      sound: await repository.countSounds(),
      artist: await repository.countArtists(),
      album: await repository.countAlbums(),
      analysis_sound: repository.countAnalysisSounds ? await repository.countAnalysisSounds() : 0,
    };
  }
  if (settingsStore) {
    const settings = await settingsStore.read();
    payload.websocket = {
      retry_count: Object.hasOwn(settings, 'websocket_retry_count') ? settings.websocket_retry_count : 0,
      retry_interval: Object.hasOwn(settings, 'websocket_retry_interval') ? settings.websocket_retry_interval : 10000,
    };
  }
  return payload;
}

/**
 * formにrange指定があるか判定する。
 *
 * @param {Object} form POST form。
 * @returns {boolean} start/endが数値ならtrue。
 */
function hasRange(form) {
  return Number.isFinite(Number(form.start))
    && Number.isFinite(Number(form.end))
    && Number(form.start) >= 0
    && Number(form.end) >= 0;
}

/**
 * 設定値の除外パスを登録処理用の配列へ正規化する。
 *
 * JSON化後の配列形式を正としつつ、旧設定の`|`区切り文字列も読み込み互換として扱う。
 *
 * @param {string|string[]|null|undefined} value 設定ファイルまたはFormData由来の除外パス。
 * @returns {string[]} 空行を取り除いた除外パス配列。
 */
function normalizeExclusionPaths(value) {
  const paths = Array.isArray(value) ? value : String(value || '').split(/[|\r\n]+/);
  return paths
    .filter((item) => item !== null && item !== undefined)
    .map((item) => String(item).trim())
    .filter(Boolean);
}

/**
 * JSON response DTOを作成する。
 *
 * @param {Record<string, any>|Array<any>|string|number|boolean|null} body JSON.stringify 可能なレスポンス本文。
 * @param {number} [status=200] HTTP status。
 * @returns {ApiResponse} response DTO。
 */
function json(body, status = 200) {
  return { status, headers: { 'content-type': 'application/json' }, body };
}

/**
 * text response DTOを作成する。
 *
 * @param {string} body text body。
 * @param {number} [status=200] HTTP status。
 * @returns {ApiResponse} response DTO。
 */
function text(body, status = 200) {
  return { status, headers: { 'content-type': 'text/plain' }, body };
}

/**
 * binary response DTOを作成する。
 *
 * @param {Buffer|null|unknown} body binary body。
 * @param {string} mime content-type。
 * @param {number} [status=200] HTTP status。
 * @param {Object.<string,string>} [headers={}] 追加header。
 * @returns {ApiResponse} response DTO。
 */
function binary(body, mime, status = 200, headers = {}) {
  const responseHeaders = { 'content-type': mime, ...headers };
  if (Buffer.isBuffer(body) || typeof body === 'string') {
    responseHeaders['content-length'] = Buffer.byteLength(body);
  }
  return { status, headers: responseHeaders, body };
}

export {
  binary,
  createApiHandlers,
  hasRange,
  json,
  normalizeExclusionPaths,
  statusPayload,
  text,
};
