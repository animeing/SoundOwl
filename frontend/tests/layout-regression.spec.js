const fs = require('node:fs/promises');
const path = require('node:path');
const { test, expect } = require('@playwright/test');
const {
  DEFAULT_ACTUAL_BACKEND_URL,
  DEFAULT_BASELINE_DIR,
  LAYOUT_COLOR_SCHEME,
  buildBaselinePath,
  buildRouteUrl,
  safeName,
  selectLayoutStates,
  selectRoutes,
} = require('./layout-regression-config.cjs');
const {
  analyzeScreenshot,
  hasUsefulScreenshotContent,
  summarizeScreenshotStats,
} = require('./layout-image-assertions.cjs');
const { compareScreenshots } = require('./layout-diff-analysis.cjs');
const { assertSyntheticSoundList, captureLayoutScreenshot } = require('./layout-page-actions.cjs');
const { installSyntheticNetworkMocks } = require('./layout-synthetic-mocks.cjs');

const ROUTE_FILTER = process.env.SOUNDOWL_LAYOUT_ROUTE_FILTER;
const STATE_FILTER = process.env.SOUNDOWL_LAYOUT_STATE_FILTER;
const SELECTED_ROUTES = selectRoutes(ROUTE_FILTER);
const SELECTED_STATES = selectLayoutStates(STATE_FILTER);
const BASELINE_DIR = process.env.SOUNDOWL_LAYOUT_BASELINE_DIR || DEFAULT_BASELINE_DIR;
const BACKEND_URL = process.env.SOUNDOWL_LAYOUT_BACKEND_URL || DEFAULT_ACTUAL_BACKEND_URL;
const ARTIFACT_DIR = process.env.SOUNDOWL_LAYOUT_ARTIFACT_DIR || path.join(process.cwd(), 'test-results', 'layout-regression');
const MAX_DIFF_PIXELS = readNumberEnv('SOUNDOWL_LAYOUT_MAX_DIFF_PIXELS', 0);
const MAX_DIFF_RATIO = readNumberEnv('SOUNDOWL_LAYOUT_MAX_DIFF_RATIO', 0);
const PIXEL_THRESHOLD = readNumberEnv('SOUNDOWL_LAYOUT_PIXEL_THRESHOLD', 0.02);
const RULE_TOLERANCE = readNumberEnv('SOUNDOWL_LAYOUT_RULE_TOLERANCE', 1);
const SETTLE_MS = readNumberEnv('SOUNDOWL_LAYOUT_SETTLE_MS', 1000);
const NETWORK_IDLE_TIMEOUT_MS = readNumberEnv('SOUNDOWL_LAYOUT_NETWORK_IDLE_TIMEOUT_MS', 3000);
const DIFF_TILE_SIZE = readNumberEnv('SOUNDOWL_LAYOUT_DIFF_TILE_SIZE', 32);
const MAX_DIFF_REGIONS = readNumberEnv('SOUNDOWL_LAYOUT_MAX_DIFF_REGIONS', 12);
const MIN_DIFF_REGION_PIXELS = readNumberEnv('SOUNDOWL_LAYOUT_MIN_DIFF_REGION_PIXELS', 25);
const INCLUDE_TEXT_SNIPPETS = process.env.SOUNDOWL_LAYOUT_INCLUDE_TEXT_SNIPPETS === 'true';

