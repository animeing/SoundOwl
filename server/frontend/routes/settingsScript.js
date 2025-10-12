import { loadWebsocketSettings } from '../settings.js';

export function createSettingsScriptHandler(rootDir) {
  return function settingsScriptHandler(_req, res) {
    const settings = loadWebsocketSettings(rootDir);
    const script = buildSettingsScript(settings);

    res.type('application/javascript').send(script);
  };
}

function buildSettingsScript(settings) {
  const { retryCount, retryInterval } = settings;

  return `window.SoundOwlProperty = window.SoundOwlProperty || {};
window.SoundOwlProperty.WebSocket = {
  status: false,
  retryCount: ${retryCount},
  retryInterval: ${retryInterval}
};`;
}
