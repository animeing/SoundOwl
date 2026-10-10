const fs = require('node:fs/promises');
const { PNG } = require('pngjs');

async function compareScreenshots(referencePath, actualPath, diffPath, options = {}) {
  const { default: pixelmatch } = await import('pixelmatch');
  const [referenceBuffer, actualBuffer] = await Promise.all([
    fs.readFile(referencePath),
    fs.readFile(actualPath),
  ]);
  const reference = PNG.sync.read(referenceBuffer);
  const actual = PNG.sync.read(actualBuffer);
  const width = Math.max(reference.width, actual.width);
  const height = Math.max(reference.height, actual.height);
  const normalizedReference = normalizePng(reference, width, height);
  const normalizedActual = normalizePng(actual, width, height);
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(
    normalizedReference.data,
    normalizedActual.data,
    diff.data,
    width,
    height,
    {
      threshold: options.pixelThreshold ?? 0.02,
      includeAA: true,
    },
  );
  const diffAnalysis = summarizeDiffPixels(diff, width, height, {
    maxRegions: options.maxDiffRegions,
    minRegionDiffPixels: options.minDiffRegionPixels,
    tileSize: options.diffTileSize,
  });

  await fs.writeFile(diffPath, PNG.sync.write(diff));
  if (options.regionsPath) {
    await fs.writeFile(options.regionsPath, PNG.sync.write(drawRegionOutlines(diff, diffAnalysis.regions)));
  }

  const totalPixels = width * height;
  const diffRatio = totalPixels === 0 ? 0 : diffPixels / totalPixels;
  return {
    passed: diffPixels <= (options.maxDiffPixels ?? 0) && diffRatio <= (options.maxDiffRatio ?? 0),
    diffPixels,
    diffRatio,
    diffBounds: diffAnalysis.bounds,
    diffRegionSummary: diffAnalysis.summary,
    diffRegions: diffAnalysis.regions,
    imageSize: {
      reference: { width: reference.width, height: reference.height },
      actual: { width: actual.width, height: actual.height },
      compared: { width, height },
    },
  };
}

function summarizeDiffPixels(diff, width, height, options = {}) {
  const totalPixels = width * height;
  const tileSize = Math.max(4, Math.floor(options.tileSize ?? 32));
  const maxRegions = Math.max(1, Math.floor(options.maxRegions ?? 12));
  const minRegionDiffPixels = Math.max(1, Math.floor(options.minRegionDiffPixels ?? 25));
  const tileColumns = Math.ceil(width / tileSize);
  const tileRows = Math.ceil(height / tileSize);
  const tileCount = tileColumns * tileRows;
  const tileDiffPixels = new Uint32Array(tileCount);
  const tileMinX = new Int32Array(tileCount);
  const tileMinY = new Int32Array(tileCount);
  const tileMaxX = new Int32Array(tileCount);
  const tileMaxY = new Int32Array(tileCount);
  tileMinX.fill(width);
  tileMinY.fill(height);
  tileMaxX.fill(-1);
  tileMaxY.fill(-1);

  let diffPixels = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if (!isPixelmatchDiffPixel(diff.data, offset)) {
        continue;
      }
      diffPixels += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      const tileIndex = Math.floor(y / tileSize) * tileColumns + Math.floor(x / tileSize);
      tileDiffPixels[tileIndex] += 1;
      tileMinX[tileIndex] = Math.min(tileMinX[tileIndex], x);
      tileMinY[tileIndex] = Math.min(tileMinY[tileIndex], y);
      tileMaxX[tileIndex] = Math.max(tileMaxX[tileIndex], x);
      tileMaxY[tileIndex] = Math.max(tileMaxY[tileIndex], y);
    }
  }

  if (diffPixels === 0) {
    return {
      bounds: null,
      regions: [],
      summary: {
        totalRegions: 0,
        reportedRegions: 0,
        omittedRegions: 0,
        tileSize,
        minRegionDiffPixels,
      },
    };
  }

  const regions = findTileRegions({
    tileColumns,
    tileRows,
    tileDiffPixels,
    tileMinX,
    tileMinY,
    tileMaxX,
    tileMaxY,
    totalPixels,
  }).sort((first, second) => second.diffPixels - first.diffPixels);
  const filteredRegions = regions.filter((region) => region.diffPixels >= minRegionDiffPixels);
  const reportedRegions = (filteredRegions.length > 0 ? filteredRegions : regions).slice(0, maxRegions);

  return {
    bounds: buildRegion(minX, minY, maxX, maxY, diffPixels, totalPixels),
    regions: reportedRegions.map((region, index) => ({
      rank: index + 1,
      ...region,
    })),
    summary: {
      totalRegions: regions.length,
      reportedRegions: reportedRegions.length,
      omittedRegions: Math.max(0, regions.length - reportedRegions.length),
      tileSize,
      minRegionDiffPixels,
    },
  };
}

