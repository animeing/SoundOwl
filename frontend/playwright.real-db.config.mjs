import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));
const frontendUrl = 'http://127.0.0.1:18080/';
const backendUrl = 'http://127.0.0.1:3000/';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/playlist-real-db.e2e.mjs',
  outputDir: './test-results/playlist-real-db',
  timeout: 60000,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `${frontendUrl}#/`,
    browserName: 'chromium',
    colorScheme: 'dark',
    locale: 'ja-JP',
    viewport: { width: 390, height: 844 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node server.js',
    cwd: frontendRoot,
    url: `${frontendUrl}front-config.js`,
    timeout: 30000,
    reuseExistingServer: false,
    env: {
      FRONTEND_HOST: '127.0.0.1',
      FRONTEND_PORT: '18080',
      FRONTEND_CONFIG_PATH: path.join(frontendRoot, 'test-results', 'playlist-real-db-settings.json'),
      FRONTEND_BACKEND_SERVER_DEFAULT: backendUrl,
      FRONTEND_WEBSOCKET_SERVER_DEFAULT: 'ws://127.0.0.1:8080',
    },
  },
});
