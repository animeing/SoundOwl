import http from 'node:http';
import fs from 'node:fs';
import { URL } from 'node:url';
import express from 'express';

const ROUTES = [
  ['/api/site_status', 'siteStatus'],
  ['/api/lock_status', 'lockStatus'],
  ['/api/get_setting', 'getSetting'],
  ['/api/update_setting', 'updateSetting'],
  ['/api/setup_database_table', 'setupDatabaseTable'],
  ['/api/sound_addtime_list', 'soundAddtimeList'],
  ['/api/play_count_list', 'playCountList'],
  ['/api/sound_data', 'soundData'],
  ['/api/sound_search', 'soundSearch'],
  ['/api/sound_regist', 'soundRegist'],
  ['/api/action/sound_played', 'soundPlayed'],
  ['/api/artist_list', 'artistList'],
  ['/api/artist_sounds', 'artistSounds'],
  ['/api/album_list', 'albumList'],
  ['/api/album_sounds', 'albumSounds'],
  ['/api/album_count_list', 'albumCountList'],
  ['/api/history_range_list', 'historyRangeList'],
  ['/api/playlist_action', 'playlistAction'],
  ['/api/audio_pulse_data_list', 'audioPulseDataList'],
  ['/api/audio_pulse_data_upload', 'audioPulseDataUpload'],
  ['/api/audio_pulse_data_delete', 'audioPulseDataDelete'],
  ['/api/sound_equalizer_preset.json', 'soundEqualizerPreset'],
  ['/api//sound_equalizer_preset.json', 'soundEqualizerPreset'],
  ['/img/album_art', 'albumArt'],
  ['/img/playlist_art', 'playlistArt'],
  ['/img/fontisto', 'fontisto'],
  ['/fonts/fontisto.ttf', 'fontisto'],
  ['/img/placeholder-image.webp', 'placeholderImage'],
  ['/sound_create/sound', 'soundStream'],
];

/**
 * Express アプリを Node.js HTTP server として作成します。
 * @param {Record<string, Function>} handlers createApiHandlers が返す API handler マップ。
 * @param {{cors?:{allowOrigins?:string[]},bodyLimit?:string}} [options={}] CORS と body size limit の設定。
 * @returns {import('node:http').Server} Node.js HTTP server。
 */
function createHttpServer(handlers, options = {}) {
  return http.createServer(createHttpApp(handlers, options));
}

/**
 * 互換 API パスを Express に登録したアプリを作成します。
 * @param {Record<string, Function>} handlers createApiHandlers が返す API handler マップ。
 * @param {{cors?:{allowOrigins?:string[]},bodyLimit?:string}} [options={}] CORS と body size limit の設定。
 * @returns {import('express').Express} Express アプリ。
 */
function createHttpApp(handlers, options = {}) {
  const app = express();
  app.use(express.raw({ type: () => true, limit: options.bodyLimit || '100mb' }));
  app.options('*', async (req, res) => {
    await writeResponse(res, {
      status: 204,
      headers: corsHeaders(req, options.cors),
      body: null,
    });
  });
  for (const [path, handlerName] of ROUTES) {
    app.all(path, async (req, res) => {
      try {
        const request = await toApiRequest(req);
        const response = handlers[handlerName]
          ? await handlers[handlerName](request)
          : { status: 404, headers: { 'content-type': 'text/plain' }, body: 'not found' };
        await writeResponse(res, withCors(response, req, options.cors));
      } catch (error) {
        await writeResponse(res, errorResponse(error, req, options.cors));
      }
    });
  }
  app.use(async (req, res) => {
    await writeResponse(res, withCors(
      { status: 404, headers: { 'content-type': 'text/plain' }, body: 'not found' },
      req,
      options.cors,
    ));
  });
  app.use(async (error, req, res, _next) => {
    await writeResponse(res, errorResponse(error, req, options.cors));
  });
  return app;
}

