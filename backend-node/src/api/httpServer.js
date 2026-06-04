import http from 'node:http';
import fs from 'node:fs';
import { URL } from 'node:url';
import express from 'express';

const ROUTES = {
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
  '/fonts/fontisto.ttf': 'fontisto',
  '/img/placeholder-image.webp': 'placeholderImage',
  '/sound_create/sound.php': 'soundStream',
};

/**
 * Express applicationを内包したNode HTTP serverを作成する。
 *
 * @param {Object.<string, Function>} handlers `createApiHandlers`が返すAPI handler群。
 * @param {{cors?:{allowOrigins?:string[]},bodyLimit?:string}} [options={}] HTTP adapter設定。
 * @returns {import('node:http').Server} `listen`/`close`できるHTTP server。
 */
function createHttpServer(handlers, options = {}) {
  return http.createServer(createHttpApp(handlers, options));
}

/**
 * PHP互換APIを受けるExpress applicationを構築する。
 * handler層のDTO契約は維持し、HTTP受信、body受信、error pathだけをExpressへ委譲する。
 *
 * @param {Object.<string, Function>} handlers `createApiHandlers`が返すAPI handler群。
 * @param {{cors?:{allowOrigins?:string[]},bodyLimit?:string}} [options={}] HTTP adapter設定。
 * @returns {import('express').Express} Node HTTP serverへ渡せるExpress application。
 */
function createHttpApp(handlers, options = {}) {
  const app = express();
  app.use(express.raw({ type: () => true, limit: options.bodyLimit || '100mb' }));
  app.use(async (req, res) => {
    try {
      if (req.method === 'OPTIONS') {
        await writeResponse(res, {
          status: 204,
          headers: corsHeaders(req, options.cors),
          body: null,
        });
        return;
      }
      const request = await toApiRequest(req);
      const handlerName = ROUTES[request.path];
      const response = handlerName && handlers[handlerName]
        ? await handlers[handlerName](request)
        : { status: 404, headers: { 'content-type': 'text/plain' }, body: 'not found' };
      await writeResponse(res, withCors(response, req, options.cors));
    } catch (error) {
      await writeResponse(res, errorResponse(error, req, options.cors));
    }
  });
  app.use(async (error, req, res, _next) => {
    await writeResponse(res, errorResponse(error, req, options.cors));
  });
  return app;
}

/**
 * Express/handler例外をAPI互換のJSON error responseへ変換する。
 *
 * @param {Error} error 発生した例外。
 * @param {import('node:http').IncomingMessage} req HTTP request。
 * @param {{allowOrigins?:string[]}} cors CORS設定。
 * @returns {{status:number,headers:Object,body:Object}} error response DTO。
 */
function errorResponse(error, req, cors) {
  return {
    status: error.status || 500,
    headers: { 'content-type': 'application/json', ...corsHeaders(req, cors) },
    body: { status: 'error', message: error.message },
  };
}

/**
 * Express/NodeのHTTP requestをhandler層が扱うrequest DTOへ変換する。
 *
 * @param {import('node:http').IncomingMessage & {body?:Buffer|string}} req HTTP request。
 * @returns {Promise<{method:string,path:string,query:Object,headers:Object,form:Object,file:Object|null,body:Object}>} API request DTO。
 */
async function toApiRequest(req) {
  const url = new URL(req.url, 'http://localhost');
  const rawBody = await readBody(req);
  const contentType = req.headers['content-type'] || '';
  const multipart = contentType.includes('multipart/form-data') ? parseMultipart(rawBody, contentType) : {};
  return {
    method: req.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
    headers: req.headers,
    form: contentType.includes('application/x-www-form-urlencoded') ? parseForm(rawBody) : multipart.fields || {},
    file: multipart.impulseResponse || null,
    body: contentType.includes('application/json') && rawBody ? JSON.parse(rawBody) : {},
  };
}

/**
 * PHP互換APIで必要な最小限のmultipart/form-dataを解析する。
 * 通常fieldは`fields`へ、ファイルfieldはfield名をkeyにしたfile DTOへ格納する。
 * 現状のファイルアップロード用途は`impulseResponse`単一fileを想定している。
 *
 * @param {string} rawBody request body。
 * @param {string} contentType Content-Type header。
 * @returns {Object.<string,{filename:string,mime:string,buffer:Buffer}> & {fields?:Object}} multipart解析結果。
 */
function parseMultipart(rawBody, contentType) {
  const boundary = contentType.match(/boundary=([^;]+)/)?.[1];
  if (!boundary) {
    return {};
  }
  const fields = {};
  const files = {};
  const parts = rawBody.split(`--${boundary}`);
  for (const part of parts) {
    const [rawHeaders, ...bodyParts] = part.split(/\r?\n\r?\n/);
    if (!rawHeaders || bodyParts.length === 0) {
      continue;
    }
    const name = decodeMultipartText(rawHeaders.match(/name="([^"]+)"/)?.[1] || '');
    const filename = decodeMultipartText(rawHeaders.match(/filename="([^"]+)"/)?.[1] || '');
    if (!name) {
      continue;
    }
    const content = bodyParts.join('\r\n\r\n').replace(/\r?\n--$/, '').replace(/\r?\n$/, '');
    if (!filename) {
      appendFormValue(fields, name, decodeMultipartText(content));
      continue;
    }
    const mime = rawHeaders.match(/Content-Type:\s*([^\r\n]+)/i)?.[1] || 'application/octet-stream';
    files[name] = { filename, mime, buffer: Buffer.from(content, 'binary') };
  }
  return Object.keys(fields).length > 0 ? { ...files, fields } : files;
}

