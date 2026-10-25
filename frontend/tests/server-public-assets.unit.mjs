import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import serverModule from '../server.js';

test('frontend serves only public assets and never internal repository files', async (t) => {
  const publicRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'soundowl-public-assets-'));
  t.after(() => fs.rm(publicRoot, { recursive: true, force: true }));
  const publicFiles = [
    'index.html', 'manifest.json', 'favicon.ico', 'favicon.svg',
    ...[16, 32, 64, 128, 256].map(size => `favicon_${size}x${size}.png`),
    'css/style.css', 'css/dark-mode.css', 'js/main.bundle.js', 'js/chunk.bundle.js',
    'js/ffmpeg-core.js', 'js/ffmpeg-core.wasm', 'fonts/fontisto.ttf', 'audio_pulse/room.wav',
  ];
  const privateFiles = [
    'backend-node/src/server.js', 'docker-compose.yml', 'Dockerfile', 'README.md',
    'frontend/server.js', 'frontend/config/frontend-settings.json', 'frontend/package.json',
    'frontend/node_modules/express/package.json', 'frontend/tests/private.txt',
    'parts/setup/db/soundowl_table_mysql.sql', '.env', '.git/config', 'js/.secret',
  ];
  for (const file of [...publicFiles, ...privateFiles]) {
    await fs.mkdir(path.dirname(path.join(publicRoot, file)), { recursive: true });
    await fs.writeFile(path.join(publicRoot, file), `fixture:${file}`);
  }
  const server = serverModule.createApp({ publicRoot }).listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const route of [
    ...privateFiles.map(file => `/${file}`),
    '/js/%2e%2e/backend-node/src/server.js', '/css/%2e%2e/docker-compose.yml',
    '/js/%2e%2e%2fbackend-node/src/server.js', '/missing.js',
  ]) {
    const response = await fetch(`${base}${route}`);
    assert.equal(response.status, 404, route);
    assert.doesNotMatch(await response.text(), /fixture:/, route);
  }
  for (const file of publicFiles) {
    const response = await fetch(`${base}/${file}`);
    assert.equal(response.status, 200, file);
    assert.equal(await response.text(), `fixture:${file}`, file);
  }
  for (const route of ['/', '/index', '/index.html?cache=1', '/#settings']) {
    const response = await fetch(`${base}${route}`);
    assert.equal(response.status, 200, route);
    assert.equal(await response.text(), 'fixture:index.html', route);
  }
  const head = await fetch(`${base}/js/ffmpeg-core.wasm`, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  const runtime = await fetch(`${base}/front-config.js`);
  assert.equal(runtime.status, 200);
  assert.match(await runtime.text(), /window.SoundOwlFrontendConfig/);
});

test('root files share a rate limit across aliases and GET/HEAD, without blocking JS', async (t) => {
  const publicRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'soundowl-public-limit-'));
  t.after(() => fs.rm(publicRoot, { recursive: true, force: true }));
  await fs.mkdir(path.join(publicRoot, 'js'));
  await fs.writeFile(path.join(publicRoot, 'index.html'), 'public HTML');
  await fs.writeFile(path.join(publicRoot, 'manifest.json'), '{}');
  await fs.writeFile(path.join(publicRoot, 'js/main.bundle.js'), 'public JS');
  const server = serverModule.createApp({ publicRoot }).listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const routes = ['/', '/index', '/index.html', '/manifest.json'];
  for (let index = 0; index < 600; index++) {
    const response = await fetch(`${base}${routes[index % routes.length]}`, {
      method: index % 2 === 0 ? 'GET' : 'HEAD',
    });
    assert.equal(response.status, 200, `request ${index + 1}`);
    await response.arrayBuffer();
  }
  for (const route of routes) {
    const response = await fetch(`${base}${route}?cache=1`);
    assert.equal(response.status, 429, route);
    assert.ok(Number(response.headers.get('retry-after')) > 0);
    assert.ok(response.headers.has('ratelimit'));
    assert.doesNotMatch(await response.text(), /public HTML/);
  }
  const asset = await fetch(`${base}/js/main.bundle.js`);
  assert.equal(asset.status, 200);
  assert.equal(await asset.text(), 'public JS');
  const privateFile = await fetch(`${base}/frontend/server.js`);
  assert.equal(privateFile.status, 404);
});
