import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { SoundRegistrar, hasSameArtwork, isSameAlbum, listSoundFiles } from '../src/services/soundRegistrar.js';
import { sha1 } from '../src/utils/hash.js';

test('listSoundFiles includes supported audio files and respects exclusion patterns', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'soundowl-register-'));
  await fs.mkdir(path.join(root, 'keep'));
  await fs.mkdir(path.join(root, 'skip'));
  await fs.writeFile(path.join(root, 'keep', 'a.wav'), '');
  await fs.writeFile(path.join(root, 'skip', 'b.mp3'), '');
  await fs.writeFile(path.join(root, 'keep', 'note.txt'), '');

  assert.deepEqual(
    (await listSoundFiles(root, ['skip'])).map((file) => file.replaceAll('\\', '/')).sort(),
    [`${root.replaceAll('\\', '/')}/keep/a.wav`],
  );
});

test('SoundRegistrar registers tagged sound, creates artist/album, and enqueues loudness job', async () => {
  const repo = fakeRepository();
  const jobs = [];
  const registrar = new SoundRegistrar({
    repository: repo,
    redis: { enqueueAudioProcessing: async (job) => jobs.push(job) },
    metadataReader: async () => ({
      title: 'Tagged Song',
      artist: 'Alpha Artist',
      album: 'Fixture Album',
      genre: 'Rock',
      lyrics: false,
      track: '1',
      year: '2026',
      picture: null,
    }),
    clock: () => new Date('2026-05-28T12:34:56'),
  });

  const result = await registrar.registerFile('/fixture/library/contract-fixture/tagged.wav');
  const soundHash = sha1('/fixture/library/contract-fixture/tagged.wav');

  assert.equal(result.action, 'inserted');
  assert.equal(repo.sounds.get(soundHash).title, 'Tagged Song');
  assert.equal(repo.sounds.get(soundHash).album_title, 'Fixture Album');
  assert.equal(repo.artists.size, 1);
  assert.equal(repo.albums.size, 1);
  assert.deepEqual(jobs, [{ file_path: '/fixture/library/contract-fixture/tagged.wav', hash: soundHash }]);
});

test('SoundRegistrar registers untagged sound using basename and refreshes by hash without losing play count', async () => {
  const repo = fakeRepository();
  const jobs = [];
  const registrar = new SoundRegistrar({
    repository: repo,
    redis: { enqueueAudioProcessing: async (job) => jobs.push(job) },
    metadataReader: async (file) => ({
      title: path.basename(file),
      artist: false,
      album: false,
      genre: false,
      lyrics: false,
      track: false,
      year: false,
      picture: null,
    }),
    clock: () => new Date('2026-05-28T12:34:56'),
  });

  await registrar.registerFile('/fixture/library/plain.wav');
  const soundHash = sha1('/fixture/library/plain.wav');
  repo.sounds.get(soundHash).play_count = 99;
  const refreshed = await registrar.refreshByHash(soundHash);

  assert.deepEqual(refreshed, { count: 1 });
  assert.equal(repo.sounds.get(soundHash).title, 'plain.wav');
  assert.equal(repo.sounds.get(soundHash).album_hash, '');
  assert.equal(repo.sounds.get(soundHash).play_count, 99);
  assert.equal(jobs.length, 2);
});

test('SoundRegistrar refreshes fixture-seeded sounds with the existing hash instead of inserting a path hash', async () => {
  const repo = fakeRepository();
  const jobs = [];
  const registrar = new SoundRegistrar({
    repository: repo,
    redis: { enqueueAudioProcessing: async (job) => jobs.push(job) },
    metadataReader: async (file) => ({
      title: path.basename(file),
      artist: false,
      album: false,
      genre: false,
      lyrics: false,
      track: false,
      year: false,
      picture: null,
    }),
    clock: () => new Date('2026-05-28T12:34:56'),
  });
  repo.sounds.set('fixture-existing-hash', {
    sound_hash: 'fixture-existing-hash',
    data_link: '/fixture/library/plain.wav',
    play_count: 5,
  });

  const refreshed = await registrar.refreshByHash('fixture-existing-hash');

  assert.deepEqual(refreshed, { count: 1 });
  assert.equal(repo.sounds.has(sha1('/fixture/library/plain.wav')), false);
  assert.equal(repo.sounds.get('fixture-existing-hash').play_count, 5);
  assert.deepEqual(jobs, [{ file_path: '/fixture/library/plain.wav', hash: 'fixture-existing-hash' }]);
});

test('SoundRegistrar ignores unsupported extensions and reports missing refresh hash', async () => {
  const repo = fakeRepository();
  const registrar = new SoundRegistrar({
    repository: repo,
    redis: { enqueueAudioProcessing: async () => assert.fail('unsupported files must not enqueue') },
    metadataReader: async () => assert.fail('unsupported files must not read metadata'),
  });

  assert.equal(await registrar.registerFile('/fixture/library/readme.txt'), null);
  assert.deepEqual(await registrar.refreshByHash('missing'), {
    count: 0,
    error: { target: 'missing', reason: 'Sound not found.', code: 'SOUND_NOT_FOUND' },
  });
});

