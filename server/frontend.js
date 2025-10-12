import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import { createFontAssetHandler } from './frontend/routes/fontAsset.js';
import { createRootHandler } from './frontend/routes/root.js';
import { createSettingsScriptHandler } from './frontend/routes/settingsScript.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function configureFrontend(app) {
  const rootDir = path.resolve(__dirname, '..');

  app.use(express.static(rootDir));

  const router = express.Router();

  const fontPath = path.join(
    rootDir,
    'vendor',
    'kenangundogan',
    'fontisto',
    'fonts',
    'fontisto',
    'fontisto.ttf'
  );

  router.get('/img/fontisto.php', createFontAssetHandler(fontPath));
  router.get('/js/settings.js', createSettingsScriptHandler(rootDir));
  router.get('/', createRootHandler(rootDir));

  app.use('/', router);
}
