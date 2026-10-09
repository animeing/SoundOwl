const path = require('node:path');
const { defineConfig } = require('@playwright/test');
const {
  DEFAULT_ACTUAL_BACKEND_URL,
  LAYOUT_BROWSER,
  LAYOUT_COLOR_SCHEME,
  selectViewports,
} = require('./tests/layout-regression-config.cjs');

const defaultPort = Number(process.env.FRONTEND_PORT || process.env.PORT || 8081);
const localUrl = process.env.SOUNDOWL_LAYOUT_LOCAL_URL || `http://127.0.0.1:${defaultPort}/#/`;
const localAddress = new URL(localUrl);
if (localAddress.protocol !== 'http:') {
  throw new Error('SOUNDOWL_LAYOUT_LOCAL_URL must use http.');
}
const frontendPort = Number(localAddress.port || 80);
const frontendHost = localAddress.hostname.replace(/^\[|\]$/g, '');
const frontendConfigPath = process.env.SOUNDOWL_LAYOUT_FRONTEND_CONFIG_PATH
  || path.join(process.cwd(), 'test-results', 'layout-frontend-settings.json');

module.exports = defineConfig({
  testDir: './tests',
  outputDir: './test-results/playwright',
  timeout: 600000,
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: localUrl,
    browserName: LAYOUT_BROWSER,
    colorScheme: LAYOUT_COLOR_SCHEME,
    deviceScaleFactor: 1,
    locale: 'ja-JP',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
  },
  webServer: {
    command: `"${process.execPath}" "${path.join(__dirname, 'server.js')}"`,
    url: localUrl,
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      FRONTEND_HOST: frontendHost,
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
