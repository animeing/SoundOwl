import { test, expect } from '@playwright/test';
import { DEFAULT_ACTUAL_BACKEND_URL, buildRouteUrl } from './layout-regression-config.mjs';
import { installSyntheticNetworkMocks } from './layout-synthetic-mocks.mjs';

test('a saved IR selected before audio initialization reports a visible load failure', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem('audioParam', JSON.stringify({
      volume: 0.5,
      loopMode: 0,
      loadGiveUpTime: 1000,
      equalizerGains: { left: [], right: [] },
      soundSculpt: false,
      audioLondnessNormalize: false,
      audioIREffect: 'missing.wav',
    }));
  });
  await installSyntheticNetworkMocks(page, DEFAULT_ACTUAL_BACKEND_URL);
  await installSyntheticNetworkMocks(page, testInfo.project.use.baseURL, { includeApi: false });

  await page.goto(buildRouteUrl(testInfo.project.use.baseURL, '/history_list'));
  const track = page.locator('#base button.audio-item').first();
  await expect(track).toBeVisible();
  await track.click();

  await expect(page.locator('sw-message-box p').filter({
    hasText: 'Failed to load saved impulse response.',
  })).toBeVisible({ timeout: 10000 });
});

