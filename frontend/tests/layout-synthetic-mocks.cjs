const BACKEND_HOSTNAME = 'soundowl-layout-baseline.local';
const DEFAULT_SYNTHETIC_BACKEND_URL = `http://${BACKEND_HOSTNAME}/`;
const TRACKS = Array.from({ length: 16 }, (_, index) => createTrack(index + 1));
const ALBUMS = Array.from({ length: 12 }, (_, index) => createAlbum(index + 1));
const ARTISTS = Array.from({ length: 12 }, (_, index) => createArtist(index + 1));
const PLAYLISTS = [
  { play_list: 'Layout Review Queue', sound_point: 8 },
  { play_list: 'Compact View Checks', sound_point: 6 },
  { play_list: 'Wide Screen Samples', sound_point: 10 },
  { play_list: 'Typography Stress Cases', sound_point: 5 },
];

async function installSyntheticNetworkMocks(page, backendUrl) {
  const backendOrigin = new URL(backendUrl).origin;
  await page.route(
    (url) => url.origin === backendOrigin && isSyntheticBackendPath(url.pathname),
    async (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders(), body: '' });
        return;
      }

      const url = new URL(request.url());
      if (url.pathname.startsWith('/api/')) {
        await fulfillJson(route, await responseForApi(url.pathname, request));
        return;
      }
      if (url.pathname.startsWith('/img/')) {
        await fulfillSvg(route, imageSvg(url.search || url.pathname));
        return;
      }
      if (url.pathname.startsWith('/sound_create/')) {
        await route.fulfill({ status: 204, headers: corsHeaders(), body: '' });
        return;
      }
      if (url.pathname.startsWith('/audio_pulse/')) {
        await route.fulfill({ status: 404, headers: corsHeaders(), body: '' });
      }
    },
  );
}

async function installSyntheticFrontendConfigMock(page, frontendUrl, backendUrl = DEFAULT_SYNTHETIC_BACKEND_URL) {
  const frontendOrigin = new URL(frontendUrl).origin;
  const normalizedBackendUrl = new URL(backendUrl).href;
  const configScript = `window.SoundOwlFrontendConfig = ${JSON.stringify({ backendServer: normalizedBackendUrl })};\n`;

  await page.addInitScript(configScript);
  await page.route(
    (url) => url.origin === frontendOrigin && url.pathname.endsWith('/front-config.js'),
    async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          ...corsHeaders(),
          'cache-control': 'no-store',
          'content-type': 'application/javascript; charset=utf-8',
        },
        body: configScript,
      });
    },
  );
}

function isSyntheticBackendPath(pathname) {
  return pathname.startsWith('/api/')
    || pathname.startsWith('/img/')
    || pathname.startsWith('/sound_create/')
    || pathname.startsWith('/audio_pulse/');
}

async function responseForApi(pathname, request) {
  switch (pathname.replace(/^\/api\/+/, '')) {
    case 'album_count_list.php':
      return ALBUMS.map((album, index) => ({ ...album, count: 100 - index }));
    case 'sound_addtime_list.php':
    case 'play_count_list.php':
      return TRACKS;
    case 'sound_search.php':
      return (await requestParameters(request)).has('SearchWord') ? TRACKS : [];
    case 'album_sounds.php':
      return hasNonEmptyParameter(await requestParameters(request), 'AlbumHash') ? TRACKS : [];
    case 'artist_sounds.php':
      return hasNonEmptyParameter(await requestParameters(request), 'ArtistHash') ? TRACKS : [];
    case 'history_range_list.php':
      return hasRange(await requestParameters(request)) ? TRACKS.map(flattenTrack) : [];
    case 'album_list.php':
      return hasRange(await requestParameters(request)) ? ALBUMS : [];
    case 'artist_list.php':
      return hasRange(await requestParameters(request)) ? ARTISTS : [];
    case 'playlist_action.php':
      return playlistResponse(request);
    case 'get_setting.php':
      return settingsResponse();
    case 'site_status.php':
      return { regist_status: false };
    case 'lock_status.php':
      return { lock: false };
    case 'sound_equalizer_preset.json':
      return equalizerPresets();
    case 'audio_pulse_data_list.php':
      return ['Synthetic Small Room.wav', 'Synthetic Bright Hall.wav', 'Synthetic Wide Plate.wav'];
    case 'audio_pulse_data_upload.php':
    case 'audio_pulse_data_delete.php':
      return { ok: true };
    case 'update_setting.php':
    case 'sound_regist.php':
    case 'setup_database_table.php':
    case 'action/sound_played.php':
      return { ok: true };
    case 'sound_data.php':
      return {
        ...TRACKS[0],
        lyrics: 'Synthetic lyric line one\nSynthetic lyric line two\nSynthetic lyric line three',
      };
    default:
      return { ok: true };
  }
}

async function playlistResponse(request) {
  const params = await requestParameters(request);
  if (params.get('method') === 'sounds') {
    return params.get('name') === PLAYLISTS[0].play_list
      ? TRACKS.slice(0, 8).map(flattenTrack)
      : [];
  }
  return PLAYLISTS;
}

