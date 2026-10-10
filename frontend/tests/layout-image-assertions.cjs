const fs = require('node:fs/promises');
const { PNG } = require('pngjs');

const NEAR_WHITE_CHANNEL = 245;
const TRANSPARENT_ALPHA = 10;
const MAX_TRACKED_COLORS = 256;
const DEFAULT_MIN_NON_WHITE_RATIO = readNumberEnv('SOUNDOWL_LAYOUT_MIN_NON_WHITE_RATIO', 0.005);
const DEFAULT_MIN_UNIQUE_COLORS = readNumberEnv('SOUNDOWL_LAYOUT_MIN_UNIQUE_COLORS', 4);

async function analyzeScreenshot(filePath) {
  const buffer = await fs.readFile(filePath);
  const image = PNG.sync.read(buffer);
  const totalPixels = image.width * image.height;
  let nonWhitePixels = 0;
  let transparentPixels = 0;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let minR = 255;
  let minG = 255;
  let minB = 255;
  let maxR = 0;
  let maxG = 0;
  let maxB = 0;
  const uniqueColors = new Set();

  for (let offset = 0; offset < image.data.length; offset += 4) {
    const r = image.data[offset];
    const g = image.data[offset + 1];
    const b = image.data[offset + 2];
    const a = image.data[offset + 3];

    sumR += r;
    sumG += g;
    sumB += b;
    minR = Math.min(minR, r);
    minG = Math.min(minG, g);
    minB = Math.min(minB, b);
    maxR = Math.max(maxR, r);
    maxG = Math.max(maxG, g);
    maxB = Math.max(maxB, b);

    if (a < TRANSPARENT_ALPHA) {
      transparentPixels += 1;
    }
    if (!(r > NEAR_WHITE_CHANNEL && g > NEAR_WHITE_CHANNEL && b > NEAR_WHITE_CHANNEL)) {
      nonWhitePixels += 1;
    }
    if (uniqueColors.size < MAX_TRACKED_COLORS) {
      uniqueColors.add(`${r},${g},${b},${a}`);
    }
  }

  return {
    width: image.width,
    height: image.height,
    totalPixels,
    nonWhitePixels,
    nonWhiteRatio: ratio(nonWhitePixels, totalPixels),
    transparentPixels,
    transparentRatio: ratio(transparentPixels, totalPixels),
    uniqueColorCount: uniqueColors.size,
    uniqueColorLimit: MAX_TRACKED_COLORS,
    averageRgb: {
      r: round(ratio(sumR, totalPixels)),
      g: round(ratio(sumG, totalPixels)),
      b: round(ratio(sumB, totalPixels)),
    },
    channelRange: {
      r: maxR - minR,
      g: maxG - minG,
      b: maxB - minB,
    },
  };
}

async function assertUsefulScreenshot(filePath, label, options = {}) {
  const stats = await analyzeScreenshot(filePath);
  if (!hasUsefulScreenshotContent(stats, options)) {
    throw new Error(`${label} appears blank or unrendered: ${summarizeScreenshotStats(stats)}`);
  }
  return stats;
}

function hasUsefulScreenshotContent(stats, options = {}) {
  const minNonWhiteRatio = options.minNonWhiteRatio ?? DEFAULT_MIN_NON_WHITE_RATIO;
  const minUniqueColors = options.minUniqueColors ?? DEFAULT_MIN_UNIQUE_COLORS;
  return stats.totalPixels > 0
    && stats.nonWhiteRatio >= minNonWhiteRatio
    && stats.uniqueColorCount >= minUniqueColors;
}

function summarizeScreenshotStats(stats) {
  return `${stats.width}x${stats.height}, ${formatPercent(stats.nonWhiteRatio)} non-white pixels, ${stats.uniqueColorCount} tracked colors`;
}

function ratio(value, total) {
  return total === 0 ? 0 : value / total;
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(3)}%`;
}

function readNumberEnv(name, fallback) {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

module.exports = {
  analyzeScreenshot,
  assertUsefulScreenshot,
  hasUsefulScreenshotContent,
  summarizeScreenshotStats,
};
