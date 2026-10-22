import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
import {
  LAYOUT_BROWSER,
  LAYOUT_COLOR_SCHEME,
  selectViewports,
} from './tests/layout-regression-config.mjs';

const defaultPort = Number(process.env.FRONTEND_PORT || process.env.PORT || 8081);
const localUrl = process.env.SOUNDOWL_LAYOUT_LOCAL_URL || `http://127.0.0.1:${defaultPort}/#/`;
const localAddress = new URL(localUrl);
if (localAddress.protocol !== 'http:') {
  throw new Error('SOUNDOWL_LAYOUT_LOCAL_URL must use http.');
}

export default defineConfig({
  testDir: './tests',
  globalSetup: fileURLToPath(new URL('./tests/layout-global-setup.mjs', import.meta.url)),
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
  projects: selectViewports(process.env.SOUNDOWL_LAYOUT_VIEWPORT_FILTER).map((viewport) => ({
    name: viewport.name,
    use: { viewport: { width: viewport.width, height: viewport.height } },
  })),
});
