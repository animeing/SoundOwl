import { test, expect } from '@playwright/test';
import { buildRouteUrl } from './layout-regression-config.mjs';
import {
  DEFAULT_SYNTHETIC_BACKEND_URL,
  installSyntheticFrontendConfigMock,
  installSyntheticNetworkMocks,
} from './layout-synthetic-mocks.mjs';

const baseSettings = {
  db_ip_address: '127.0.0.1',
  db_name: 'sound',
  db_user: 'sound',
  db_pass: 'sound',
  sound_directory: '/music/saved',
  exclusionPaths: [],
  websocket_retry_count: 2,
  websocket_retry_interval: 2500,
};

async function openSettings(page, testInfo, directorySettings) {
  const frontendUrl = testInfo.project.use.baseURL;
  await installSyntheticNetworkMocks(page, DEFAULT_SYNTHETIC_BACKEND_URL);
  await installSyntheticFrontendConfigMock(page, frontendUrl, DEFAULT_SYNTHETIC_BACKEND_URL);
  await page.route('**/api/get_setting.php', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
      body: JSON.stringify({ ...baseSettings, ...directorySettings }),
    });
  });
  await page.goto(buildRouteUrl(frontendUrl, '/setting'), { waitUntil: 'domcontentloaded' });
}

test('explicit environment directory is visible, locked, and does not replace the saved value', async ({ page }, testInfo) => {
  await openSettings(page, testInfo, {
    effective_sound_directory: '/music/override',
    sound_directory_source: 'environment',
  });
  const directory = page.locator('input[name="sound_directory"]');
  await expect(directory).toHaveValue('/music/override');
  await expect(directory).toBeDisabled();
  await expect(page.getByText('SOUND_PATH or SOUND_DIRECTORY fixes this path')).toBeVisible();
  const savedRequest = page.waitForRequest((request) => request.url().endsWith('/api/update_setting.php'));
  await page.getByRole('button', { name: 'setting update' }).click();
  const body = (await savedRequest).postData() || '';
  expect(body).toContain('/music/saved');
  expect(body).not.toContain('/music/override');
});

test('default directory is shown and can be replaced by a saved subdirectory', async ({ page }, testInfo) => {
  await openSettings(page, testInfo, {
    sound_directory: '',
    effective_sound_directory: '/music',
    sound_directory_source: 'default',
  });
  const directory = page.locator('input[name="sound_directory"]');
  await expect(directory).toHaveValue('/music');
  await expect(directory).toBeEnabled();
  await expect(page.getByText('Using the backend default.')).toBeVisible();
  await directory.fill('/music/subdirectory');
  const savedRequest = page.waitForRequest((request) => request.url().endsWith('/api/update_setting.php'));
  await page.getByRole('button', { name: 'setting update' }).click();
  expect((await savedRequest).postData()).toContain('/music/subdirectory');
});

test('registration errors are visible, with a safe fallback for unexpected server failures', async ({ page }, testInfo) => {
  await openSettings(page, testInfo, {
    effective_sound_directory: '/music/saved',
    sound_directory_source: 'settings',
  });
  let errorResponse = {
    status: 400,
    body: { status: 'error', detail: 'Set an absolute Sound Directory other than the filesystem root inside the backend container.' },
  };
  await page.route('**/api/sound_regist.php', async (route) => {
    await route.fulfill({
      status: errorResponse.status,
      headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
      body: JSON.stringify(errorResponse.body),
    });
  });
  await page.getByRole('button', { name: 'sound regist' }).click();
  let errorMessage = page.locator('sw-message-button').last();
  await expect(errorMessage.locator('p')).toHaveText(errorResponse.body.detail);
  await expect(page.getByText('Sound Registing.')).toBeHidden();
  await errorMessage.locator('input[type="button"]').click();

  errorResponse = { status: 500, body: { status: 'error', message: 'internal database details' } };
  await page.getByRole('button', { name: 'sound regist' }).click();
  errorMessage = page.locator('sw-message-button').last();
  await expect(errorMessage.locator('p')).toHaveText('Could not register sounds. Check the Sound Directory and try again.');
  await expect(page.getByText('Sound Registing.')).toBeHidden();
});
test('successful registration still confirms completion', async ({ page }, testInfo) => {
  await openSettings(page, testInfo, {
    effective_sound_directory: '/music/saved',
    sound_directory_source: 'settings',
  });
  await page.getByRole('button', { name: 'sound regist' }).click();
  await expect(page.locator('sw-message-button').last().locator('p')).toHaveText('Sound Registed.');
  await expect(page.getByText('Sound Registing.')).toBeHidden();
});

