const currentUrl = window.location.href.split('#')[0];
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || `${currentUrl}api/`;

export const BASE = {
  DOMAIN: '',
  SAVE_PATH: currentUrl,
  HOME: currentUrl,
  VUE_HOME: `${currentUrl}#/`,
  API: apiBaseUrl,
  WEBSOCKET: window.location.hostname
};