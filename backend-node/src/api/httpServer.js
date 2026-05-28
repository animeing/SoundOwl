const http = require('node:http');
const fs = require('node:fs');
const { URL } = require('node:url');

/**
 * Node標準httpでAPI serverを作成する。
 *
 * @param {Object.<string, Function>} handlers `createApiHandlers`の戻り値。
 * @returns {import('node:http').Server} HTTP server。
 */
function createHttpServer(handlers) {
  return http.createServer(async (req, res) => {
    try {
      const request = await toApiRequest(req);
      const response = await routeRequest(handlers, request);
      await writeResponse(res, response);
    } catch (error) {
      await writeResponse(res, {
        status: 500,
        headers: { 'content-type': 'application/json' },
        body: { status: 'error', message: error.message },
      });
    }
  });
}

/**
 * IncomingMessageをhandler向けrequest DTOへ変換する。
 *
 * @param {import('node:http').IncomingMessage} req HTTP request。
 * @returns {Promise<{method:string,path:string,query:Object,headers:Object,form:Object,body:Object}>} API request DTO。
 */
async function toApiRequest(req) {
  const url = new URL(req.url, 'http://localhost');
  const rawBody = await readBody(req);
  const contentType = req.headers['content-type'] || '';
  return {
    method: req.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
    headers: req.headers,
    form: contentType.includes('application/x-www-form-urlencoded') ? parseForm(rawBody) : {},
    file: contentType.includes('multipart/form-data') ? parseMultipart(rawBody, contentType).impulseResponse : null,
    body: contentType.includes('application/json') && rawBody ? JSON.parse(rawBody) : {},
  };
}

/**
 * 最小限のmultipart/form-data parser。
 *
 * 現行APIで必要な`impulseResponse`単一fileだけを抽出する。API adapter用の薄い実装であり、
 * 本格的な大容量uploadではストリーミングparserへの差し替えを想定する。
 *
 * @param {string} rawBody request body。
 * @param {string} contentType Content-Type header。
 * @returns {Object.<string,{filename:string,mime:string,buffer:Buffer}>} field名をkeyにしたfile object。
 */
function parseMultipart(rawBody, contentType) {
  const boundary = contentType.match(/boundary=([^;]+)/)?.[1];
  if (!boundary) {
    return {};
  }
  const files = {};
  const parts = rawBody.split(`--${boundary}`);
  for (const part of parts) {
    const [rawHeaders, ...bodyParts] = part.split(/\r?\n\r?\n/);
    if (!rawHeaders || bodyParts.length === 0) {
      continue;
    }
    const name = rawHeaders.match(/name="([^"]+)"/)?.[1];
    const filename = rawHeaders.match(/filename="([^"]+)"/)?.[1];
    if (!name || !filename) {
      continue;
    }
    const mime = rawHeaders.match(/Content-Type:\s*([^\r\n]+)/i)?.[1] || 'application/octet-stream';
    const content = bodyParts.join('\r\n\r\n').replace(/\r?\n--$/, '').replace(/\r?\n$/, '');
    files[name] = { filename, mime, buffer: Buffer.from(content, 'binary') };
  }
  return files;
}

/**
 * requestを該当handlerへ振り分ける。
 *
 * @param {Object.<string, Function>} handlers API handlers。
 * @param {Object} request API request DTO。
 * @returns {Promise<Object>} API response DTO。
 */
