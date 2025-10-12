import { createReadStream } from 'fs';

export function createFontAssetHandler(fontPath) {
  return function fontAssetHandler(_req, res) {
    res.type('font/ttf');
    createReadStream(fontPath).pipe(res);
  };
}
