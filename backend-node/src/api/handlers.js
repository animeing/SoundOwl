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
    failureStore,
    mediaService,
    pulseStore,
    fontPath,
    placeholderImagePath,
    equalizerPresetPath,
    soundDirectoryOverride,
    defaultSoundDirectory,
  } = deps;

  return {
    async siteStatus() {
      return json(await statusPayload(repository, deps.lockService, true, settingsStore));
    },

    async lockStatus() {
      return json(await statusPayload(repository, deps.lockService, false, settingsStore));
    },

    /**
     * 保存設定に、実際に走査する音楽ディレクトリと設定元を加えて返す。
     * @returns {Promise<ApiResponse>} 保存値と有効値を含む設定応答。
     */
    async getSetting() {
      const settings = await settingsStore.read();
      const resolvedSoundDirectory = resolveSoundDirectory(settings.sound_directory, soundDirectoryOverride, defaultSoundDirectory);
      return json({
        ...settings,
        effective_sound_directory: resolvedSoundDirectory.path,
        sound_directory_source: resolvedSoundDirectory.source,
      });
    },

    async updateSetting({ form }) {
      await settingsStore.write(form);
      return text('');
    },

    async setupDatabaseTable() {
      await schemaService.create();
      return json({ status: 'success' });
    },

    /** Return a bounded page of unresolved Step1/Step2 failures for Settings Detail. */
    async registrationFailures({ query }) {
      const requestedStep = query.step || 'all';
      const requestedLimit = query.limit === undefined ? 25 : Number(query.limit);
      const requestedOffset = query.offset === undefined ? 0 : Number(query.offset);
      if (!['all', 'step1', 'step2'].includes(requestedStep)
        || !Number.isSafeInteger(requestedLimit) || requestedLimit < 0 || requestedLimit > 50
        || !Number.isSafeInteger(requestedOffset) || requestedOffset < 0) {
        return json({ status: 'error', detail: 'Invalid failure list parameters.' }, 400);
      }
      try {
        return json(await failureStore.list({
          step: requestedStep === 'all' ? null : Number(requestedStep.slice(-1)),
          limit: requestedLimit,
          offset: requestedOffset,
        }));
      } catch (error) {
        console.error('Could not load registration failures:', error);
        return json({ status: 'error', detail: 'Could not load registration failures.' }, 503);
      }
    },

    /** Return sounds excluded from the Analysis count without labeling them as failures. */
    async unanalysedSounds({ query }) {
      const limit = query.limit === undefined ? 25 : Number(query.limit);
      const offset = query.offset === undefined ? 0 : Number(query.offset);
      if (!Number.isSafeInteger(limit) || limit < 0 || limit > 50
        || !Number.isSafeInteger(offset) || offset < 0) {
        return json({ status: 'error', detail: 'Invalid analysis list parameters.' }, 400);
      }
      try {
        return json(await repository.listSoundsWithoutAnalysis({ limit, offset }));
      } catch (error) {
        console.error('Could not load sounds without analysis:', error);
        return json({ status: 'error', detail: 'Could not load sounds without analysis.' }, 503);
      }
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

    /**
     * 曲の再生通知を記録する。存在しない曲は404とし、DBの書込み失敗はHTTP層へ伝える。
     * @param {{query:Record<string, string>}} request 圧縮済みSoundHashを含むリクエスト。
     * @returns {Promise<ApiResponse>} 成功時は空本文、曲がない場合は404。
     */
    async soundPlayed({ query }) {
      if (!query.SoundHash) {
        return json([]);
      }
      const hash = decompressHash(decodeURIComponent(query.SoundHash));
      try {
        await repository.incrementPlayCount(hash, new Date());
      } catch (error) {
        if (error.code === 'SOUND_NOT_FOUND') {
          return json({ status: 'error', detail: 'Sound not found.' }, 404);
        }
        throw error;
      }
      return text('');
    },

    /**
     * 保存値と環境変数から走査先を決め、安全でないパスでは登録を始めない。
     * @param {{query:Record<string,string>}} request 個別更新する曲の hash を指定できるリクエスト。
     * @returns {Promise<ApiResponse>} 登録数、または走査先不正時の400応答。
     */
    async soundRegist({ query }) {
      const release = deps.lockService?.beginStep1 ? deps.lockService.beginStep1() : () => {};
      try {
        if (query.soundhash) {
          const {
            count: registeredSoundCount,
            error: soundRefreshFailure,
          } = await registrar.refreshByHash(decompressHash(decodeURIComponent(query.soundhash)));
          if (soundRefreshFailure) {
            return json({
              status: 'error',
              count: registeredSoundCount,
              failure: soundRefreshFailure,
              detail: `Could not update ${soundRefreshFailure.target}: ${soundRefreshFailure.reason}`,
            }, soundRefreshFailure.code === 'SOUND_NOT_FOUND' ? 404 : 500);
          }
          return json({ count: registeredSoundCount });
        }
        const settings = await settingsStore.read();
        const exclusions = normalizeExclusionPaths(settings.exclusionPaths);
        const resolvedSoundDirectory = resolveSoundDirectory(settings.sound_directory, soundDirectoryOverride, defaultSoundDirectory);
        if (!resolvedSoundDirectory.path || !path.isAbsolute(resolvedSoundDirectory.path) || isFileSystemRoot(resolvedSoundDirectory.path)) {
          return json({
            status: 'error',
            detail: 'Set an absolute Sound Directory other than the filesystem root inside the backend container.',
          }, 400);
        }
        return json(await registrar.registerDirectory(resolvedSoundDirectory.path, exclusions));
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
      return json(await repository.listHistory(Number(body.start), Number(body.end)));
    },

    /**
     * プレイリスト操作のAPI応答を作り、作成時の既知のDB制約違反を利用者向けの結果へ変換する。
     * @param {{form:Record<string, unknown>}} request フォームのmethod、名前、曲hashを含むリクエスト。
     * @returns {Promise<ApiResponse>} 操作結果または理由を含むHTTP応答。
     */
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
            return json({ status: 'error', detail: 'Enter a playlist name and add at least one song.' }, 400);
          }
          try {
            await repository.createPlaylist(form.playlist_name, form.sounds.map((hash) => decompressHash(hash)));
          } catch (error) {
            // SQLの詳細は表示せず、利用者が対処できる制約違反だけ公開する。
            if (error.code === 'ER_DUP_ENTRY') {
              return json({ status: 'error', detail: 'This playlist name is already in use. Choose another name.' }, 409);
            }
            if (error.code === 'ER_NO_REFERENCED_ROW_2') {
              return json({ status: 'error', detail: 'A song is no longer available. Refresh the playlist and try again.' }, 422);
            }
            throw error;
          }
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

    /**
     * URL で指定された IR 音声の GET 応答を作ります。
     * 通常ファイルなら音声ストリームを返し、存在しない名前や不正な名前なら空の 404 を返します。
     * @param {{fileName:string}} request URL デコード後の IR ファイル名を含むリクエスト。
     * @returns {Promise<ApiResponse>} 音声または 404 の HTTP 応答。
     */
    async audioPulseFile({ fileName }) {
      const storedImpulseResponse = await pulseStore.read(fileName);
      // no-store: 同名 IR の上書きや、404 の後の新規アップロードを次の取得へ反映するため、応答を保存させません。
      // nosniff: ブラウザーの MIME 形式推測を抑え、指定した音声または 404 の Content-Type で扱わせます。
      const audioResponseHeaders = { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
      return storedImpulseResponse
        ? binary(
          { stream: storedImpulseResponse.audioStream },
          storedImpulseResponse.contentType,
          200,
          { ...audioResponseHeaders, 'content-length': storedImpulseResponse.byteLength },
        )
        : binary(null, 'text/plain', 404, audioResponseHeaders);
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
 * 環境変数、保存設定、既定値の順に実際の走査先とその出所を決める。
 * @param {string|undefined} savedDirectory 画面から保存したパス。
 * @param {string|null|undefined} overrideDirectory 環境変数で固定したパス。
 * @param {string|null|undefined} defaultDirectory 保存値が空のときの既定パス。
 * @returns {{path:string,source:'environment'|'settings'|'default'|'unconfigured'}} 有効なパスと設定元。
 */
function resolveSoundDirectory(savedDirectory, overrideDirectory, defaultDirectory) {
  const candidates = [
    { path: overrideDirectory, source: 'environment' },
    { path: savedDirectory, source: 'settings' },
    { path: defaultDirectory, source: 'default' },
  ];
  for (const candidate of candidates) {
    if (typeof candidate.path === 'string' && candidate.path.trim()) {
      return { path: candidate.path.trim(), source: candidate.source };
    }
  }
  return { path: '', source: 'unconfigured' };
}

/**
 * 音楽ディレクトリとして誤指定しやすいファイルシステムのルートか判定する。
 * @param {string} directory 走査候補の絶対パス。
 * @returns {boolean} ルート自体の場合はtrue。
 */
function isFileSystemRoot(directory) {
  const resolvedDirectory = path.resolve(directory);
  return resolvedDirectory === path.parse(resolvedDirectory).root;
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
