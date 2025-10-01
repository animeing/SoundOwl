const express = require('express');
const fs = require('fs');
const path = require('path');
const ini = require('ini');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const rootDir = __dirname;
const distDir = path.join(rootDir, 'frontend', 'dist');
const indexHtmlPath = path.join(distDir, 'index.html');

// Load websocket settings from setting.ini
let settings = {};
try {
  const iniPath = path.join(__dirname, 'parts', 'setting.ini');
  settings = ini.parse(fs.readFileSync(iniPath, 'utf8'));
} catch (err) {
  console.warn('Could not read setting.ini:', err.message);
}
const retryCount = parseInt(settings.websocket_retry_count || 0, 10);
const retryInterval = parseInt(settings.websocket_retry_interval || 10000, 10);

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir, { index: false }));
}
app.use(express.static(rootDir, { index: false }));

// serve fontisto.ttf similar to img/fontisto.php
app.get('/img/fontisto.php', (req, res) => {
  const fontPath = path.join(rootDir, 'vendor', 'kenangundogan', 'fontisto', 'fonts', 'fontisto', 'fontisto.ttf');
  res.type('font/ttf');
  fs.createReadStream(fontPath).pipe(res);
});

app.get('/config.js', (_req, res) => {
  res.type('application/javascript');
  res.send(`(function(scope){
  scope.SoundOwlProperty = scope.SoundOwlProperty || {};
  const property = scope.SoundOwlProperty;
  property.WebSocket = property.WebSocket || {};
  property.WebSocket.status = false;
  property.WebSocket.retryCount = ${Number.isFinite(retryCount) ? retryCount : 0};
  property.WebSocket.retryInterval = ${Number.isFinite(retryInterval) ? retryInterval : 10000};
  property.SoundRegist = property.SoundRegist || {};
  property.SoundRegist.RegistDataCount = property.SoundRegist.RegistDataCount || {};
  property.SoundRegist.RegistDataCount.sound = property.SoundRegist.RegistDataCount.sound || 0;
  property.SoundRegist.RegistDataCount.artist = property.SoundRegist.RegistDataCount.artist || 0;
  property.SoundRegist.RegistDataCount.album = property.SoundRegist.RegistDataCount.album || 0;
  property.SoundRegist.RegistDataCount.analysisSound = property.SoundRegist.RegistDataCount.analysisSound || 0;
})(window);`);
});

const serveIndex = (_req, res) => {
  if (!fs.existsSync(indexHtmlPath)) {
    res.status(500).send('Frontend build not found. Please run "npm run build --prefix frontend" before starting the server.');
    return;
  }

  res.sendFile(indexHtmlPath);
};

app.get('/', serveIndex);
app.get('*', (req, res, next) => {
  if (req.method !== 'GET') {
    return next();
  }
  if (req.path.startsWith('/api/')) {
    return next();
  }
  if (req.path === '/config.js') {
    return next();
  }
  if (req.path.includes('.')) {
    return next();
  }
  return serveIndex(req, res, next);
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

module.exports = app;
