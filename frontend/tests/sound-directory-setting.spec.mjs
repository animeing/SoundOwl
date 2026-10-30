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

async function openSettings(page, testInfo, directorySettings, failureResponse = null) {
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
  if (failureResponse) {
    await page.route('**/api/registration_failures.php*', async (route) => {
      const result = failureResponse(new URL(route.request().url()));
      await route.fulfill({
        status: result.status || 200,
        headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
        body: JSON.stringify(result.body || result),
      });
    });
  }
  await page.goto(buildRouteUrl(frontendUrl, '/setting'), { waitUntil: 'domcontentloaded' });
}

test('Current Status leads to persisted Step1 and Step2 failures after revisiting Settings', async ({ page }, testInfo) => {
  let failures = [
    { step: 1, target: '/music/unreadable.wav', reason: 'Could not read audio metadata.', updatedAt: '2026-10-31T00:00:00Z' },
    { step: 2, target: '/music/quiet.wav', reason: 'Could not analyze audio loudness.', updatedAt: '2026-10-31T00:01:00Z' },
  ];
  await openSettings(page, testInfo, { effective_sound_directory: '/music/saved', sound_directory_source: 'settings' }, (url) => {
    const step = url.searchParams.get('step');
    const matching = failures.filter((failure) => step === 'all' || `step${failure.step}` === step);
    return {
      counts: { step1: failures.filter((failure) => failure.step === 1).length, step2: failures.filter((failure) => failure.step === 2).length },
      total: matching.length,
      failures: matching,
    };
  });
  await expect(page.getByText('2 failures · See Detail')).toBeVisible();
  await expect(page.getByText('Needs attention')).toBeVisible();
  await page.getByRole('button', { name: /Detail/ }).click();
  await expect(page.getByText('/music/unreadable.wav')).toBeVisible();
  await expect(page.getByText('/music/quiet.wav')).toBeVisible();
  if (testInfo.project.name.includes('320x667')) {
    await page.getByText('/music/quiet.wav').scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(200);
    await testInfo.attach('persistent-failures-detail', { body: await page.screenshot(), contentType: 'image/png' });
  }
  await page.getByRole('button', { name: 'Step2 (1)' }).click();
  await expect(page.getByText('/music/quiet.wav')).toBeVisible();
  await expect(page.getByText('/music/unreadable.wav')).toHaveCount(0);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('2 failures · See Detail')).toBeVisible();
  await page.getByRole('button', { name: /Detail/ }).click();
  await expect(page.getByText('/music/unreadable.wav')).toBeVisible();
  failures = failures.filter((failure) => failure.step === 2);
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByText('1 failure · See Detail')).toBeVisible();
  await expect(page.getByText('/music/unreadable.wav')).toHaveCount(0);
});

test('failure list API errors are shown in Detail and the status cue recovers on retry', async ({ page }, testInfo) => {
  let available = false;
  await openSettings(page, testInfo, { effective_sound_directory: '/music/saved', sound_directory_source: 'settings' }, () => available
    ? { counts: { step1: 0, step2: 0 }, total: 0, failures: [] }
    : { status: 503, body: { status: 'error' } });
  await expect(page.getByText('Failure status unavailable · See Detail')).toBeVisible();
  await page.getByRole('button', { name: /Detail/ }).click();
  await expect(page.getByRole('alert').getByText('Could not load failure details.')).toBeVisible();
  available = true;
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByText('No unresolved failures recorded.')).toBeVisible();
  await expect(page.getByText('Failure status unavailable · See Detail')).toHaveCount(0);
});

test('long failure lists can be browsed in bounded pages on Settings', async ({ page }, testInfo) => {
  const failures = Array.from({ length: 30 }, (_, index) => ({
    step: 1,
    target: `/music/failed-${String(index).padStart(2, '0')}.wav`,
    reason: 'Could not read audio metadata.',
    updatedAt: '2026-10-31T00:00:00Z',
  }));
  await openSettings(page, testInfo, { effective_sound_directory: '/music/saved', sound_directory_source: 'settings' }, (url) => {
    const offset = Number(url.searchParams.get('offset'));
    const limit = Number(url.searchParams.get('limit'));
    return { counts: { step1: 30, step2: 0 }, total: 30, failures: failures.slice(offset, offset + limit) };
  });
  await page.getByRole('button', { name: /Detail/ }).click();
  await expect(page.getByText('/music/failed-00.wav')).toBeVisible();
  await expect(page.getByText('/music/failed-29.wav')).toHaveCount(0);
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('/music/failed-29.wav')).toBeVisible();
  await expect(page.getByText('26–30 / 30')).toBeVisible();
  await page.getByRole('button', { name: 'Previous' }).click();
  await expect(page.getByText('/music/failed-00.wav')).toBeVisible();
});

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
  await expect(errorMessage).not.toHaveClass(/sound-registration-summary/);
  await expect(page.getByText('Sound Registing.')).toBeHidden();
  await errorMessage.locator('input[type="button"]').click();

  errorResponse = { status: 500, body: { status: 'error', message: 'internal database details' } };
  await page.getByRole('button', { name: 'sound regist' }).click();
  errorMessage = page.locator('sw-message-button').last();
  await expect(errorMessage.locator('p')).toHaveText('Could not register sounds. Check the Sound Directory and try again.');
  await expect(errorMessage).not.toHaveClass(/sound-registration-summary/);
  await expect(page.getByText('Sound Registing.')).toBeHidden();
});
test('successful registration still confirms completion', async ({ page }, testInfo) => {
  await openSettings(page, testInfo, {
    effective_sound_directory: '/music/saved',
    sound_directory_source: 'settings',
  });
  await page.getByRole('button', { name: 'sound regist' }).click();
  await expect(page.locator('sw-message-button').last().locator('p')).toHaveText('Sound Registed.');
  await expect(page.locator('sw-message-button').last()).not.toHaveClass(/sound-registration-summary/);
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
  await expect(notification).toHaveClass(/sound-registration-summary/);
  await expect(notification.locator('p')).toHaveText('Sound registration finished with 2 incomplete files.');
  await expect(notification.locator('li')).toHaveCount(0);
  await notification.locator('input[value="Details"]').click();
  const details = page.getByRole('dialog', { name: 'Incomplete sound files' });
  await expect(details.locator('li > code')).toHaveText([
    '/music/bad.wav',
    '/music/queue.wav',
  ]);
  await expect(details.locator('li > span')).toHaveText([
    'Could not read audio metadata.',
    'Sound saved, but audio analysis could not be queued.',
  ]);
  await expect(details.locator('.sound-registration-scroll-hint')).toHaveCount(0);
  await details.getByRole('button', { name: 'Close' }).click();
  await expect(details).toHaveCount(0);
  await expect(notification).toBeVisible();
  await expect(page.getByText('Sound Registed.')).toHaveCount(0);
  await expect(page.getByText('Sound Registing.')).toBeHidden();
});

