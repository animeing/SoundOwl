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

async function updateFirstSound(page) {
  await page.locator('.history-list > button').first().click({ button: 'right' });
  await page.locator('.custom-context-menu:visible').getByText('Information update').click();
}

test('individual update failure shows its target and reason without a success toast', async ({ page }) => {
  await page.route('**/api/sound_regist.php?**', async (route) => {
    await route.fulfill({
      status: 500,
      headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
      body: JSON.stringify({
        status: 'error',
        detail: 'Could not update /music/bad.wav: Could not read audio metadata.',
      }),
    });
  });
  await updateFirstSound(page);
  await expect(page.locator('sw-message-button[role="alert"]').last().locator('p'))
    .toHaveText('Could not update /music/bad.wav: Could not read audio metadata.');
  await expect(page.getByText(/Updated sound infomation/)).toHaveCount(0);
  await expect(page.locator('.custom-context-menu:visible')).toHaveCount(0);
});

test('individual update unexpected failure shows a safe fallback', async ({ page }) => {
  await page.route('**/api/sound_regist.php?**', async (route) => {
    await route.fulfill({
      status: 500,
      headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'error', message: 'private database detail' }),
    });
  });
  await updateFirstSound(page);
  await expect(page.locator('sw-message-button[role="alert"]').last().locator('p'))
    .toHaveText('Could not update this sound. Try again.');
  await expect(page.getByText('private database detail')).toHaveCount(0);
});

test('successful individual update retains its completion toast', async ({ page }) => {
  await updateFirstSound(page);
  await expect(page.getByText(/Updated sound infomation/)).toBeVisible();
  await expect(page.locator('sw-message-button[role="alert"]')).toHaveCount(0);
});
