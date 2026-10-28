import { test, expect } from '@playwright/test';
import { compressHash } from '../../backend-node/src/utils/hash.js';

const backendUrl = 'http://127.0.0.1:3000';

/** Open the actual saved queue after adding a history item through its menu. */
async function addHistoryTrackToOpenPlaylist(page) {
  const historyItem = page.locator('.history-list > button').first();
  await expect(historyItem).toBeVisible();
  await historyItem.click({ button: 'right' });
  await page.getByText('Add to PlayList', { exact: true }).hover();
  await page.getByText('Add to Last', { exact: true }).click();
  await page.locator('.secondary-controls .control-button').first().click();
  await expect(page.locator('.audio-list-overlay .draggable-item')).toHaveCount(1);
}

/** Save the open queue and return the real backend's create response. */
async function saveOpenPlaylist(page, playlistName) {
  await page.locator('.audio-list-overlay .play-list-title').click();
  const prompt = page.locator('sw-save-message');
  await expect(prompt).toBeVisible();
  await prompt.locator('input[type="text"]').fill(playlistName);
  const createResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname === '/api/playlist_action.php'
      && response.request().method() === 'POST');
  await prompt.locator('input[type="button"]').first().click();
  return createResponse;
}

/** Ask the real backend for the rows committed under a playlist name. */
async function playlistSounds(request, playlistName) {
  const response = await request.post(`${backendUrl}/api/playlist_action.php`, {
    form: { method: 'sounds', name: playlistName },
  });
  expect(response.status()).toBe(200);
  return response.json();
}

/** Ask the real backend whether a playlist parent row exists. */
async function playlistExists(request, playlistName) {
  const response = await request.post(`${backendUrl}/api/playlist_action.php`, {
    form: { method: 'names' },
  });
  expect(response.status()).toBe(200);
  return (await response.json()).some((item) => item.play_list === playlistName);
}

test('browser creates a playlist in MariaDB and reports a duplicate without replacing it', async ({ page, request }) => {
  const playlistName = `e2e-created-${Date.now()}`;
  const historyResponse = await request.post(`${backendUrl}/api/history_range_list.php`, {
    form: { start: '0', end: '50' },
  });
  expect(historyResponse.status()).toBe(200);
  const expectedSoundHash = (await historyResponse.json())[0].sound_hash;

  await page.goto('/#/history_list');
  await addHistoryTrackToOpenPlaylist(page);
  const created = await saveOpenPlaylist(page, playlistName);
  expect(created.status()).toBe(200);
  await expect(page.locator('sw-message-button').last().locator('p')).toHaveText('Playlist saved.');
  expect(await playlistExists(request, playlistName)).toBe(true);
  const savedSounds = await playlistSounds(request, playlistName);
  expect(savedSounds.map((sound) => sound.sound_hash)).toEqual([expectedSoundHash]);

  await page.locator('sw-message-button').last().locator('input[type="button"]').click();
  const duplicate = await saveOpenPlaylist(page, playlistName);
  expect(duplicate.status()).toBe(409);
  await expect(page.locator('sw-message-button').last().locator('p'))
    .toHaveText('This playlist name is already in use. Choose another name.');
  expect((await playlistSounds(request, playlistName)).map((sound) => sound.sound_hash))
    .toEqual([expectedSoundHash]);
});

test('browser reports empty queue validation and creates no MariaDB row', async ({ page, request }) => {
  const playlistName = `e2e-empty-${Date.now()}`;
  await page.goto('/#/history_list');
  await page.locator('.secondary-controls .control-button').first().click();
  await expect(page.locator('.audio-list-overlay .draggable-item')).toHaveCount(0);

  const rejected = await saveOpenPlaylist(page, playlistName);
  expect(rejected.status()).toBe(400);
  await expect(page.locator('sw-message-button').last().locator('p'))
    .toHaveText('Enter a playlist name and add at least one song.');
  expect(await playlistExists(request, playlistName)).toBe(false);
});

test('browser reports a deleted song and the MariaDB transaction rolls back', async ({ page, request }) => {
  const playlistName = `e2e-missing-song-${Date.now()}`;
  const missingSoundHash = compressHash('f'.repeat(40));
  // A stale history response represents a track removed from the database after the page learned of it.
  await page.route('**/api/history_range_list.php', async (route) => {
    const response = await route.fetch();
    const history = await response.json();
    history[0].sound_hash = missingSoundHash;
    await route.fulfill({ response, json: history });
  });

  await page.goto('/#/history_list');
  await addHistoryTrackToOpenPlaylist(page);
  const rejected = await saveOpenPlaylist(page, playlistName);
  expect(rejected.status()).toBe(422);
  await expect(page.locator('sw-message-button').last().locator('p'))
    .toHaveText('A song is no longer available. Refresh the playlist and try again.');
  expect(await playlistExists(request, playlistName)).toBe(false);
  expect(await playlistSounds(request, playlistName)).toEqual([]);
});