/**
 * 例外を API error response DTO へ変換します。
 * @param {Error & {status?:number}} error handler または middleware から投げられた例外。
 * @param {import('node:http').IncomingMessage} req CORS 判定に使う HTTP request。
 * @param {{allowOrigins?:string[]}|undefined} cors CORS 許可 origin 設定。
 * @returns {{status:number,headers:Record<string,string|number>,body:{status:string,message:string}}} JSON error response DTO。
 */
function errorResponse(error, req, cors) {
  return {
    status: error.status || 500,
    headers: { 'content-type': 'application/json', ...corsHeaders(req, cors) },
    body: { status: 'error', message: error.message },
  };
}

/**
 * Express request を API handler が扱う request DTO へ変換します。
 * @param {import('express').Request & {body?:Buffer|string}} req Express request。
 * @returns {Promise<{method:string,path:string,query:Record<string,string>,headers:Record<string, unknown>,form:Record<string, unknown>,file:Record<string, unknown>|null,body:Record<string, unknown>}>} API handler 用 request DTO。
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
 * multipart/form-data body を file と fields へ分解します。
 * @param {string} rawBody binary string として読み込んだ multipart body。
 * @param {string} contentType boundary を含む Content-Type header。
 * @returns {Record<string, unknown>} field 名を key にした file DTO と fields。
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
 * API response DTO に CORS header を追加します。
 * @param {{status:number,headers:Record<string,string|number>,body:unknown}} response handler が返した response DTO。
 * @param {import('node:http').IncomingMessage} req Origin header を参照する HTTP request。
 * @param {{allowOrigins?:string[]}} [cors={}] CORS 許可 origin 設定。
 * @returns {{status:number,headers:Record<string,string|number>,body:unknown}} CORS header 追加後の response DTO。
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
 * request origin と許可設定から CORS header を作成します。
 * @param {import('node:http').IncomingMessage} req Origin header を参照する HTTP request。
 * @param {{allowOrigins?:string[]}} [cors={}] CORS 許可 origin 設定。
 * @returns {Record<string,string>} 許可できる場合は CORS header、許可できない場合は空 object。
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
 * response DTO を Node.js response に書き込みます。
 * @param {import('node:http').ServerResponse} res 書き込み先の HTTP response。
 * @param {{status:number,headers:Record<string,string|number>,body:unknown}} response handler が返した response DTO。
 * @returns {Promise<void>} 書き込み完了後に解決します。
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
 * ファイルを HTTP response へ stream 配信します。
 * @param {import('node:http').ServerResponse} res 書き込み先の HTTP response。
 * @param {string} filePath 配信するファイルパス。
 * @param {{start:number,end:number}|undefined} range 配信 byte 範囲。未指定の場合は全体を配信します。
 * @returns {Promise<void>} stream 完了後に解決します。
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
 * HTTP request body を文字列として読み込みます。
 * @param {import('node:http').IncomingMessage & {body?:Buffer|string}} req 読み込み対象の request。
 * @returns {Promise<string>} body 文字列。multipart の場合は binary string として返します。
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
 * application/x-www-form-urlencoded body を form object へ変換します。
 * @param {string} rawBody URL encoded body。
 * @returns {Record<string,string|string[]>} form key/value。key が [] で終わる場合や重複 key は配列化します。
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

/**
 * URL encoded form の key/value を decode します。
 * @param {string} value decode 対象の文字列。
 * @returns {string} + を空白に戻し decodeURIComponent した文字列。
 */
function decodeFormComponent(value) {
  return decodeURIComponent(value.replace(/\+/g, ' '));
}

/**
 * multipart header/body の binary string を UTF-8 文字列へ戻します。
 * @param {string} value binary string として扱う文字列。
 * @returns {string} UTF-8 として復元した文字列。
 */
function decodeMultipartText(value) {
  return Buffer.from(String(value), 'binary').toString('utf8');
}
/**
 * form object に key/value を追加します。
 * @param {Record<string,string|string[]>} form 追加先の form object。
 * @param {string} key form key。末尾 [] は配列指定として扱います。
 * @param {string} value 追加する form value。
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
