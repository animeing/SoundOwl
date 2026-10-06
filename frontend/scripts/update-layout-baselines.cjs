const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');
const {
  DEFAULT_BASELINE_DIR,
  LAYOUT_COLOR_SCHEME,
  buildBaselinePath,
  buildRouteUrl,
  selectLayoutStates,
  selectRoutes,
  selectViewports,
} = require('../tests/layout-regression-config.cjs');
const { assertUsefulScreenshot, summarizeScreenshotStats } = require('../tests/layout-image-assertions.cjs');
const { assertSyntheticSoundList, captureLayoutScreenshot } = require('../tests/layout-page-actions.cjs');
const {
  DEFAULT_SYNTHETIC_BACKEND_URL,
  installSyntheticFrontendConfigMock,
  installSyntheticNetworkMocks,
} = require('../tests/layout-synthetic-mocks.cjs');

const REFERENCE_URL = process.env.SOUNDOWL_LAYOUT_REFERENCE_URL || 'http://soundowl.animeing.net/#/';
const BASELINE_DIR = process.env.SOUNDOWL_LAYOUT_BASELINE_DIR || DEFAULT_BASELINE_DIR;
const REFERENCE_BACKEND_URL = process.env.SOUNDOWL_LAYOUT_REFERENCE_BACKEND_URL
  || process.env.SOUNDOWL_LAYOUT_BACKEND_URL
  || DEFAULT_SYNTHETIC_BACKEND_URL;
const ROUTE_FILTER = process.env.SOUNDOWL_LAYOUT_ROUTE_FILTER;
const VIEWPORT_FILTER = process.env.SOUNDOWL_LAYOUT_VIEWPORT_FILTER;
const STATE_FILTER = process.env.SOUNDOWL_LAYOUT_STATE_FILTER;
const ROUTES = selectRoutes(ROUTE_FILTER);
const VIEWPORTS = selectViewports(VIEWPORT_FILTER);
const STATES = selectLayoutStates(STATE_FILTER);
const SETTLE_MS = readNumberEnv('SOUNDOWL_LAYOUT_SETTLE_MS', 1000);
const NETWORK_IDLE_TIMEOUT_MS = readNumberEnv('SOUNDOWL_LAYOUT_NETWORK_IDLE_TIMEOUT_MS', 3000);
const IS_PARTIAL_UPDATE = Boolean(ROUTE_FILTER || VIEWPORT_FILTER || STATE_FILTER);
const CAPTURE_ROOT = IS_PARTIAL_UPDATE ? BASELINE_DIR : path.join(BASELINE_DIR, `.next-${process.pid}`);

