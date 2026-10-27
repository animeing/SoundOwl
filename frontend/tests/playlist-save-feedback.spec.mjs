import { test, expect } from '@playwright/test';
import { buildRouteUrl } from './layout-regression-config.mjs';
import {
  DEFAULT_SYNTHETIC_BACKEND_URL,
  installSyntheticFrontendConfigMock,
  installSyntheticNetworkMocks,
} from './layout-synthetic-mocks.mjs';

test.beforeEach(async ({ page }, testInfo) => {
  const frontendUrl = testInfo.project.use.baseURL;
  await installSyntheticNetworkMocks(page, DEFAULT_SYNTHETIC_BACKEND_URL);
  await installSyntheticFrontendConfigMock(page, frontendUrl, DEFAULT_SYNTHETIC_BACKEND_URL);
  await page.goto(buildRouteUrl(frontendUrl, '/history_list'), { waitUntil: 'domcontentloaded' });
});

async function savePlaylist(page, response, {
  addSong = true,
  playlistName = 'Review queue',
  viaContextMenu = false,
} = {}) {
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

  if (addSong) {
    await page.locator('.history-list > button').first().click();
  }

  await page.locator('.secondary-controls .control-button').first().click();
  if (viaContextMenu) {
    await page.locator('.audio-list-overlay .menu-icon').click({ button: 'right' });
    await page.locator('.custom-context-menu').getByText('Save playlist').click();
  } else {
    await page.locator('.audio-list-overlay .play-list-title').click();
  }
  const prompt = page.locator('sw-save-message');
  await expect(prompt).toBeVisible();
  await prompt.locator('input[type="text"]').fill(playlistName);
  const submittedRequest = page.waitForRequest((request) =>
    request.url().endsWith('/api/playlist_action.php') && request.method() === 'POST');
  await prompt.locator('input[type="button"]').first().click();
  const requestBody = (await submittedRequest).postData() ?? '';
  expect(requestBody).toContain('name="playlist_name"');
  if (playlistName) {
    expect(requestBody).toContain(playlistName);
  } else {
    expect(requestBody).not.toContain('Review queue');
  }
  expect(requestBody.includes('synthetic-sound-01')).toBe(addSong);
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

test('playlist save explains when the song list is empty', async ({ page }) => {
  const message = await savePlaylist(page, {
    status: 400,
    body: { status: 'error', detail: 'Enter a playlist name and add at least one song.' },
  }, { addSong: false });
  await expect(message).toBeVisible();
  await expect(message.locator('p')).toHaveText('Enter a playlist name and add at least one song.');
  await message.locator('input[type="button"]').click();
  await expect(message).toBeHidden();
});

test('playlist save explains when the name is empty', async ({ page }) => {
  const message = await savePlaylist(page, {
    status: 400,
    body: { status: 'error', detail: 'Enter a playlist name and add at least one song.' },
  }, { playlistName: '' });
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
    body: { status: 'error', detail: 'private SQL table and key details' },
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

test('playlist save through the context menu reports failure', async ({ page }) => {
  const message = await savePlaylist(page, {
    status: 409,
    body: { status: 'error', detail: 'This playlist name is already in use. Choose another name.' },
  }, { viaContextMenu: true });
  await expect(message).toBeVisible();
  await expect(message.locator('p')).toHaveText('This playlist name is already in use. Choose another name.');
});