test('partial registration shows every incomplete file instead of a success message', async ({ page }, testInfo) => {
  await openSettings(page, testInfo, {
    effective_sound_directory: '/music/saved',
    sound_directory_source: 'settings',
  });
  await page.route('**/api/sound_regist.php', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
      body: JSON.stringify({
        count: 1,
        failedCount: 2,
        failures: [
          { target: '/music/bad.wav', reason: 'Could not read audio metadata.' },
          { target: '/music/queue.wav', reason: 'Sound saved, but audio analysis could not be queued.' },
        ],
      }),
    });
  });
  await page.getByRole('button', { name: 'sound regist' }).click();
  const notification = page.locator('sw-message-button[role="alert"]').last();
  await expect(notification.locator('p')).toContainText('2 incomplete file(s)');
  await expect(notification.locator('p')).toContainText('/music/bad.wav: Could not read audio metadata.');
  await expect(notification.locator('p')).toContainText('/music/queue.wav: Sound saved, but audio analysis could not be queued.');
  await expect(page.getByText('Sound Registed.')).toHaveCount(0);
  await expect(page.getByText('Sound Registing.')).toBeHidden();
});
test('status check failures and an active scan are reported before registration starts', async ({ page }, testInfo) => {
  await openSettings(page, testInfo, {
    effective_sound_directory: '/music/saved',
    sound_directory_source: 'settings',
  });
  let statusResponse = { status: 503, body: { status: 'error' } };
  let registrationRequests = 0;
  await page.route('**/api/site_status.php', async (route) => {
    await route.fulfill({
      status: statusResponse.status,
      headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
      body: JSON.stringify(statusResponse.body),
    });
  });
  await page.route('**/api/sound_regist.php', async (route) => {
    registrationRequests += 1;
    await route.fulfill({
      status: 200,
      headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
      body: JSON.stringify({ count: 1 }),
    });
  });

  await page.getByRole('button', { name: 'sound regist' }).click();
  let message = page.locator('sw-message-button').last();
  await expect(message.locator('p')).toHaveText('Could not check registration status.');
  await message.locator('input[type="button"]').click();
  statusResponse = { status: 200, body: { regist_status: true } };
  await page.getByRole('button', { name: 'sound regist' }).click();
  message = page.locator('sw-message-button').last();
  await expect(message.locator('p')).toHaveText('Sound registration is already running.');
  expect(registrationRequests).toBe(0);
});

test('setup registration failure closes progress and displays the API reason', async ({ page }, testInfo) => {
  const frontendUrl = testInfo.project.use.baseURL;
  await installSyntheticNetworkMocks(page, DEFAULT_SYNTHETIC_BACKEND_URL);
  await installSyntheticFrontendConfigMock(page, frontendUrl, DEFAULT_SYNTHETIC_BACKEND_URL);
  const reason = 'Set an absolute Sound Directory other than the filesystem root inside the backend container.';
  await page.route('**/api/sound_regist.php', async (route) => {
    await route.fulfill({
      status: 400,
      headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'error', detail: reason }),
    });
  });
  await page.goto(buildRouteUrl(frontendUrl, '/setup'), { waitUntil: 'domcontentloaded' });
  await page.locator('input[value="SetUp"]').click();
  await expect(page.locator('sw-message-button').last().locator('p')).toHaveText(reason);
  await expect(page.getByText('Sound Registing.')).toBeHidden();
});

test('setup reports partial registration instead of completion', async ({ page }, testInfo) => {
  const frontendUrl = testInfo.project.use.baseURL;
  await installSyntheticNetworkMocks(page, DEFAULT_SYNTHETIC_BACKEND_URL);
  await installSyntheticFrontendConfigMock(page, frontendUrl, DEFAULT_SYNTHETIC_BACKEND_URL);
  await page.route('**/api/sound_regist.php', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
      body: JSON.stringify({
        count: 0,
        failedCount: 1,
        failures: [{ target: '/music/bad.wav', reason: 'Could not read audio metadata.' }],
      }),
    });
  });
  await page.goto(buildRouteUrl(frontendUrl, '/setup'), { waitUntil: 'domcontentloaded' });
  await page.locator('input[value="SetUp"]').click();
  const notification = page.locator('sw-message-button[role="alert"]').last();
  await expect(notification.locator('p')).toContainText('/music/bad.wav: Could not read audio metadata.');
  await expect(page.getByText('Sound Registed.')).toHaveCount(0);
  await expect(page.getByText('Sound Registing.')).toBeHidden();
});
