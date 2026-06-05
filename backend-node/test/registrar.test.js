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

test('SoundRegistrar refreshes PHP-seeded sounds with the existing hash instead of inserting a path hash', async () => {
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
  repo.sounds.set('php-fixture-hash', {
    sound_hash: 'php-fixture-hash',
    data_link: '/fixture/library/plain.wav',
    play_count: 5,
  });

  const refreshed = await registrar.refreshByHash('php-fixture-hash');

  assert.deepEqual(refreshed, { count: 1 });
  assert.equal(repo.sounds.has(sha1('/fixture/library/plain.wav')), false);
  assert.equal(repo.sounds.get('php-fixture-hash').play_count, 5);
  assert.deepEqual(jobs, [{ file_path: '/fixture/library/plain.wav', hash: 'php-fixture-hash' }]);
});

test('SoundRegistrar ignores unsupported extensions and handles missing refresh hash', async () => {
  const repo = fakeRepository();
  const registrar = new SoundRegistrar({
    repository: repo,
    redis: { enqueueAudioProcessing: async () => assert.fail('unsupported files must not enqueue') },
    metadataReader: async () => assert.fail('unsupported files must not read metadata'),
  });

  assert.equal(await registrar.registerFile('/fixture/library/readme.txt'), null);
  assert.deepEqual(await registrar.refreshByHash('missing'), { count: 0 });
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