main().catch(async (error) => {
  if (!IS_PARTIAL_UPDATE) {
    await fs.rm(CAPTURE_ROOT, { recursive: true, force: true }).catch(() => {});
  }
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  if (ROUTES.length === 0) {
    throw new Error(`No routes matched SOUNDOWL_LAYOUT_ROUTE_FILTER=${ROUTE_FILTER}`);
  }
  if (VIEWPORTS.length === 0) {
    throw new Error(`No viewports matched SOUNDOWL_LAYOUT_VIEWPORT_FILTER=${VIEWPORT_FILTER}`);
  }
  if (STATES.length === 0) {
    throw new Error(`No layout states matched SOUNDOWL_LAYOUT_STATE_FILTER=${STATE_FILTER}`);
  }

  assertGeneratedPath(BASELINE_DIR, DEFAULT_BASELINE_DIR);
  assertGeneratedPath(CAPTURE_ROOT, BASELINE_DIR);

  if (IS_PARTIAL_UPDATE) {
    await fs.mkdir(BASELINE_DIR, { recursive: true });
    await writeBaselineReadme(BASELINE_DIR);
  } else {
    await resetDir(CAPTURE_ROOT);
    await writeBaselineReadme(CAPTURE_ROOT);
  }

  const browser = await chromium.launch();
  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        colorScheme: LAYOUT_COLOR_SCHEME,
        deviceScaleFactor: 1,
        locale: 'ja-JP',
        viewport: { width: viewport.width, height: viewport.height },
      });
      const page = await context.newPage();
      await installSyntheticFrontendConfigMock(page, REFERENCE_URL, REFERENCE_BACKEND_URL);
      await installSyntheticNetworkMocks(page, REFERENCE_BACKEND_URL);
      await installSyntheticNetworkMocks(page, new URL(REFERENCE_URL).origin + '/');

      try {
        for (const route of ROUTES) {
          for (const state of STATES) {
            const baselinePath = buildBaselinePath(CAPTURE_ROOT, viewport.name, route.name, state.name);
            await fs.mkdir(path.dirname(baselinePath), { recursive: true });
            const label = `${viewport.name} ${route.name} ${state.name}`;
            const stats = await captureBaseline(page, buildRouteUrl(REFERENCE_URL, route.path), state, baselinePath, label, route.name);
            console.log(`Captured ${label} (${summarizeScreenshotStats(stats)})`);
          }
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  if (!IS_PARTIAL_UPDATE) {
    await replaceBaselineDir(CAPTURE_ROOT, BASELINE_DIR);
  }
}

async function writeBaselineReadme(targetDir) {
  await fs.writeFile(path.join(targetDir, 'README.md'), `# Layout Baselines

These PNG files are generated from the completed SoundOwl layout in dark mode with synthetic test data only.
The update script overrides front-config.js so the completed app renders against the synthetic backend mock.
Each route stores default.png and full-layout.png so the fullscreen/full layout control is also covered.
Do not capture or commit screenshots that contain real song titles, lyrics, artwork, or audio-related user data.
The update script rejects screenshots that look blank or unrendered so an inaccessible reference URL cannot silently become the baseline.

Update them from a machine that can access the completed local domain:

\`\`\`sh
npm run test:layout:update-baseline --prefix frontend
\`\`\`

Run the committed baseline comparison locally with the same runner used by CI:

\`\`\`sh
npm run test:layout:local --prefix frontend
\`\`\`

For a quick smoke check while iterating, run only the home route at the smallest viewport:

\`\`\`sh
npm run test:layout:quick --prefix frontend
\`\`\`

The local runner accepts filters and writes summaries under \`frontend/test-results/layout-regression-local\` by default:

\`\`\`sh
npm run test:layout:local --prefix frontend -- --route home --viewport 320x667 --state full-layout
\`\`\`
`);
}
async function captureBaseline(page, url, state, screenshotPath, label, routeName) {
  const tempPath = `${screenshotPath}.tmp-${process.pid}.png`;
  try {
    await fs.rm(tempPath, { force: true });
    await captureLayoutScreenshot(page, url, state, tempPath, {
      networkIdleTimeoutMs: NETWORK_IDLE_TIMEOUT_MS,
      settleMs: SETTLE_MS,
    });
    await assertSyntheticSoundList(page, routeName);
    const stats = await assertUsefulScreenshot(tempPath, `Baseline ${label}`);
    await fs.rm(screenshotPath, { force: true });
    await fs.rename(tempPath, screenshotPath);
    return stats;
  } catch (error) {
    await fs.rm(tempPath, { force: true }).catch(() => {});
    throw error;
  }
}

async function resetDir(targetDir) {
  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });
}

async function replaceBaselineDir(sourceDir, targetDir) {
  await fs.mkdir(targetDir, { recursive: true });
  const sourceName = path.basename(sourceDir);
  const existingEntries = await fs.readdir(targetDir, { withFileTypes: true });

  await Promise.all(existingEntries
    .filter((entry) => entry.name !== sourceName)
    .map((entry) => fs.rm(path.join(targetDir, entry.name), { recursive: true, force: true })));

  const capturedEntries = await fs.readdir(sourceDir, { withFileTypes: true });
  for (const entry of capturedEntries) {
    await fs.rename(path.join(sourceDir, entry.name), path.join(targetDir, entry.name));
  }

  await fs.rm(sourceDir, { recursive: true, force: true });
}

function assertGeneratedPath(targetDir, allowedRoot) {
  const resolvedTarget = path.resolve(targetDir);
  const resolvedRoot = path.resolve(allowedRoot);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    return;
  }
  throw new Error(`Refusing to write outside the layout baseline area: ${targetDir}`);
}

function readNumberEnv(name, fallback) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) ? parsed : fallback;
}