test.describe('SoundOwl layout regression', () => {
  test('all configured routes and layout states match the committed baseline', async ({ page }, testInfo) => {
    expect(SELECTED_ROUTES, `No routes matched SOUNDOWL_LAYOUT_ROUTE_FILTER=${ROUTE_FILTER}`).not.toHaveLength(0);
    expect(SELECTED_STATES, `No states matched SOUNDOWL_LAYOUT_STATE_FILTER=${STATE_FILTER}`).not.toHaveLength(0);

    const viewport = testInfo.project.use.viewport;
    const viewportName = `${viewport.width}x${viewport.height}`;
    const projectName = safeName(testInfo.project.name);
    const projectDir = path.join(ARTIFACT_DIR, projectName);
    const failures = [];
    const results = [];
    const actualErrors = collectBrowserErrors(page);

    await installSyntheticNetworkMocks(page, BACKEND_URL);
    await installSyntheticNetworkMocks(page, testInfo.project.use.baseURL);

    for (const route of SELECTED_ROUTES) {
      for (const state of SELECTED_STATES) {
        actualErrors.clear();

        const routeName = safeName(route.name);
        const stateName = safeName(state.name);
        const outputDir = path.join(projectDir, routeName, stateName);
        const actualPath = path.join(outputDir, 'actual.png');
        const referencePath = path.join(outputDir, 'reference.png');
        const diffPath = path.join(outputDir, 'diff.png');
        const regionsPath = path.join(outputDir, 'regions.png');
        const resultPath = path.join(outputDir, 'comparison.json');
        const baselinePath = buildBaselinePath(BASELINE_DIR, projectName, route.name, state.name);
        const actualUrl = buildRouteUrl(testInfo.project.use.baseURL, route.path);

        await fs.mkdir(outputDir, { recursive: true });
        await assertReadableFile(
          baselinePath,
          `Missing layout baseline: ${baselinePath}. Run npm run test:layout:update-baseline from a machine that can access the completed local domain.`,
        );
        await captureLayoutScreenshot(page, actualUrl, state, actualPath, {
          networkIdleTimeoutMs: NETWORK_IDLE_TIMEOUT_MS,
          settleMs: SETTLE_MS,
        });
        await assertSyntheticSoundList(page, route.name);
        await fs.copyFile(baselinePath, referencePath);

        const [baselineStats, actualStats, actualElementRecords] = await Promise.all([
          analyzeScreenshot(referencePath),
          analyzeScreenshot(actualPath),
          collectVisibleElementRecords(page, INCLUDE_TEXT_SNIPPETS),
        ]);
        const actualLayoutIssues = await collectLayoutIssues(page, RULE_TOLERANCE);
        const routeBrowserErrors = actualErrors.drain();
        const comparison = await compareScreenshots(referencePath, actualPath, diffPath, {
          diffTileSize: DIFF_TILE_SIZE,
          maxDiffPixels: MAX_DIFF_PIXELS,
          maxDiffRatio: MAX_DIFF_RATIO,
          maxDiffRegions: MAX_DIFF_REGIONS,
          minDiffRegionPixels: MIN_DIFF_REGION_PIXELS,
          pixelThreshold: PIXEL_THRESHOLD,
          regionsPath,
        });
        const changedAreas = summarizeChangedAreas(comparison.diffRegions, actualElementRecords);
        const result = {
          route,
          state,
          viewport: viewportName,
          colorScheme: LAYOUT_COLOR_SCHEME,
          urls: {
            baseline: baselinePath,
            actual: actualUrl,
          },
          artifacts: {
            actual: 'actual.png',
            reference: 'reference.png',
            diff: 'diff.png',
            regions: 'regions.png',
            comparison: 'comparison.json',
          },
          thresholds: {
            maxDiffPixels: MAX_DIFF_PIXELS,
            maxDiffRatio: MAX_DIFF_RATIO,
            pixelThreshold: PIXEL_THRESHOLD,
            ruleTolerance: RULE_TOLERANCE,
            diffTileSize: DIFF_TILE_SIZE,
            maxDiffRegions: MAX_DIFF_REGIONS,
            minDiffRegionPixels: MIN_DIFF_REGION_PIXELS,
          },
          screenshotStats: {
            baseline: baselineStats,
            actual: actualStats,
          },
          comparison,
          changedAreas,
          browserErrors: routeBrowserErrors,
          layoutIssues: actualLayoutIssues,
        };

        await fs.writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`);
        results.push(result);
        await attachArtifacts(testInfo, `${route.name}-${state.name}`, {
          actual: actualPath,
          reference: referencePath,
          diff: diffPath,
          regions: regionsPath,
          comparison: resultPath,
        });

        const stateFailures = [];
        if (!hasUsefulScreenshotContent(baselineStats)) {
          stateFailures.push(`baseline screenshot appears blank or unrendered: ${summarizeScreenshotStats(baselineStats)}`);
        }
        if (!hasUsefulScreenshotContent(actualStats)) {
          stateFailures.push(`actual screenshot appears blank or unrendered: ${summarizeScreenshotStats(actualStats)}`);
        }
        if (!comparison.passed) {
          stateFailures.push(
            `visual diff ${comparison.diffPixels} px (${formatRatio(comparison.diffRatio)}) exceeds max ${MAX_DIFF_PIXELS} px / ${formatRatio(MAX_DIFF_RATIO)}`,
          );
          const changedAreaSummary = formatChangedAreaSummary(changedAreas, 3);
          if (changedAreaSummary) {
            stateFailures.push(`changed areas:\n${changedAreaSummary}`);
          }
        }
        if (routeBrowserErrors.length > 0) {
          stateFailures.push(`browser errors:\n${routeBrowserErrors.map((message) => `  - ${message}`).join('\n')}`);
        }
        if (actualLayoutIssues.length > 0) {
          stateFailures.push(`layout rule issues:\n${actualLayoutIssues.map(formatLayoutIssue).join('\n')}`);
        }
        if (stateFailures.length > 0) {
          failures.push(`[${viewportName}] ${route.name} ${state.name} (${route.path})\n${stateFailures.join('\n')}`);
        }
      }
    }

    const summaryPaths = await writeLayoutRunSummary(projectDir, {
      colorScheme: LAYOUT_COLOR_SCHEME,
      projectName,
      viewportName,
    }, results);
    await testInfo.attach('layout-regression-summary', {
      path: summaryPaths.markdown,
      contentType: 'text/markdown',
    });
    await testInfo.attach('layout-regression-summary-json', {
      path: summaryPaths.json,
      contentType: 'application/json',
    });

    expect(failures, failures.join('\n\n')).toEqual([]);
  });
});

function collectBrowserErrors(page) {
  const messages = [];
  page.on('console', (message) => {
    if (message.type() !== 'error' || isIgnoredBrowserError(message.text())) {
      return;
    }
    messages.push(`console error: ${message.text()}`);
  });
  page.on('pageerror', (error) => {
    if (isIgnoredBrowserError(error.message)) {
      return;
    }
    messages.push(`page error: ${error.message}`);
  });
  return {
    clear() {
      messages.length = 0;
    },
    drain() {
      return messages.splice(0);
    },
  };
}

function isIgnoredBrowserError(message) {
  return /WebSocket connection to .*:8080/.test(message)
    || /^Failed to load resource:/.test(message);
}

async function collectVisibleElementRecords(page, includeTextSnippets) {
  return page.evaluate((shouldIncludeTextSnippets) => {
    const viewportArea = window.innerWidth * Math.max(window.innerHeight, document.documentElement.scrollHeight);
    return Array.from(document.querySelectorAll('body *'))
      .map((element) => buildElementRecord(element, shouldIncludeTextSnippets, viewportArea))
      .filter(Boolean)
      .sort((first, second) => second.priority - first.priority || first.area - second.area)
      .slice(0, 700);

    function buildElementRecord(element, shouldIncludeText, localViewportArea) {
      if (element.closest('[data-layout-check-ignore]')) {
        return null;
      }
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
        return null;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width <= 1 || rect.height <= 1) {
        return null;
      }

      const selector = selectorFor(element);
      const className = Array.from(element.classList).join(' ');
      const hasText = Boolean(element.innerText && element.innerText.trim());
      const generatedOverlayId = /^v-(?:menu|tooltip|overlay)-v-\d+$/.test(element.id || '');
      const isControl = element.matches('a, button, input, textarea, select, [role="button"], [role="link"], [role="tab"]');
      const isMedia = element.matches('canvas, img, video, svg, picture');
      const isHeading = element.matches('h1, h2, h3, h4, h5, h6, label');
      const isNamed = Boolean((element.id && !generatedOverlayId) || element.getAttribute('role') || element.getAttribute('data-testid'));
      if (generatedOverlayId && !hasText && !isControl && !isMedia && !isHeading) {
        return null;
      }
      const isDomainElement = /audio|album|artist|playlist|controller|fullscreen|setting|search|history|sound|layout|track|queue|footer|header|sidebar|nav|player/i
        .test(`${selector} ${className}`);
      if (!isControl && !isMedia && !isHeading && !isNamed && !isDomainElement && !hasText) {
        return null;
      }

      const pageRect = {
        top: round(rect.top + window.scrollY),
        right: round(rect.right + window.scrollX),
        bottom: round(rect.bottom + window.scrollY),
        left: round(rect.left + window.scrollX),
        width: round(rect.width),
        height: round(rect.height),
      };
      const area = pageRect.width * pageRect.height;
      let priority = 0;
      if (isControl) priority += 40;
      if (isMedia) priority += 30;
      if (isHeading) priority += 25;
      if (isDomainElement) priority += 18;
      if (isNamed) priority += 12;
      if (hasText) priority += 5;
      if (generatedOverlayId) priority -= 50;
      if (area > localViewportArea * 0.75 && !element.matches('.fullscreen-overlay, main, header, footer, nav, aside')) {
        priority -= 15;
      }

      return {
        area,
        descriptor: descriptorFor(element, selector, shouldIncludeText),
        priority,
        rect: pageRect,
        selector,
        tagName: element.localName,
      };
    }

    function descriptorFor(element, selector, shouldIncludeText) {
      const parts = [element.localName];
      if (element.id) {
        parts.push(`#${element.id}`);
      }
      const role = element.getAttribute('role');
      if (role) {
        parts.push(`[role=${role}]`);
      }
      const testId = element.getAttribute('data-testid');
      if (testId) {
        parts.push(`[data-testid=${testId}]`);
      }
      if (shouldIncludeText) {
        const label = element.getAttribute('aria-label') || element.getAttribute('title') || element.getAttribute('alt');
        if (label) {
          parts.push(`label="${trimText(label)}"`);
        }
        if (element.innerText && element.innerText.trim()) {
          parts.push(`text="${trimText(element.innerText)}"`);
        }
      }
      if (parts.length === 1) {
        parts.push(shorten(selector, 80));
      }
      return parts.join(' ');
    }

    function selectorFor(element) {
      if (element.id) {
        return `#${CSS.escape(element.id)}`;
      }
      const parts = [];
      let current = element;
      while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
        let part = current.localName;
        if (current.classList.length > 0) {
          part += `.${Array.from(current.classList).slice(0, 3).map((className) => CSS.escape(className)).join('.')}`;
        }
        const parent = current.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter((child) => child.localName === current.localName);
          if (siblings.length > 1) {
            part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
          }
        }
        parts.unshift(part);
        current = parent;
        if (parts.length >= 5) {
          break;
        }
      }
      return parts.join(' > ');
    }

    function trimText(value) {
      return shorten(value.replace(/\s+/g, ' ').trim(), 80);
    }

    function shorten(value, maxLength) {
      return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}...`;
    }

    function round(value) {
      return Math.round(value * 100) / 100;
    }
  }, includeTextSnippets);
}

async function collectLayoutIssues(page, tolerance) {
  return page.evaluate((ruleTolerance) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const issues = [];
    const isFullscreenState = Boolean(document.querySelector('.fullscreen-overlay'));
    const scrollingElement = document.scrollingElement || document.documentElement;

    if (scrollingElement.scrollWidth > viewportWidth + ruleTolerance) {
      issues.push({
        type: 'page-horizontal-scroll',
        selector: 'document',
        detail: `scrollWidth ${scrollingElement.scrollWidth}px > viewport ${viewportWidth}px`,
      });
    }

    const elements = Array.from(document.querySelectorAll('body *'))
      .map((element) => buildElementRecord(element, ruleTolerance))
      .filter(Boolean);

    for (const element of elements) {
      if (element.isInsideHorizontalClip) {
        continue;
      }
      if (element.rect.left < -ruleTolerance || element.rect.right > viewportWidth + ruleTolerance) {
        issues.push({
          type: 'element-outside-viewport-x',
          selector: element.selector,
          detail: `left ${round(element.rect.left)}px, right ${round(element.rect.right)}px, viewport ${viewportWidth}px`,
        });
      }
      if (element.isFixedLike && (element.rect.top < -ruleTolerance || element.rect.bottom > viewportHeight + ruleTolerance)) {
        issues.push({
          type: 'fixed-element-outside-viewport-y',
          selector: element.selector,
          detail: `top ${round(element.rect.top)}px, bottom ${round(element.rect.bottom)}px, viewport ${viewportHeight}px`,
        });
      }
      if (element.hasText && element.hasVisibleInlineOverflow) {
        issues.push({
          type: 'visible-text-overflow-x',
          selector: element.selector,
          detail: `scrollWidth ${element.scrollWidth}px > clientWidth ${element.clientWidth}px`,
        });
      }
    }

    const overlapCandidates = elements.filter((element) => element.isOverlapCandidate
      && !element.isInsideHorizontalClip
      && (isFullscreenState ? element.isInIntentionalOverlay : !element.isInIntentionalOverlay));
    for (let index = 0; index < overlapCandidates.length; index += 1) {
      const first = overlapCandidates[index];
      for (let nextIndex = index + 1; nextIndex < overlapCandidates.length; nextIndex += 1) {
        const second = overlapCandidates[nextIndex];
        if (first.node.contains(second.node) || second.node.contains(first.node)) {
          continue;
        }
        const intersection = getIntersection(first.rect, second.rect);
        if (!intersection) {
          continue;
        }
        const firstArea = first.rect.width * first.rect.height;
        const secondArea = second.rect.width * second.rect.height;
        const smallerArea = Math.min(firstArea, secondArea);
        const overlapRatio = intersection.area / smallerArea;
        if (intersection.area > 16 && overlapRatio > 0.35) {
          issues.push({
            type: 'interactive-element-overlap',
            selector: `${first.selector} <-> ${second.selector}`,
            detail: `overlap ${round(intersection.area)}px2 (${Math.round(overlapRatio * 100)}% of smaller element)`,
          });
        }
      }
    }

    return issues.slice(0, 50);

    function buildElementRecord(element, localTolerance) {
      if (element.closest('[data-layout-check-ignore]')) {
        return null;
      }
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
        return null;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width <= 1 || rect.height <= 1) {
        return null;
      }
      const overflowX = style.overflowX;
      const hasText = Boolean(element.innerText && element.innerText.trim());
      const isControl = element.matches('a, button, input, textarea, select, canvas, img, video, svg, [role="button"], [role="link"]');
      const hasVisibleInlineOverflow = hasText
        && element.scrollWidth > element.clientWidth + localTolerance
        && overflowX === 'visible'
        && style.whiteSpace !== 'nowrap';

      return {
        node: element,
        selector: selectorFor(element),
        rect: {
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        hasText,
        hasVisibleInlineOverflow,
        isFixedLike: style.position === 'fixed' || style.position === 'sticky',
        isInsideHorizontalClip: Boolean(findHorizontalClipAncestor(element)),
        isInIntentionalOverlay: Boolean(element.closest('.fullscreen-overlay')),
        isOverlapCandidate: isControl || element.matches('h1, h2, h3, h4, h5, h6, label'),
      };
    }

    function findHorizontalClipAncestor(element) {
      let current = element.parentElement;
      while (current && current !== document.body) {
        const style = window.getComputedStyle(current);
        if (['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowX)) {
          return current;
        }
        current = current.parentElement;
      }
      return null;
    }

    function selectorFor(element) {
      if (element.id) {
        return `#${CSS.escape(element.id)}`;
      }
      const parts = [];
      let current = element;
      while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
        let part = current.localName;
        if (current.classList.length > 0) {
          part += `.${Array.from(current.classList).slice(0, 3).map((className) => CSS.escape(className)).join('.')}`;
        }
        const parent = current.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter((child) => child.localName === current.localName);
          if (siblings.length > 1) {
            part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
          }
        }
        parts.unshift(part);
        current = parent;
        if (parts.length >= 5) {
          break;
        }
      }
      return parts.join(' > ');
    }

    function getIntersection(first, second) {
      const left = Math.max(first.left, second.left);
      const right = Math.min(first.right, second.right);
      const top = Math.max(first.top, second.top);
      const bottom = Math.min(first.bottom, second.bottom);
      if (right <= left || bottom <= top) {
        return null;
      }
      return {
        area: (right - left) * (bottom - top),
      };
    }

    function round(value) {
      return Math.round(value * 100) / 100;
    }
  }, tolerance);
}

