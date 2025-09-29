const express = require('express');
const fs = require('fs');
const path = require('path');
const ini = require('ini');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

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

app.use(express.static(path.join(__dirname)));

// serve fontisto.ttf similar to img/fontisto.php
app.get('/img/fontisto.php', (req, res) => {
  const fontPath = path.join(__dirname, 'vendor', 'kenangundogan', 'fontisto', 'fonts', 'fontisto', 'fontisto.ttf');
  res.type('font/ttf');
  fs.createReadStream(fontPath).pipe(res);
});

app.get('/', (_req, res) => {
  const style = fs.readFileSync(path.join(__dirname, 'css', 'style.css'), 'utf8');
  const dark = fs.readFileSync(path.join(__dirname, 'css', 'dark-mode.css'), 'utf8');
  const html = `<!DOCTYPE html>
<html>
<head>
<meta http-equiv="Content-Type" content="text/html;charset=UTF-8" >
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
@font-face {
  font-family: 'Icon';
  src: url(img/fontisto.php);
}
</style>
<style>${style}</style>
<style media="(prefers-color-scheme: dark)">${dark}</style>
<script>
const SoundOwlProperty = {};
SoundOwlProperty.WebSocket = {
    status:false,
    retryCount:${retryCount},
    retryInterval:${retryInterval}
};
</script>
<link rel="icon" href="favicon.ico" sizes="any">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="manifest" href="manifest.json">
<script src="js/main.bundle.js" defer></script>
</head>
<body id="app"></body>
</html>`;
  res.send(html);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
