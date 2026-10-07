const path = require('node:path');

const ROUTES = [
  { name: 'home', path: '/' },
  { name: 'album-list', path: '/album_list' },
  { name: 'artist-list', path: '/artist_list' },
  { name: 'history-list', path: '/history_list' },
  { name: 'album', path: '/album?AlbumHash=synthetic-album-01' },
  { name: 'artist', path: '/artist?ArtistHash=synthetic-artist-01' },
  { name: 'search', path: '/search?SearchWord=Synthetic' },
  { name: 'playlists', path: '/playlists' },
  { name: 'playlist-sounds', path: '/playlists/sounds?list=Layout%20Review%20Queue' },
  { name: 'setting-server', path: '/setting' },
  { name: 'setting-equalizer', path: '/setting/equalizer' },
  { name: 'setting-effect', path: '/setting/effect' },
  { name: 'sound-sculpt-debug', path: '/setting/soundSculptDebug' },
  { name: 'setup', path: '/setup' },
];

const LAYOUT_BROWSER = process.env.SOUNDOWL_LAYOUT_BROWSER || 'chromium';
if (!['chromium', 'firefox'].includes(LAYOUT_BROWSER)) {
  throw new Error(`Unsupported SOUNDOWL_LAYOUT_BROWSER: ${LAYOUT_BROWSER}`);
}

const VIEWPORTS = [
  { name: `${LAYOUT_BROWSER}-dark-1920x1080`, width: 1920, height: 1080 },
  { name: `${LAYOUT_BROWSER}-dark-768x1024`, width: 768, height: 1024 },
  { name: `${LAYOUT_BROWSER}-dark-390x844`, width: 390, height: 844 },
  { name: `${LAYOUT_BROWSER}-dark-320x667`, width: 320, height: 667 },
];

const LAYOUT_STATES = [
  { name: 'default' },
  { name: 'full-layout', action: 'full-layout' },
];

const EXCLUDED_ROUTE_NAMES = new Set(
  (process.env.SOUNDOWL_LAYOUT_EXCLUDE_ROUTES || '').split(',').map((name) => name.trim()).filter(Boolean),
);
for (const name of EXCLUDED_ROUTE_NAMES) {
  if (!ROUTES.some((route) => route.name === name)) {
    throw new Error(`Unknown SOUNDOWL_LAYOUT_EXCLUDE_ROUTES name: ${name}`);
  }
}

const DEFAULT_BASELINE_DIR = path.join(__dirname, 'layout-baselines');
const DEFAULT_ACTUAL_BACKEND_URL = 'http://soundowl-layout-baseline.local/';
const LAYOUT_COLOR_SCHEME = 'dark';

function selectRoutes(filter) {
  return ROUTES
    .filter((route) => !EXCLUDED_ROUTE_NAMES.has(route.name))
    .filter((route) => !filter || route.name.includes(filter) || route.path.includes(filter));
}

function selectViewports(filter) {
  return filter
    ? VIEWPORTS.filter((viewport) => viewport.name.includes(filter) || `${viewport.width}x${viewport.height}`.includes(filter))
    : VIEWPORTS;
}

function selectLayoutStates(filter) {
  return filter
    ? LAYOUT_STATES.filter((state) => state.name.includes(filter) || String(state.action || '').includes(filter))
    : LAYOUT_STATES;
}

function buildRouteUrl(root, routePath) {
  const url = new URL(root);
  if (!url.hash) {
    throw new Error('Layout root URL must include a hash route (#/).');
  }
  const trimmedRoute = routePath.replace(/^\/+/, '');
  const baseHash = url.hash.replace(/^#/, '').replace(/\/?$/, '/');
  url.hash = trimmedRoute ? `${baseHash}${trimmedRoute}` : baseHash;
  return url.href;
}

function buildBaselinePath(rootDir, viewportName, routeName, stateName) {
  return path.join(rootDir, safeName(viewportName), safeName(routeName), `${safeName(stateName)}.png`);
}

function safeName(value) {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'root';
}

module.exports = {
  DEFAULT_ACTUAL_BACKEND_URL,
  DEFAULT_BASELINE_DIR,
  LAYOUT_BROWSER,
  LAYOUT_COLOR_SCHEME,
  LAYOUT_STATES,
  ROUTES,
  VIEWPORTS,
  buildBaselinePath,
  buildRouteUrl,
  safeName,
  selectLayoutStates,
  selectRoutes,
  selectViewports,
};