function summarizeChangedAreas(regions, elements) {
  return regions.map((region) => ({
    ...region,
    nearbyElements: findNearbyElements(region, elements).slice(0, 5),
  }));
}

function findNearbyElements(region, elements) {
  const regionRect = {
    left: region.x,
    top: region.y,
    right: region.right + 1,
    bottom: region.bottom + 1,
  };
  const regionArea = Math.max(1, region.width * region.height);
  const seenSelectors = new Set();
  return elements
    .map((element) => {
      const intersection = getIntersection(regionRect, element.rect);
      if (!intersection || intersection.area < 16) {
        return null;
      }
      const regionOverlapRatio = intersection.area / regionArea;
      const elementOverlapRatio = intersection.area / Math.max(1, element.area);
      const score = (regionOverlapRatio * 2) + elementOverlapRatio + (element.priority / 100);
      return {
        descriptor: element.descriptor,
        elementOverlapRatio: roundRatio(elementOverlapRatio),
        intersectionArea: Math.round(intersection.area),
        rect: element.rect,
        regionOverlapRatio: roundRatio(regionOverlapRatio),
        selector: element.selector,
        tagName: element.tagName,
        score: roundRatio(score),
      };
    })
    .filter(Boolean)
    .sort((first, second) => second.score - first.score || second.intersectionArea - first.intersectionArea)
    .filter((element) => {
      if (seenSelectors.has(element.selector)) {
        return false;
      }
      seenSelectors.add(element.selector);
      return true;
    });
}

