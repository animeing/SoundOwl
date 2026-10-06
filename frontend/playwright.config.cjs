const path = require('node:path');
const { defineConfig } = require('@playwright/test');
const {
  DEFAULT_ACTUAL_BACKEND_URL,
  LAYOUT_COLOR_SCHEME,
  selectViewports,
} = require('./tests/layout-regression-config.cjs');

const frontendPort = Number(process.env.FRONTEND_PORT || process.env.PORT || 8081);
const localUrl = process.env.SOUNDOWL_LAYOUT_LOCAL_URL || `http://127.0.0.1:${frontendPort}/#/`;
const frontendConfigPath = process.env.SOUNDOWL_LAYOUT_FRONTEND_CONFIG_PATH
  || path.join(process.cwd(), 'test-results', 'layout-frontend-settings.json');

module.exports = defineConfig({
  testDir: './tests',
  outputDir: './test-results/playwright',
  timeout: 240000,
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: localUrl,
    browserName: 'chromium',
    colorScheme: LAYOUT_COLOR_SCHEME,
    deviceScaleFactor: 1,
    locale: 'ja-JP',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
  },
  webServer: {
    command: 'npm start',
    url: localUrl,
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      FRONTEND_HOST: '127.0.0.1',
      FRONTEND_PORT: String(frontendPort),
      FRONTEND_CONFIG_PATH: frontendConfigPath,
      FRONTEND_BACKEND_SERVER_DEFAULT: process.env.SOUNDOWL_LAYOUT_BACKEND_URL || DEFAULT_ACTUAL_BACKEND_URL,
    },
  },
  projects: selectViewports(process.env.SOUNDOWL_LAYOUT_VIEWPORT_FILTER).map((viewport) => ({
    name: viewport.name,
    use: { viewport: { width: viewport.width, height: viewport.height } },
  })),
});
