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

function createHttpServer(handlers, options = {}) {
  return http.createServer(createHttpApp(handlers, options));
}

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
    app.all(routePaths(path), async (req, res) => {
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

function routePaths(path) {
  if (path.includes('.')) {
    return path;
  }
  return [path, `${path}.php`];
}

function errorResponse(error, req, cors) {
  return {
    status: error.status || 500,
    headers: { 'content-type': 'application/json', ...corsHeaders(req, cors) },
    body: { status: 'error', message: error.message },
  };
}

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

function withCors(response, req, cors = {}) {
  return {
    ...response,
    headers: {
      ...response.headers,
      ...corsHeaders(req, cors),
    },
  };
}

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
    const fail = (error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    };
    const stream = fs.createReadStream(filePath, range ? { start: range.start, end: range.end } : {});
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

function decodeMultipartText(value) {
  return Buffer.from(String(value), 'binary').toString('utf8');
}

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