function getIntersection(first, second) {
  const left = Math.max(first.left, second.left);
  const right = Math.min(first.right, second.right);
  const top = Math.max(first.top, second.top);
  const bottom = Math.min(first.bottom, second.bottom);
  if (right <= left || bottom <= top) {
    return null;
  }
  return {
    area: (right - left) * (bottom - top),
  };
}

async function writeLayoutRunSummary(projectDir, context, results) {
  await fs.mkdir(projectDir, { recursive: true });
  const summary = buildLayoutRunSummary(context, results);
  const jsonPath = path.join(projectDir, 'summary.json');
  const markdownPath = path.join(projectDir, 'summary.md');
  await Promise.all([
    fs.writeFile(jsonPath, `${JSON.stringify(summary, null, 2)}\n`),
    fs.writeFile(markdownPath, buildLayoutRunSummaryMarkdown(summary)),
  ]);
  return { json: jsonPath, markdown: markdownPath };
}

function buildLayoutRunSummary(context, results) {
  const comparisons = results.map((result) => ({
    route: result.route,
    state: result.state,
    viewport: result.viewport,
    colorScheme: result.colorScheme,
    passed: result.comparison.passed
      && result.browserErrors.length === 0
      && result.layoutIssues.length === 0
      && hasUsefulScreenshotContent(result.screenshotStats.baseline)
      && hasUsefulScreenshotContent(result.screenshotStats.actual),
    diffPixels: result.comparison.diffPixels,
    diffRatio: result.comparison.diffRatio,
    diffBounds: result.comparison.diffBounds,
    diffRegionSummary: result.comparison.diffRegionSummary,
    topChangedAreas: result.changedAreas.slice(0, 5),
    layoutIssues: result.layoutIssues,
    browserErrors: result.browserErrors,
    artifacts: {
      actual: `${safeName(result.route.name)}/${safeName(result.state.name)}/actual.png`,
      reference: `${safeName(result.route.name)}/${safeName(result.state.name)}/reference.png`,
      diff: `${safeName(result.route.name)}/${safeName(result.state.name)}/diff.png`,
      regions: `${safeName(result.route.name)}/${safeName(result.state.name)}/regions.png`,
      comparison: `${safeName(result.route.name)}/${safeName(result.state.name)}/comparison.json`,
    },
  }));
  const failedComparisons = comparisons.filter((comparison) => !comparison.passed);
  const maxDiff = comparisons.reduce((currentMax, comparison) => {
    return comparison.diffRatio > currentMax.diffRatio ? comparison : currentMax;
  }, { diffRatio: 0, diffPixels: 0, route: { name: '' }, state: { name: '' } });

  return {
    ...context,
    totalComparisons: comparisons.length,
    failedComparisons: failedComparisons.length,
    maxDiff: {
      route: maxDiff.route.name,
      state: maxDiff.state.name,
      diffPixels: maxDiff.diffPixels,
      diffRatio: maxDiff.diffRatio,
    },
    comparisons,
  };
}