test('directory scan keeps successful files and reports metadata failures with their target', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'soundowl-register-result-'));
  const goodFile = path.join(root, 'good.wav').replaceAll('\\', '/');
  const badFile = path.join(root, 'bad.wav').replaceAll('\\', '/');
  await Promise.all([fs.writeFile(goodFile, ''), fs.writeFile(badFile, '')]);
  const repo = fakeRepository();
  const jobs = [];
  const registrar = new SoundRegistrar({
    repository: repo,
    redis: { enqueueAudioProcessing: async (job) => jobs.push(job) },
    metadataReader: async (file) => {
      if (file === badFile) throw new Error('private parser detail');
      return plainMetadata(file);
    },
  });
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const result = await registrar.registerDirectory(root);
    assert.deepEqual(result, {
      count: 1,
      failedCount: 1,
      failures: [{ target: badFile, reason: 'Could not read audio metadata.' }],
    });
    assert.equal(repo.sounds.get(sha1(goodFile)).title, 'good.wav');
    assert.deepEqual(jobs, [{ file_path: goodFile, hash: sha1(goodFile) }]);
    assert.equal(errorLog.mock.calls.length, 1);
  } finally {
    errorLog.mockRestore();
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('directory scan reports save and analysis queue failures without leaking internal errors', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'soundowl-register-stages-'));
  const saveFile = path.join(root, 'save.wav').replaceAll('\\', '/');
  const queueFile = path.join(root, 'queue.wav').replaceAll('\\', '/');
  await Promise.all([fs.writeFile(saveFile, ''), fs.writeFile(queueFile, '')]);
  const repo = fakeRepository();
  const originalUpsert = repo.upsertSound;
  repo.upsertSound = async function (sound) {
    if (sound.data_link === saveFile) throw new Error('private database detail');
    return originalUpsert.call(this, sound);
  };
  const registrar = new SoundRegistrar({
    repository: repo,
    redis: { enqueueAudioProcessing: async () => { throw new Error('private redis detail'); } },
    metadataReader: plainMetadata,
  });
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const result = await registrar.registerDirectory(root);
    assert.equal(result.count, 1);
    assert.equal(result.failedCount, 2);
    assert.deepEqual(result.failures, [
      { target: queueFile, reason: 'Sound saved, but audio analysis could not be queued.' },
      { target: saveFile, reason: 'Could not save sound information.' },
    ]);
    assert.equal(repo.sounds.has(sha1(saveFile)), false);
    assert.equal(repo.sounds.has(sha1(queueFile)), true);
    assert.equal(JSON.stringify(result).includes('private'), false);
  } finally {
    errorLog.mockRestore();
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('individual refresh reports file failures rather than a successful count', async () => {
  const repo = fakeRepository();
  repo.sounds.set('broken', { sound_hash: 'broken', data_link: '/music/broken.wav' });
  repo.sounds.set('unsupported', { sound_hash: 'unsupported', data_link: '/music/unsupported.txt' });
  const registrar = new SoundRegistrar({
    repository: repo,
    redis: { enqueueAudioProcessing: async () => {} },
    metadataReader: async () => { throw new Error('private parser detail'); },
  });
  const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    assert.deepEqual(await registrar.refreshByHash('broken'), {
      count: 2,
      error: { target: '/music/broken.wav', reason: 'Could not read audio metadata.' },
    });
    assert.deepEqual(await registrar.refreshByHash('unsupported'), {
      count: 2,
      error: { target: '/music/unsupported.txt', reason: 'Unsupported audio format.' },
    });
  } finally {
    errorLog.mockRestore();
  }
});

test('album matching follows artist, artwork, and year compatibility rules', () => {
  const art = Buffer.from('same-art');
  assert.equal(isSameAlbum({ artist_id: 'artist-a' }, { artistId: 'artist-a', metadata: {} }), true);
  assert.equal(isSameAlbum({ artist_id: 'artist-b', year: '2026' }, { artistId: 'artist-a', metadata: { year: '2026' } }), true);
  assert.equal(hasSameArtwork({
    album_art: art,
    art_mime: 'image/png',
    art_length: art.length,
  }, {
    data: Buffer.from('same-art'),
    mime: 'image/png',
    length: art.length,
  }), true);
  assert.equal(hasSameArtwork({
    album_art: art,
    art_mime: 'image/png',
    art_length: art.length,
  }, {
    data: Buffer.from('different-art'),
    mime: 'image/png',
    length: art.length,
  }), false);
});

function fakeRepository() {
  return {
    sounds: new Map(),
    artists: new Map(),
    albums: new Map(),
    async findSoundByHash(hash) {
      return this.sounds.get(hash) || null;
    },
    async findSoundByPath(file) {
      return [...this.sounds.values()].find((sound) => sound.data_link === file) || null;
    },
    async upsertSound(sound) {
      const exists = this.sounds.has(sound.sound_hash);
      const previous = this.sounds.get(sound.sound_hash) || {};
      this.sounds.set(sound.sound_hash, { ...previous, ...sound });
      return { action: exists ? 'updated' : 'inserted', sound: this.sounds.get(sound.sound_hash) };
    },
    async findArtistByName(name) {
      return this.artists.get(name) || null;
    },
    async insertArtist(artist) {
      this.artists.set(artist.artist_name, artist);
      return artist;
    },
    async findAlbumByTitle(title) {
      return [...this.albums.values()].filter((album) => album.title === title);
    },
    async insertAlbum(album) {
      this.albums.set(album.album_key, album);
      return album;
    },
    async countSounds() {
      return this.sounds.size;
    },
  };
}

function plainMetadata(file) {
  return {
    title: path.basename(file), artist: false, album: false, genre: false,
    lyrics: false, track: false, year: false, picture: null,
  };
}