async function routeRequest(handlers, request) {
  const routes = {
    '/api/site_status.php': 'siteStatus',
    '/api/lock_status.php': 'lockStatus',
    '/api/get_setting.php': 'getSetting',
    '/api/update_setting.php': 'updateSetting',
    '/api/setup_database_table.php': 'setupDatabaseTable',
    '/api/sound_addtime_list.php': 'soundAddtimeList',
    '/api/play_count_list.php': 'playCountList',
    '/api/sound_data.php': 'soundData',
    '/api/sound_search.php': 'soundSearch',
    '/api/sound_regist.php': 'soundRegist',
    '/api/action/sound_played.php': 'soundPlayed',
    '/api/artist_list.php': 'artistList',
    '/api/artist_sounds.php': 'artistSounds',
    '/api/album_list.php': 'albumList',
    '/api/album_sounds.php': 'albumSounds',
    '/api/album_count_list.php': 'albumCountList',
    '/api/history_range_list.php': 'historyRangeList',
    '/api/playlist_action.php': 'playlistAction',
    '/api/audio_pulse_data_list.php': 'audioPulseDataList',
    '/api/audio_pulse_data_upload.php': 'audioPulseDataUpload',
    '/api/audio_pulse_data_delete.php': 'audioPulseDataDelete',
    '/api/sound_equalizer_preset.json': 'soundEqualizerPreset',
    '/api//sound_equalizer_preset.json': 'soundEqualizerPreset',
    '/img/album_art.php': 'albumArt',
    '/img/playlist_art.php': 'playlistArt',
    '/img/fontisto.php': 'fontisto',
    '/img/placeholder-image.webp': 'placeholderImage',
    '/sound_create/sound.php': 'soundStream',
  };
  const handlerName = routes[request.path];
  if (!handlerName || !handlers[handlerName]) {
    return { status: 404, headers: { 'content-type': 'text/plain' }, body: 'not found' };
  }
  return handlers[handlerName](request);
}

/**
 * response DTOをHTTP responseへ書き込む。
 *
 * @param {import('node:http').ServerResponse} res HTTP response。
 * @param {{status:number,headers:Object,body:unknown}} response API response DTO。
 * @returns {Promise<void>} 書き込み完了時にresolveする。
 */
async function writeResponse(res, response) {
  res.writeHead(response.status, response.headers);
  if (response.body === null || response.body === undefined) {
    res.end();
    return;
  }
  if (response.body && typeof response.body === 'object' && response.body.streamPath) {
    await streamFileResponse(res, response.body.streamPath, response.body.range);
    return;
  }
  if (Buffer.isBuffer(response.body) || typeof response.body === 'string') {
    res.end(response.body);
    return;
  }
  res.end(JSON.stringify(response.body));
}

/**
 * ファイルをHTTP responseへstreamする。
 *
 * @param {import('node:http').ServerResponse} res HTTP response。
 * @param {string} filePath stream対象ファイル。
 * @param {{start:number,end:number}|undefined} range byte range。
 * @returns {Promise<void>} stream完了時にresolveする。
 */
function streamFileResponse(res, filePath, range) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      const error = new Error(`File not found: ${filePath}`);
      if (!res.headersSent) {
        res.writeHead(500, { 'content-type': 'application/json' });
      }
      res.end(JSON.stringify({ status: 'error', message: error.message }));
      reject(error);
      return;
    }
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    /* c8 ignore next 6 */
    const fail = (error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    };
    const stream = fs.createReadStream(filePath, range ? { start: range.start, end: range.end } : {});
    /* c8 ignore next 7 */
    stream.on('error', (error) => {
      if (!res.headersSent) {
        res.writeHead(500, { 'content-type': 'application/json' });
      }
      res.end(JSON.stringify({ status: 'error', message: error.message }));
      fail(error);
    });
    res.on('finish', finish);
    stream.pipe(res);
  });
}

/**
 * request bodyを文字列として読む。
 *
 * @param {import('node:http').IncomingMessage} req HTTP request。
 * @returns {Promise<string>} body文字列。
 */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

/**
 * URL encoded formをobjectへ変換する。
 *
 * @param {string} rawBody request body。
 * @returns {Object} form object。同名keyは配列化する。
 */
function parseForm(rawBody) {
  const form = {};
  const params = new URLSearchParams(rawBody);
  for (const [key, value] of params.entries()) {
    const cleanKey = key.endsWith('[]') ? key.slice(0, -2) : key;
    if (Object.hasOwn(form, cleanKey)) {
      form[cleanKey] = Array.isArray(form[cleanKey]) ? [...form[cleanKey], value] : [form[cleanKey], value];
    } else {
      form[cleanKey] = key.endsWith('[]') ? [value] : value;
    }
  }
  return form;
}

module.exports = {
  createHttpServer,
  parseForm,
  parseMultipart,
  readBody,
  routeRequest,
  toApiRequest,
  writeResponse,
  streamFileResponse,
};
