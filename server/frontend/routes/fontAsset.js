import { createReadStream } from 'fs';

export function createFontAssetHandler(fontPath) {
  return function fontAssetHandler(_req, res) {
    streamFontAsset(res, fontPath);
  };
}

function streamFontAsset(res, fontPath) {
  res.type('font/ttf');
  createReadStream(fontPath).pipe(res);
}
