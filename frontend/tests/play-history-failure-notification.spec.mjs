import { test, expect } from '@playwright/test';
import { DEFAULT_ACTUAL_BACKEND_URL, buildRouteUrl } from './layout-regression-config.mjs';
import { installSyntheticNetworkMocks } from './layout-synthetic-mocks.mjs';

/** A short PCM WAV lets the browser reach the real track-ended notification path. */
function shortSilentWav() {
  const sampleRate = 8000;
  const sampleCount = 8000;
  const dataLength = sampleCount * 2;
  const wav = Buffer.alloc(44 + dataLength);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + dataLength, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(dataLength, 40);
  return wav;
}

test('failed play recording is visible after a track actually finishes', async ({ page }, testInfo) => {
  await installSyntheticNetworkMocks(page, DEFAULT_ACTUAL_BACKEND_URL);
  await installSyntheticNetworkMocks(page, testInfo.project.use.baseURL, { includeApi: false });

  const wav = shortSilentWav();
  await page.route((url) => url.pathname.startsWith('/sound_create/'), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'audio/wav',
      headers: { 'access-control-allow-origin': '*' },
      body: wav,
    });
  });
  let playRecordRequests = 0;
  await page.route((url) => url.pathname.endsWith('/api/action/sound_played.php'), async (route) => {
    playRecordRequests += 1;
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: '{"status":"error"}',
    });
  });

  await page.goto(buildRouteUrl(testInfo.project.use.baseURL, '/history_list'));
  const track = page.locator('#base button.audio-item').first();
  await expect(track).toBeVisible();
  await track.locator('.audio-title').click();

  const notice = page.locator('sw-message-box[role="alert"] p').filter({
    hasText: 'Could not confirm play history was saved.',
  });
  await expect(notice).toBeVisible({ timeout: 15000 });
  expect(playRecordRequests).toBe(1);
});
