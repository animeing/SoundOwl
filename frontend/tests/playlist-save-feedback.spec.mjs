import { test, expect } from '@playwright/test';
import { buildRouteUrl } from './layout-regression-config.mjs';
import {
  DEFAULT_SYNTHETIC_BACKEND_URL,
  installSyntheticFrontendConfigMock,
  installSyntheticNetworkMocks,
} from './layout-synthetic-mocks.mjs';

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.use.viewport.width !== 390, 'Playlist save feedback is checked at 390px.');
  const frontendUrl = testInfo.project.use.baseURL;
  await installSyntheticNetworkMocks(page, DEFAULT_SYNTHETIC_BACKEND_URL);
  await installSyntheticFrontendConfigMock(page, frontendUrl, DEFAULT_SYNTHETIC_BACKEND_URL);
  await page.goto(buildRouteUrl(frontendUrl, '/history_list'), { waitUntil: 'domcontentloaded' });
});

async function savePlaylist(page, response) {
  await page.route('**/api/playlist_action.php', async (route) => {
    if (response === null) {
      await route.abort('failed');
      return;
    }
    await route.fulfill({
      status: response.status,
      headers: {
        'access-control-allow-origin': '*',
        'content-type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(response.body),
    });
  });

  await page.locator('.secondary-controls .control-button').first().click();
  await page.locator('.audio-list-overlay .play-list-title').click();
  const prompt = page.locator('sw-save-message');
  await expect(prompt).toBeVisible();
  await prompt.locator('input[type="text"]').fill('Review queue');
  await prompt.locator('input[type="button"]').first().click();
  return page.locator('sw-message-button').last();
}

test('playlist save shows a duplicate-name reason instead of only an HTTP code', async ({ page }) => {
  const message = await savePlaylist(page, {
    status: 409,
    body: { status: 'error', detail: 'This playlist name is already in use. Choose another name.' },
  });
  await expect(message).toBeVisible();
  await expect(message.locator('p')).toHaveText('This playlist name is already in use. Choose another name.');
});

test('playlist save explains when a song is no longer available', async ({ page }) => {
  const message = await savePlaylist(page, {
    status: 422,
    body: { status: 'error', detail: 'A song is no longer available. Refresh the playlist and try again.' },
  });
  await expect(message).toBeVisible();
  await expect(message.locator('p')).toHaveText('A song is no longer available. Refresh the playlist and try again.');
});

test('playlist save explains missing name or songs', async ({ page }) => {
  const message = await savePlaylist(page, {
    status: 400,
    body: { status: 'error', detail: 'Enter a playlist name and add at least one song.' },
  });
  await expect(message).toBeVisible();
  await expect(message.locator('p')).toHaveText('Enter a playlist name and add at least one song.');
});

test('playlist save reports an error returned in an HTTP success response', async ({ page }) => {
  const message = await savePlaylist(page, {
    status: 200,
    body: { status: 'error', detail: 'Playlist creation was rejected.' },
  });
  await expect(message).toBeVisible();
  await expect(message.locator('p')).toHaveText('Playlist creation was rejected.');
});
test('playlist save hides internal SQL details on unexpected server failure', async ({ page }) => {
  const message = await savePlaylist(page, {
    status: 500,
    body: { status: 'error', message: 'private SQL table and key details' },
  });
  await expect(message).toBeVisible();
  await expect(message.locator('p')).toHaveText('Could not save the playlist. Please try again.');
});

test('playlist save reports an unreachable server', async ({ page }) => {
  const message = await savePlaylist(page, null);
  await expect(message).toBeVisible();
  await expect(message.locator('p')).toHaveText('Cannot reach the server. Check the connection and try again.');
});

test('playlist save visibly confirms success', async ({ page }) => {
  const message = await savePlaylist(page, {
    status: 200,
    body: { status: 'success', detail: 'playlist created.' },
  });
  await expect(message).toBeVisible();
  await expect(message.locator('p')).toHaveText('Playlist saved.');
});
