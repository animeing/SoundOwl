const { test, expect } = require('@playwright/test');
const { buildRouteUrl } = require('./layout-regression-config.cjs');
const {
  DEFAULT_SYNTHETIC_BACKEND_URL,
  installSyntheticFrontendConfigMock,
  installSyntheticNetworkMocks,
} = require('./layout-synthetic-mocks.cjs');

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.use.viewport.width !== 390, 'The responsive transition is checked in the 390px project.');
  const url = testInfo.project.use.baseURL;
  await installSyntheticNetworkMocks(page, DEFAULT_SYNTHETIC_BACKEND_URL);
  await installSyntheticFrontendConfigMock(page, url, DEFAULT_SYNTHETIC_BACKEND_URL);
  await page.goto(buildRouteUrl(url, '/setting'), { waitUntil: 'domcontentloaded' });
});

test('menu and mobile search retain the completed layout', async ({ page }) => {
  await page.locator('.search-btn').click();
  const clearInset = await page.locator('.search-input .v-field').evaluate((field) => {
    const clearIcon = field.querySelector('.v-field__append-inner');
    return field.getBoundingClientRect().right - clearIcon.getBoundingClientRect().right;
  });
  expect(clearInset).toBe(12);

  await page.locator('.menu-button').click();
  const list = page.locator('.v-overlay__content .v-list');
  await expect(list).toBeVisible();
  await expect.poll(() => list.evaluate((element) => {
    const item = element.querySelector('.v-list-item');
    const content = item.querySelector('.v-list-item__content');
    const listRect = element.getBoundingClientRect();
    return {
      width: listRect.width,
      height: listRect.height,
      rowHeight: item.getBoundingClientRect().height,
      textInset: content.getBoundingClientRect().left - listRect.left,
      background: getComputedStyle(element).backgroundColor,
    };
  })).toEqual({
    width: 176,
    height: 256,
    rowHeight: 48,
    textInset: 72,
    background: 'rgb(33, 33, 33)',
  });
});

test('footer text scrolls only while clipped and rechecks content and viewport changes', async ({ page }) => {
  const state = () => page.locator('.track-text .marquee-text').evaluateAll((elements) =>
    elements.map((element) => ({
      width: element.scrollWidth,
      containerWidth: element.parentElement.clientWidth,
      animations: element.getAnimations().length,
    })),
  );
  const setText = (value) => page.locator('.track-text .marquee-text span').evaluateAll((elements, text) => {
    elements.forEach((element) => { element.textContent = text; });
  }, value);
  const animationCount = async () => (await state()).filter((entry) => entry.animations === 1).length;

  await setText('Short');
  await expect.poll(animationCount).toBe(0);

  await setText('W'.repeat(32));
  await expect.poll(animationCount).toBe(3);
  expect((await state()).every((entry) => entry.width > entry.containerWidth)).toBe(true);

  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect.poll(animationCount).toBe(0);
  expect((await state()).every((entry) => entry.width <= entry.containerWidth)).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(animationCount).toBe(3);

  await setText('Short again');
  await expect.poll(animationCount).toBe(0);
});