async function requestParameters(request) {
  const params = new URL(request.url()).searchParams;
  if (request.method() === 'GET' || request.method() === 'HEAD') {
    return params;
  }

  const body = request.postDataBuffer();
  if (!body || body.length === 0) {
    return params;
  }

  const contentType = request.headers()['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    const formRequest = new Request(request.url(), {
      method: request.method(),
      headers: { 'content-type': contentType },
      body,
    });
    for (const [name, value] of await formRequest.formData()) {
      params.set(name, String(value));
    }
    return params;
  }

  if (contentType.includes('application/json')) {
    const values = JSON.parse(body.toString('utf8'));
    for (const [name, value] of Object.entries(values)) {
      params.set(name, String(value));
    }
    return params;
  }

  for (const [name, value] of new URLSearchParams(body.toString('utf8'))) {
    params.set(name, value);
  }
  return params;
}

function hasNonEmptyParameter(params, name) {
  return params.has(name) && params.get(name).trim() !== '';
}

function hasRange(params) {
  return ['start', 'end'].every((name) => params.has(name)
    && Number.isFinite(Number(params.get(name)))
    && Number(params.get(name)) >= 0);
}

function createTrack(index) {
  const album = createAlbum(((index - 1) % 6) + 1);
  return {
    sound_hash: `synthetic-sound-${pad(index)}`,
    title: `Synthetic Layout Track ${pad(index)} With Long Title Segment`,
    artist_name: `Synthetic Artist ${pad(((index - 1) % 5) + 1)}`,
    artist_id: `synthetic-artist-${pad(((index - 1) % 5) + 1)}`,
    album,
  };
}

function flattenTrack(track) {
  return {
    sound_hash: track.sound_hash,
    title: track.title,
    artist_name: track.artist_name,
    artist_id: track.artist_id,
    album_title: track.album.album_title,
    album_hash: track.album.album_hash,
  };
}

function createAlbum(index) {
  return {
    album_key: `synthetic-album-${pad(index)}`,
    album_hash: `synthetic-album-${pad(index)}`,
    title: `Synthetic Album ${pad(index)} Responsive Width Trial`,
    album_title: `Synthetic Album ${pad(index)} Responsive Width Trial`,
    artist: {
      artist_id: `synthetic-artist-${pad(((index - 1) % 5) + 1)}`,
      artist_name: `Synthetic Artist ${pad(((index - 1) % 5) + 1)}`,
    },
  };
}

function createArtist(index) {
  return {
    artist_id: `synthetic-artist-${pad(index)}`,
    artist_name: `Synthetic Artist ${pad(index)} Long Display Name`,
    album: createAlbum(index),
  };
}

function settingsResponse() {
  return {
    db_ip_address: '127.0.0.1',
    db_name: 'soundowl_layout_check',
    db_user: 'layout_user',
    db_pass: 'layout_password',
    sound_directory: '/synthetic/sound-library',
    exclusionPaths: 'Temporary Files|Ignore This Folder',
    websocket_retry_count: 2,
    websocket_retry_interval: 2500,
  };
}

function equalizerPresets() {
  return {
    'Synthetic Flat': createEqualizerGains([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    'Synthetic Bright': createEqualizerGains([2, 1.5, 1, 0.5, 0, 0, 0.5, 1, 1.5, 2]),
    'Synthetic Warm': createEqualizerGains([2, 1.5, 1, 0.5, 0, 0, -0.5, -1, -1.5, -2]),
  };
}

function createEqualizerGains(gains) {
  const frequencies = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  return frequencies.map((hz, index) => ({ hz, gain: gains[index] || 0 }));
}

async function fulfillJson(route, data) {
  await route.fulfill({
    status: 200,
    headers: {
      ...corsHeaders(),
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
    },
    body: `${JSON.stringify(data)}\n`,
  });
}

async function fulfillSvg(route, body) {
  await route.fulfill({
    status: 200,
    headers: {
      ...corsHeaders(),
      'cache-control': 'public, max-age=31536000',
      'content-type': 'image/svg+xml; charset=utf-8',
    },
    body,
  });
}

function imageSvg(seed) {
  const hash = hashNumber(seed);
  const hueA = hash % 360;
  const hueB = (hueA + 52) % 360;
  const label = String(seed).replace(/[^a-z0-9]+/gi, ' ').trim().slice(0, 18) || 'Synthetic';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="hsl(${hueA} 68% 46%)"/>
        <stop offset="1" stop-color="hsl(${hueB} 74% 58%)"/>
      </linearGradient>
    </defs>
    <rect width="512" height="512" fill="url(#g)"/>
    <circle cx="148" cy="150" r="78" fill="rgba(255,255,255,0.24)"/>
    <circle cx="360" cy="348" r="116" fill="rgba(0,0,0,0.18)"/>
    <path d="M96 354c66-82 126-104 180-66 44 31 83 27 140-20v148H96z" fill="rgba(255,255,255,0.32)"/>
    <text x="256" y="268" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="white">${escapeSvg(label)}</text>
  </svg>`;
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': '*',
  };
}

function hashNumber(value) {
  let hash = 0;
  for (const char of String(value)) {
    hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash);
}

function escapeSvg(value) {
  return value.replace(/[&<>"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  }[char]));
}

function pad(value) {
  return String(value).padStart(2, '0');
}

module.exports = {
  BACKEND_HOSTNAME,
  DEFAULT_SYNTHETIC_BACKEND_URL,
  installSyntheticFrontendConfigMock,
  installSyntheticNetworkMocks,
};