function findTileRegions(input) {
  const {
    tileColumns,
    tileRows,
    tileDiffPixels,
    tileMinX,
    tileMinY,
    tileMaxX,
    tileMaxY,
    totalPixels,
  } = input;
  const visited = new Uint8Array(tileDiffPixels.length);
  const regions = [];

  for (let tileIndex = 0; tileIndex < tileDiffPixels.length; tileIndex += 1) {
    if (visited[tileIndex] || tileDiffPixels[tileIndex] === 0) {
      continue;
    }
    const stack = [tileIndex];
    visited[tileIndex] = 1;
    let diffPixels = 0;
    let tileCount = 0;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    while (stack.length > 0) {
      const current = stack.pop();
      diffPixels += tileDiffPixels[current];
      tileCount += 1;
      minX = Math.min(minX, tileMinX[current]);
      minY = Math.min(minY, tileMinY[current]);
      maxX = Math.max(maxX, tileMaxX[current]);
      maxY = Math.max(maxY, tileMaxY[current]);

      const tileX = current % tileColumns;
      const tileY = Math.floor(current / tileColumns);
      for (const neighbor of getTileNeighbors(tileX, tileY, tileColumns, tileRows)) {
        if (!visited[neighbor] && tileDiffPixels[neighbor] > 0) {
          visited[neighbor] = 1;
          stack.push(neighbor);
        }
      }
    }

    regions.push({
      ...buildRegion(minX, minY, maxX, maxY, diffPixels, totalPixels),
      tileCount,
    });
  }

  return regions;
}

function getTileNeighbors(tileX, tileY, tileColumns, tileRows) {
  const neighbors = [];
  for (let y = Math.max(0, tileY - 1); y <= Math.min(tileRows - 1, tileY + 1); y += 1) {
    for (let x = Math.max(0, tileX - 1); x <= Math.min(tileColumns - 1, tileX + 1); x += 1) {
      if (x === tileX && y === tileY) {
        continue;
      }
      neighbors.push(y * tileColumns + x);
    }
  }
  return neighbors;
}

function buildRegion(minX, minY, maxX, maxY, diffPixels, totalPixels) {
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const area = width * height;
  return {
    x: minX,
    y: minY,
    right: maxX,
    bottom: maxY,
    width,
    height,
    area,
    diffPixels,
    diffRatioOfImage: ratio(diffPixels, totalPixels),
    diffDensity: ratio(diffPixels, area),
  };
}

function drawRegionOutlines(source, regions) {
  const annotated = new PNG({ width: source.width, height: source.height });
  source.data.copy(annotated.data);
  const colors = [
    [0, 255, 255, 255],
    [0, 255, 80, 255],
    [255, 0, 255, 255],
    [255, 180, 0, 255],
    [80, 160, 255, 255],
  ];

  regions.slice(0, 8).forEach((region, index) => {
    drawRectangle(annotated, region, colors[index % colors.length], 3);
  });
  return annotated;
}

function drawRectangle(image, region, color, thickness) {
  const left = clamp(region.x, 0, image.width - 1);
  const right = clamp(region.right, 0, image.width - 1);
  const top = clamp(region.y, 0, image.height - 1);
  const bottom = clamp(region.bottom, 0, image.height - 1);
  for (let offset = 0; offset < thickness; offset += 1) {
    drawHorizontalLine(image, left, right, clamp(top + offset, 0, image.height - 1), color);
    drawHorizontalLine(image, left, right, clamp(bottom - offset, 0, image.height - 1), color);
    drawVerticalLine(image, clamp(left + offset, 0, image.width - 1), top, bottom, color);
    drawVerticalLine(image, clamp(right - offset, 0, image.width - 1), top, bottom, color);
  }
}

function drawHorizontalLine(image, left, right, y, color) {
  for (let x = left; x <= right; x += 1) {
    setPixel(image, x, y, color);
  }
}

function drawVerticalLine(image, x, top, bottom, color) {
  for (let y = top; y <= bottom; y += 1) {
    setPixel(image, x, y, color);
  }
}

function setPixel(image, x, y, color) {
  const offset = (y * image.width + x) * 4;
  image.data[offset] = color[0];
  image.data[offset + 1] = color[1];
  image.data[offset + 2] = color[2];
  image.data[offset + 3] = color[3];
}

function isPixelmatchDiffPixel(data, offset) {
  return data[offset] === 255
    && data[offset + 1] === 0
    && data[offset + 2] === 0
    && data[offset + 3] === 255;
}

function normalizePng(source, width, height) {
  if (source.width === width && source.height === height) {
    return source;
  }
  const normalized = new PNG({ width, height });
  for (let offset = 0; offset < normalized.data.length; offset += 4) {
    normalized.data[offset] = 255;
    normalized.data[offset + 1] = 255;
    normalized.data[offset + 2] = 255;
    normalized.data[offset + 3] = 255;
  }
  PNG.bitblt(source, normalized, 0, 0, source.width, source.height, 0, 0);
  return normalized;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function ratio(value, total) {
  return total === 0 ? 0 : value / total;
}

module.exports = {
  compareScreenshots,
};
