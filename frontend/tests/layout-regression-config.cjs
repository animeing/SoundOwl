const path = require('node:path');

const ROUTES = [
  { name: 'home', path: '/' },
  { name: 'album-list', path: '/album_list' },
  { name: 'artist-list', path: '/artist_list' },
  { name: 'history-list', path: '/history_list' },
  { name: 'album', path: '/album' },
  { name: 'artist', path: '/artist' },
  { name: 'search', path: '/search' },
  { name: 'playlists', path: '/playlists' },
  { name: 'playlist-sounds', path: '/playlists/sounds' },
  { name: 'setting-server', path: '/setting' },
  { name: 'setting-equalizer', path: '/setting/equalizer' },
  { name: 'setting-effect', path: '/setting/effect' },
  { name: 'sound-sculpt-debug', path: '/setting/soundSculptDebug' },
  { name: 'setup', path: '/setup' },
];

const VIEWPORTS = [
  { name: 'chromium-dark-1920x1080', width: 1920, height: 1080 },
  { name: 'chromium-dark-768x1024', width: 768, height: 1024 },
  { name: 'chromium-dark-390x844', width: 390, height: 844 },
  { name: 'chromium-dark-320x667', width: 320, height: 667 },
];

const LAYOUT_STATES = [
  { name: 'default' },
  { name: 'full-layout', action: 'full-layout' },
];

const DEFAULT_BASELINE_DIR = path.join(__dirname, 'layout-baselines');
const DEFAULT_ACTUAL_BACKEND_URL = 'http://soundowl-layout-baseline.local/';
const LAYOUT_COLOR_SCHEME = 'dark';

function selectRoutes(filter) {
  return filter
    ? ROUTES.filter((route) => route.name.includes(filter) || route.path.includes(filter))
    : ROUTES;
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
  const trimmedRoute = routePath.replace(/^\/+/, '');
  if (url.hash) {
    const baseHash = url.hash.replace(/^#/, '').replace(/\/?$/, '/');
    url.hash = trimmedRoute ? `${baseHash}${trimmedRoute}` : baseHash;
    return url.href;
  }
  const basePath = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
  url.pathname = `${basePath}${trimmedRoute}`.replace(/\/{2,}/g, '/');
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
