import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApiHandlers } from '../src/api/handlers.js';
import { createHttpServer } from '../src/api/httpServer.js';
import { createSettingsStore } from '../src/api/settingsStore.js';
import { loadConfig } from '../src/config.js';
import { listSoundFiles } from '../src/services/soundRegistrar.js';

test('only explicit environment paths override a saved Sound Directory', () => {
  assert.equal(loadConfig({}).soundDirectoryOverride, null);
  assert.equal(loadConfig({ SOUND_PATH: ' ' }).soundDirectoryOverride, null);
  assert.equal(loadConfig({ SOUND_DIRECTORY: '/music/second' }).soundDirectoryOverride, '/music/second');
  assert.equal(loadConfig({
    SOUND_PATH: ' /music/first ',
    SOUND_DIRECTORY: '/music/second',
    SOUND_DIRECTORY_DEFAULT: '/music',
  }).soundDirectoryOverride, '/music/first');
  assert.equal(loadConfig({ SOUND_DIRECTORY_DEFAULT: '/music' }).defaultSoundDirectory, '/music');
});

test('saved path and explicit override select different real subdirectories', async () => {
  const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'soundowl-directory-'));
  try {
    const selectedDirectory = path.join(fixtureRoot, 'selected');
    const overrideDirectory = path.join(fixtureRoot, 'override');
    await fs.mkdir(selectedDirectory);
    await fs.mkdir(overrideDirectory);
    await fs.writeFile(path.join(selectedDirectory, 'chosen.wav'), '');
    await fs.writeFile(path.join(overrideDirectory, 'override.flac'), '');
    const store = createSettingsStore(path.join(fixtureRoot, 'settings.json'));
    await store.write({ sound_directory: selectedDirectory, exclusionPaths: [] });
    const scannedDirectories = [];
    const registrar = {
      registerDirectory: async (directory, exclusions) => {
        scannedDirectories.push(directory);
        return { count: (await listSoundFiles(directory, exclusions)).length };
      },
    };
    const savedHandlers = createApiHandlers({
      settingsStore: store,
      registrar,
      defaultSoundDirectory: overrideDirectory,
    });
    assert.equal((await savedHandlers.getSetting()).body.effective_sound_directory, selectedDirectory);
    assert.equal((await savedHandlers.getSetting()).body.sound_directory_source, 'settings');
    assert.deepEqual((await savedHandlers.soundRegist({ query: {} })).body, { count: 1 });
    assert.equal(scannedDirectories.at(-1), selectedDirectory);

    const config = loadConfig({ SOUND_PATH: overrideDirectory, SOUND_DIRECTORY_DEFAULT: selectedDirectory });
    const overrideHandlers = createApiHandlers({
      settingsStore: store,
      registrar,
      soundDirectoryOverride: config.soundDirectoryOverride,
      defaultSoundDirectory: config.defaultSoundDirectory,
    });
    const overrideSettings = (await overrideHandlers.getSetting()).body;
    assert.equal(overrideSettings.sound_directory, selectedDirectory);
    assert.equal(overrideSettings.effective_sound_directory, overrideDirectory);
    assert.equal(overrideSettings.sound_directory_source, 'environment');
    assert.deepEqual((await overrideHandlers.soundRegist({ query: {} })).body, { count: 1 });
    assert.equal(scannedDirectories.at(-1), overrideDirectory);
    assert.equal((await store.read()).sound_directory, selectedDirectory);
  } finally {
    await fs.rm(fixtureRoot, { recursive: true, force: true });
  }
});

test('HTTP settings save changes the actual scan path; invalid paths never start a scan', async () => {
  const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'soundowl-directory-http-'));
  const firstDirectory = path.join(fixtureRoot, 'first');
  const secondDirectory = path.join(fixtureRoot, 'second');
  await fs.mkdir(firstDirectory);
  await fs.mkdir(secondDirectory);
  await fs.writeFile(path.join(firstDirectory, 'one.wav'), '');
  await fs.writeFile(path.join(secondDirectory, 'two.mp3'), '');
  await fs.writeFile(path.join(secondDirectory, 'three.flac'), '');
  const store = createSettingsStore(path.join(fixtureRoot, 'settings.json'));
  await store.write({ sound_directory: '', exclusionPaths: [] });
  const scannedDirectories = [];
  const releaseRegistrationLock = vi.fn();
  const handlers = createApiHandlers({
    settingsStore: store,
    lockService: { beginStep1: () => releaseRegistrationLock },
    registrar: {
      registerDirectory: async (directory, exclusions) => {
        scannedDirectories.push(directory);
        return { count: (await listSoundFiles(directory, exclusions)).length };
      },
    },
  });
  const server = createHttpServer(handlers);
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const baseUrl = 'http://127.0.0.1:' + server.address().port + '/api';
    const register = () => fetch(baseUrl + '/sound_regist.php', { method: 'POST' });
    const save = (directory) => fetch(baseUrl + '/update_setting.php', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ sound_directory: directory }).toString(),
    });

    const missing = await register();
    assert.equal(missing.status, 400);
    assert.match((await missing.json()).detail, /Sound Directory/);
    assert.deepEqual(scannedDirectories, []);

    await save(firstDirectory);
    assert.deepEqual(await (await register()).json(), { count: 1 });
    await save(secondDirectory);
    assert.deepEqual(await (await register()).json(), { count: 2 });
    assert.deepEqual(scannedDirectories, [firstDirectory, secondDirectory]);
    const settings = await (await fetch(baseUrl + '/get_setting.php')).json();
    assert.equal(settings.effective_sound_directory, secondDirectory);
    assert.equal(settings.sound_directory_source, 'settings');

    for (const invalidDirectory of ['/', '.', '']) {
      await save(invalidDirectory);
      const response = await register();
      assert.equal(response.status, 400);
      assert.match((await response.json()).detail, /Sound Directory/);
    }
    assert.deepEqual(scannedDirectories, [firstDirectory, secondDirectory]);
    assert.equal(releaseRegistrationLock.mock.calls.length, 6);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(fixtureRoot, { recursive: true, force: true });
  }
});

test('a Compose-style default applies only when no path is saved or overridden', async () => {
  const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'soundowl-directory-default-'));
  try {
    const store = createSettingsStore(path.join(fixtureRoot, 'settings.json'));
    await store.write({ sound_directory: '' });
    const scannedDirectories = [];
    const handlers = createApiHandlers({
      settingsStore: store,
      defaultSoundDirectory: fixtureRoot,
      registrar: {
        registerDirectory: async (directory) => {
          scannedDirectories.push(directory);
          return { count: (await listSoundFiles(directory)).length };
        },
      },
    });
    assert.equal((await handlers.getSetting()).body.sound_directory_source, 'default');
    assert.equal((await handlers.getSetting()).body.effective_sound_directory, fixtureRoot);
    await handlers.soundRegist({ query: {} });
    assert.deepEqual(scannedDirectories, [fixtureRoot]);
  } finally {
    await fs.rm(fixtureRoot, { recursive: true, force: true });
  }
});