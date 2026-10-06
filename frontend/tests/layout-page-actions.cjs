const { LAYOUT_COLOR_SCHEME } = require('./layout-regression-config.cjs');

const STABILIZE_CSS = `
  *, *::before, *::after {
    animation-delay: 0s !important;
    animation-duration: 0s !important;
    caret-color: transparent !important;
    scroll-behavior: auto !important;
    transition-delay: 0s !important;
    transition-duration: 0s !important;
  }
`;

async function captureLayoutScreenshot(page, url, state, screenshotPath, options = {}) {
  await prepareLayoutPage(page, url, state, options);
  await page.screenshot({
    animations: 'disabled',
    caret: 'hide',
    fullPage: true,
    path: screenshotPath,
    scale: 'css',
  });
}

async function assertSyntheticSoundList(page, routeName) {
  if (!['history-list', 'album', 'artist', 'search', 'playlist-sounds'].includes(routeName)) {
    return;
  }
  const titles = await page.locator('#base button.audio-item .audio-title').allTextContents();
  const expectedCount = routeName === 'playlist-sounds' ? 8 : 16;
  if (titles.length !== expectedCount || titles.some((title) => !title.startsWith('Synthetic Layout Track '))) {
    throw new Error(`${routeName} rendered ${titles.length}/${expectedCount} synthetic sound titles; unexpected: ${titles.filter((title) => !title.startsWith('Synthetic Layout Track ')).slice(0, 3).join(', ')}`);
  }
}

async function prepareLayoutPage(page, url, state, options = {}) {
  const networkIdleTimeoutMs = options.networkIdleTimeoutMs ?? 3000;
  const settleMs = options.settleMs ?? 1000;

  await page.goto('about:blank');
  await page.emulateMedia({ colorScheme: LAYOUT_COLOR_SCHEME });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForSettledPage(page, networkIdleTimeoutMs, settleMs);
  await applyLayoutState(page, state);
  await waitForSettledPage(page, networkIdleTimeoutMs, settleMs);
}

async function applyLayoutState(page, state) {
  if (!state?.action) {
    return;
  }
  if (state.action === 'full-layout') {
    await activateFullLayout(page);
    return;
  }
  throw new Error(`Unknown layout state action: ${state.action}`);
}

async function activateFullLayout(page) {
  await page.locator('#controller, .audio-controller-bar').first().waitFor({ state: 'visible', timeout: 10000 });
  const result = await page.evaluate(() => {
    const isVisible = (element) => {
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity) !== 0
        && rect.width > 0
        && rect.height > 0;
    };
    const clickIfVisible = (element) => {
      if (!element || !isVisible(element)) {
        return false;
      }
      element.click();
      return true;
    };

    const fullscreenIcon = document.querySelector('.mdi-fullscreen, .mdi-fullscreen-exit');
    const controllerButtons = Array.from(document.querySelectorAll('#controller button')).filter(isVisible);
    const fullscreenButton = fullscreenIcon?.closest('button') || controllerButtons.at(-1);
    if (clickIfVisible(fullscreenButton)) {
      return 'fullscreen-overlay';
    }

    const legacyFillLayoutButton = document.querySelector('.audio-play-item-controller input.audio-controller-parts.icon:last-of-type');
    if (clickIfVisible(legacyFillLayoutButton)) {
      return 'controller-fill-layout';
    }

    return '';
  });

  if (result === 'fullscreen-overlay') {
    await page.waitForFunction(() => Boolean(document.querySelector('.fullscreen-overlay')), null, { timeout: 5000 });
    return;
  }
  if (result === 'controller-fill-layout') {
    await page.waitForFunction(() => {
      return Boolean(document.getElementById('controller')?.classList.contains('current-sound-controller-fill-layout'));
    }, null, { timeout: 5000 });
    return;
  }

  throw new Error('Could not find a visible full layout control.');
}

async function waitForSettledPage(page, networkIdleTimeoutMs, settleMs) {
  await page.waitForLoadState('networkidle', { timeout: networkIdleTimeoutMs }).catch(() => {});
  await page.addStyleTag({ content: STABILIZE_CSS }).catch(() => {});
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(settleMs);
}

module.exports = {
  applyLayoutState,
  assertSyntheticSoundList,
  captureLayoutScreenshot,
  prepareLayoutPage,
};