function buildLayoutRunSummaryMarkdown(summary) {
  const lines = [
    '# SoundOwl Layout Regression Summary',
    '',
    `- Project: ${summary.projectName}`,
    `- Viewport: ${summary.viewportName}`,
    `- Color scheme: ${summary.colorScheme}`,
    `- Comparisons: ${summary.totalComparisons}`,
    `- Failed: ${summary.failedComparisons}`,
    `- Max diff: ${summary.maxDiff.route} ${summary.maxDiff.state} ${summary.maxDiff.diffPixels} px (${formatRatio(summary.maxDiff.diffRatio)})`,
    '',
    '| Route | State | Diff | Largest Changed Area | Nearby Elements | Issues | Artifacts |',
    '| --- | --- | ---: | --- | --- | --- | --- |',
  ];

  for (const comparison of summary.comparisons) {
    if (comparison.passed) {
      continue;
    }
    const largestArea = comparison.topChangedAreas[0];
    lines.push([
      escapeMarkdownTableCell(comparison.route.name),
      escapeMarkdownTableCell(comparison.state.name),
      `${comparison.diffPixels} px (${formatRatio(comparison.diffRatio)})`,
      escapeMarkdownTableCell(formatChangedArea(largestArea)),
      escapeMarkdownTableCell(formatNearbyElements(largestArea?.nearbyElements || [], 3)),
      escapeMarkdownTableCell(formatIssueSummary(comparison)),
      `[regions](${comparison.artifacts.regions}) / [diff](${comparison.artifacts.diff}) / [json](${comparison.artifacts.comparison})`,
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }

  lines.push('');
  lines.push('Full per-route data is available in each comparison.json. regions.png draws boxes around the largest changed areas on top of the pixel diff.');
  lines.push('');
  return lines.join('\n');
}

async function assertReadableFile(filePath, message) {
  try {
    await fs.access(filePath);
  } catch (_error) {
    throw new Error(message);
  }
}

async function attachArtifacts(testInfo, label, artifacts) {
  for (const [name, artifactPath] of Object.entries(artifacts)) {
    await testInfo.attach(`${label}-${name}`, {
      path: artifactPath,
      contentType: name === 'comparison' ? 'application/json' : 'image/png',
    });
  }
}

function readNumberEnv(name, fallback) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatLayoutIssue(issue) {
  return `  - ${issue.type}: ${issue.selector} (${issue.detail})`;
}

function formatChangedAreaSummary(changedAreas, limit) {
  return changedAreas.slice(0, limit).map((area) => {
    return `  - ${formatChangedArea(area)}; near: ${formatNearbyElements(area.nearbyElements, 2)}`;
  }).join('\n');
}

function formatChangedArea(area) {
  if (!area) {
    return 'none';
  }
  return `#${area.rank} x=${area.x}, y=${area.y}, ${area.width}x${area.height}, ${area.diffPixels} px, ${formatRatio(area.diffRatioOfImage)} of image, ${formatRatio(area.diffDensity)} density`;
}

function formatNearbyElements(elements, limit) {
  if (!elements || elements.length === 0) {
    return 'no matching visible element';
  }
  return elements.slice(0, limit).map((element) => shorten(element.selector || element.descriptor, 90)).join('; ');
}

function formatIssueSummary(comparison) {
  const issueParts = [];
  if (comparison.layoutIssues.length > 0) {
    issueParts.push(`${comparison.layoutIssues.length} layout`);
  }
  if (comparison.browserErrors.length > 0) {
    issueParts.push(`${comparison.browserErrors.length} browser`);
  }
  return issueParts.length > 0 ? issueParts.join(', ') : '-';
}

function escapeMarkdownTableCell(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>');
}

function formatRatio(value) {
  return `${(value * 100).toFixed(4)}%`;
}

function roundRatio(value) {
  return Math.round(value * 10000) / 10000;
}

function shorten(value, maxLength) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}...`;
}
