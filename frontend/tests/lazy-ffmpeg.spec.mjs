import { test, expect } from '@playwright/test';
import { DEFAULT_ACTUAL_BACKEND_URL, buildRouteUrl } from './layout-regression-config.mjs';
import { installSyntheticNetworkMocks } from './layout-synthetic-mocks.mjs';

/** Create a playable one-second WAV so the real browser can finish a track. */
function playableWav() {
  const samples = 8000;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(samples * 2, 40);
  return wav;
}

/** AIFF is valid PCM audio but needs FFmpeg in browsers without native AIFF support. */
function playableAiff() {
  const samples = 8000;
  const aiff = Buffer.alloc(54 + samples * 2);
  aiff.write('FORM', 0);
  aiff.writeUInt32BE(aiff.length - 8, 4);
  aiff.write('AIFFCOMM', 8);
  aiff.writeUInt32BE(18, 16);
  aiff.writeUInt16BE(1, 20);
  aiff.writeUInt32BE(samples, 22);
  aiff.writeUInt16BE(16, 26);
  Buffer.from([0x40, 0x0b, 0xfa, 0, 0, 0, 0, 0, 0, 0]).copy(aiff, 28);
  aiff.write('SSND', 38);
  aiff.writeUInt32BE(8 + samples * 2, 42);
  return aiff;
}

async function openHistory(page, testInfo) {
  await page.goto(buildRouteUrl(testInfo.project.use.baseURL, '/history_list'));
  const track = page.locator('#base button.audio-item').first();
  await expect(track).toBeVisible();
  return track;
}

test('native WAV playback finishes without requesting FFmpeg assets', async ({ page }, testInfo) => {
  await installSyntheticNetworkMocks(page, DEFAULT_ACTUAL_BACKEND_URL);
  await installSyntheticNetworkMocks(page, testInfo.project.use.baseURL, { includeApi: false });
  const ffmpegRequests = [];
  page.on('request', request => {
    if (/\/js\/ffmpeg-core\.(js|wasm)(?:\?|$)/.test(request.url())) ffmpegRequests.push(request.url());
  });
  await page.route(url => url.pathname.startsWith('/sound_create/'), async route => {
    await route.fulfill({ status: 200, contentType: 'audio/wav',
      headers: { 'access-control-allow-origin': '*' }, body: playableWav() });
  });
  let playRecordRequests = 0;
  await page.route(url => url.pathname.endsWith('/api/action/sound_played.php'), async route => {
    playRecordRequests += 1;
    await route.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' }, body: '{"status":"success"}' });
  });
  const track = await openHistory(page, testInfo);
  await track.locator('.audio-title').click();
  await expect.poll(() => playRecordRequests, { timeout: 15000 }).toBe(1);
  expect(ffmpegRequests).toEqual([]);
});

test('first unsupported AIFF track loads FFmpeg and completes playback', async ({ page }, testInfo) => {
  await installSyntheticNetworkMocks(page, DEFAULT_ACTUAL_BACKEND_URL);
  await installSyntheticNetworkMocks(page, testInfo.project.use.baseURL, { includeApi: false });
  const assetRequests = [];
  page.on('request', request => {
    if (/\/js\/ffmpeg-core\.(js|wasm)(?:\?|$)/.test(request.url())) assetRequests.push(request.url());
  });
  await page.route(url => url.pathname.startsWith('/sound_create/'), async route => {
    await route.fulfill({ status: 200, contentType: 'audio/aiff',
      headers: { 'access-control-allow-origin': '*' }, body: playableAiff() });
  });
  let playRecordRequests = 0;
  await page.route(url => url.pathname.endsWith('/api/action/sound_played.php'), async route => {
    playRecordRequests += 1;
    await route.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' }, body: '{"status":"success"}' });
  });
  const track = await openHistory(page, testInfo);
  await track.locator('.audio-title').click();
  await expect.poll(() => playRecordRequests, { timeout: 60000 }).toBe(1);
  expect(assetRequests.some(url => url.includes('ffmpeg-core.js'))).toBe(true);
  expect(assetRequests.some(url => url.includes('ffmpeg-core.wasm'))).toBe(true);
});

test('source fetch failure shows an error without loading FFmpeg assets', async ({ page }, testInfo) => {
  await installSyntheticNetworkMocks(page, DEFAULT_ACTUAL_BACKEND_URL);
  await installSyntheticNetworkMocks(page, testInfo.project.use.baseURL, { includeApi: false });
  let sourceFetchRequests = 0;
  await page.route(url => url.pathname.startsWith('/sound_create/'), async route => {
    if (route.request().resourceType() === 'fetch') {
      sourceFetchRequests += 1;
      await route.abort('failed');
    } else {
      await route.fulfill({ status: 200, contentType: 'audio/mpeg',
        headers: { 'access-control-allow-origin': '*' }, body: Buffer.from('invalid audio') });
    }
  });
  const ffmpegRequests = [];
  page.on('request', request => {
    if (/\/js\/ffmpeg-core\.(js|wasm)(?:\?|$)/.test(request.url())) ffmpegRequests.push(request.url());
  });
  const track = await openHistory(page, testInfo);
  await track.locator('.audio-title').click();
  await expect(page.locator('sw-message-box[role="alert"] p').filter({
    hasText: 'Could not play this audio. Check the connection and retry playback.'
  })).toBeVisible({ timeout: 15000 });
  expect(sourceFetchRequests).toBe(1);
  expect(ffmpegRequests).toEqual([]);
});

test('failed FFmpeg asset load shows a visible playback error', async ({ page }, testInfo) => {
  await installSyntheticNetworkMocks(page, DEFAULT_ACTUAL_BACKEND_URL);
  await installSyntheticNetworkMocks(page, testInfo.project.use.baseURL, { includeApi: false });
  await page.route(url => url.pathname.startsWith('/sound_create/'), async route => {
    await route.fulfill({ status: 200, contentType: 'audio/mpeg',
      headers: { 'access-control-allow-origin': '*' }, body: Buffer.from('invalid audio') });
  });
  let assetRequests = 0;
  await page.route(url => url.pathname.endsWith('/js/ffmpeg-core.js'), async route => {
    assetRequests += 1;
    await route.abort('failed');
  });
  const track = await openHistory(page, testInfo);
  await track.locator('.audio-title').click();
  await expect(page.locator('sw-message-box[role="alert"] p').filter({
    hasText: 'Could not play this audio. Check the connection and retry playback.'
  })).toBeVisible({ timeout: 15000 });
  expect(assetRequests).toBe(1);
  await track.locator('.audio-title').click();
  await expect.poll(() => assetRequests, { timeout: 15000 }).toBe(2);
});