test('missing file details are explained instead of showing an empty dialog', async ({ page }, testInfo) => {
  await openSettings(page, testInfo, {
    effective_sound_directory: '/music/saved',
    sound_directory_source: 'settings',
  });
  await page.route('**/api/sound_regist.php', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
      body: JSON.stringify({ count: 0, failedCount: 1, failures: [] }),
    });
  });
  await page.getByRole('button', { name: 'sound regist' }).click();
  const notification = page.locator('sw-message-button.sound-registration-summary');
  await expect(notification.locator('p')).toHaveText('Sound registration finished with 1 incomplete file.');
  await notification.locator('input[value="Details"]').click();
  const details = page.getByRole('dialog', { name: 'Incomplete sound files' });
  await expect(details.getByText('The server did not provide file details.')).toBeVisible();
  await expect(details.locator('li')).toHaveCount(0);
  await details.getByRole('button', { name: 'Close' }).click();
});

test('long failure lists open on demand and remain readable', async ({ page }, testInfo) => {
  await openSettings(page, testInfo, {
    effective_sound_directory: '/music/saved',
    sound_directory_source: 'settings',
  });
  const failures = Array.from({ length: 30 }, (_, index) => ({
    target: `/music/nested/a-very-long-audio-filename-for-registration-${index}.wav`,
    reason: 'Could not read audio metadata.',
  }));
  await page.route('**/api/sound_regist.php', async (route) => {
    await route.fulfill({
      status: 200,
      headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
      body: JSON.stringify({ count: 0, failedCount: failures.length, failures }),
    });
  });
  await page.getByRole('button', { name: 'sound regist' }).click();
  const notification = page.locator('sw-message-button.sound-registration-summary');
  await expect(notification.locator('p')).toHaveText('Sound registration finished with 30 incomplete files.');
  await expect(notification.locator('li')).toHaveCount(0);
  await expect(page.getByText('Sound Registing.')).toBeHidden();
  if (testInfo.project.name.endsWith('320x667')) {
    await testInfo.attach('failure-summary', { body: await page.screenshot(), contentType: 'image/png' });
  }
  await notification.locator('input[value="Details"]').click();
  const details = page.getByRole('dialog', { name: 'Incomplete sound files' });
  await expect(details.locator('li').last()).toContainText(failures.at(-1).target);
  const failureList = details.locator('ol');
  const dimensions = await failureList.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  await expect(details.locator('.sound-registration-scroll-hint')).toBeVisible();
  await expect(details.getByRole('button', { name: 'Close' })).toBeInViewport();
  if (testInfo.project.name.endsWith('320x667')) {
    await testInfo.attach('failure-dialog-start', { body: await page.screenshot(), contentType: 'image/png' });
  }
  await failureList.focus();
  await page.keyboard.press('End');
  await expect.poll(() => details.locator('li').last().evaluate((lastFailure) => {
    const list = lastFailure.parentElement;
    const targetBounds = lastFailure.getBoundingClientRect();
    const listBounds = list.getBoundingClientRect();
    return targetBounds.top >= listBounds.top && targetBounds.bottom <= listBounds.bottom;
  })).toBe(true);
  if (testInfo.project.name.endsWith('320x667')) {
    await testInfo.attach('failure-dialog-end', { body: await page.screenshot(), contentType: 'image/png' });
  }
  await page.keyboard.press('Escape');
  await expect(details).toHaveCount(0);
  await expect(notification).toBeVisible();
  await notification.locator('input[value="Details"]').click();
  await details.getByRole('button', { name: 'Close' }).click();
  await expect(details).toHaveCount(0);
  await expect(notification.locator('input[value="Close"]')).toBeInViewport();
  await notification.locator('input[value="Close"]').click();
  await expect(notification).toHaveCount(0);
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
  await expect(notification.locator('p')).toHaveText('Sound registration finished with 1 incomplete file.');
  await notification.locator('input[value="Details"]').click();
  const details = page.getByRole('dialog', { name: 'Incomplete sound files' });
  await expect(details.locator('li > code')).toHaveText('/music/bad.wav');
  await expect(details.locator('li > span')).toHaveText('Could not read audio metadata.');
  await expect(page.getByText('Sound Registed.')).toHaveCount(0);
  await expect(page.getByText('Sound Registing.')).toBeHidden();
});