/**
 * API response DTOへCORS headerを付与する。
 *
 * @param {{status:number,headers:Object,body:unknown}} response API response DTO。
 * @param {import('node:http').IncomingMessage} req HTTP request。
 * @param {{allowOrigins?:string[]}} [cors={}] CORS設定。
 * @returns {{status:number,headers:Object,body:unknown}} CORS headerを含むAPI response DTO。
 */
function withCors(response, req, cors = {}) {
  return {
    ...response,
    headers: {
      ...response.headers,
      ...corsHeaders(req, cors),
    },
  };
}

/**
 * FrontServerからBackendServerへアクセスするためのCORS headerを作成する。
 *
 * @param {import('node:http').IncomingMessage} req HTTP request。
 * @param {{allowOrigins?:string[]}} [cors={}] 許可Origin設定。`*`の場合はrequest Originを反映する。
 * @returns {Object.<string,string>} 許可できる場合はCORS headers、許可できない場合は空object。
 */
function corsHeaders(req, cors = {}) {
  const origin = req.headers.origin || '';
  const allowOrigins = cors.allowOrigins || ['*'];
  const allowsAny = allowOrigins.includes('*');
  const allowedOrigin = allowsAny ? (origin || '*') : allowOrigins.find((item) => item === origin);
  if (!allowedOrigin) {
    return {};
  }
  return {
    'access-control-allow-origin': allowedOrigin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': req.headers['access-control-request-headers'] || 'content-type,range',
    'access-control-expose-headers': 'content-length,content-range,accept-ranges,x-cache-load',
    vary: 'Origin',
  };
}

/**
 * API response DTOをHTTP responseへ書き込む。
 * Buffer/string/object/nullと、音声stream用の`streamPath` DTOを扱う。
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
 * Range指定がある場合は指定byte範囲のみを送信する。
 *
 * @param {import('node:http').ServerResponse} res HTTP response。
 * @param {string} filePath stream対象のファイルパス。
 * @param {{start:number,end:number}|undefined} range byte range。未指定の場合は全体を送信する。
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
 * request bodyを文字列として読み込む。
 * Express raw middlewareで設定されたBuffer bodyと、素のIncomingMessage streamの両方を扱う。
 *
 * @param {import('node:http').IncomingMessage & {body?:Buffer|string}} req HTTP request。
 * @returns {Promise<string>} request body文字列。
 */
function readBody(req) {
  if (Buffer.isBuffer(req.body)) {
    const contentType = req.headers['content-type'] || '';
    const encoding = contentType.includes('multipart/form-data') ? 'binary' : 'utf8';
    return Promise.resolve(req.body.toString(encoding));
  }
  if (typeof req.body === 'string') {
    return Promise.resolve(req.body);
  }
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
 * application/x-www-form-urlencoded bodyをform objectへ変換する。
 * 同一keyや`name[]`形式はPHPの`$_POST`に近い配列へ変換する。
 *
 * @param {string} rawBody request body。
 * @returns {Object} form object。
 */
function parseForm(rawBody) {
  const form = {};
  const body = String(rawBody);
  if (body.length === 0) {
    return form;
  }
  const pairs = body.split('&');
  let index = 0;
  while (index < pairs.length) {
    const pair = pairs[index];
    const separatorIndex = pair.indexOf('=');
    if (separatorIndex === -1) {
      appendFormValue(form, decodeFormComponent(pair), '');
    } else {
      const key = pair.slice(0, separatorIndex);
      const value = pair.slice(separatorIndex + 1);
      appendFormValue(form, decodeFormComponent(key), decodeFormComponent(value));
    }
    index += 1;
  }
  return form;
}

function decodeFormComponent(value) {
  return decodeURIComponent(value.replace(/\+/g, ' '));
}

/**
 * multipart/form-dataをbinary文字列として読んだ値をUTF-8文字列へ戻す。
 *
 * FormDataの通常field名、filename、field値はブラウザからUTF-8で届くため、
 * binary文字列のまま扱うと日本語が文字化けする。
 *
 * @param {string} value multipartから切り出したbinary文字列。
 * @returns {string} UTF-8として復元した文字列。
 */
function decodeMultipartText(value) {
  return Buffer.from(String(value), 'binary').toString('utf8');
}
/**
 * PHPの`$_POST`に近い形でform値を追加する。
 * 同一keyや`sounds[]`のような配列keyは配列として保持する。
 *
 * @param {Object} form 更新対象のform DTO。
 * @param {string} key 入力field名。
 * @param {string} value 入力field値。
 * @returns {void}
 */
function appendFormValue(form, key, value) {
  let cleanKey = key;
  if (key.endsWith('[]')) {
    cleanKey = key.slice(0, -2);
  }
  if (Object.hasOwn(form, cleanKey)) {
    form[cleanKey] = Array.isArray(form[cleanKey]) ? [...form[cleanKey], value] : [form[cleanKey], value];
  } else {
    form[cleanKey] = key.endsWith('[]') ? [value] : value;
  }
}

export {
  createHttpApp,
  createHttpServer,
  appendFormValue,
  corsHeaders,
  decodeMultipartText,
  errorResponse,
  parseForm,
  parseMultipart,
  readBody,
  ROUTES,
  toApiRequest,
  writeResponse,
  withCors,
  streamFileResponse,
};
