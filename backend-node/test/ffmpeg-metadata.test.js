import assert from 'node:assert/strict';
import iconv from 'iconv-lite';
import { analyzeLoudness, probeMetadata } from '../src/audio/ffmpeg.js';
import { normalizeMetadata, normalizeMusicMetadata, normalizeTagText, normalizeTagValue, readMetadata } from '../src/audio/metadata.js';

test('analyzeLoudness parses ffmpeg volumedetect mean and max volume', async () => {
  const execFileImpl = (command, args, callback) => {
    assert.equal(command, 'ffmpeg');
    assert.deepEqual(args.slice(0, 2), ['-i', '/fixture/library/a.wav']);
    callback(null, '', 'mean_volume: -18.4 dB\nmax_volume: -1.2 dB');
  };

  assert.deepEqual(await analyzeLoudness('/fixture/library/a.wav', { execFileImpl }), {
    mean_volume: -18.4,
    max_volume: -1.2,
    raw: '\nmean_volume: -18.4 dB\nmax_volume: -1.2 dB',
  });
});

test('analyzeLoudness rejects when ffmpeg fails before volume output is available', async () => {
  const execFileImpl = (command, args, callback) => {
    callback(new Error('failed'), '', 'no such file');
  };

  await assert.rejects(
    analyzeLoudness('/missing.wav', { execFileImpl }),
    /no such file/,
  );
});

test('probeMetadata parses ffprobe JSON output', async () => {
  const execFileImpl = (command, args, callback) => {
    assert.equal(command, 'ffprobe');
    assert.ok(args.includes('-show_format'));
    callback(null, JSON.stringify({ format: { tags: { title: 'Song' } } }), '');
  };

  assert.deepEqual(await probeMetadata('/fixture/library/a.wav', { execFileImpl }), { format: { tags: { title: 'Song' } } });
});

test('probeMetadata rejects invalid ffprobe JSON output', async () => {
  const execFileImpl = (command, args, callback) => {
    callback(null, '{invalid', '');
  };

  await assert.rejects(probeMetadata('/fixture/library/a.wav', { execFileImpl }), SyntaxError);
});

test('normalizeMetadata provides getID3-equivalent tag fallbacks and filename title fallback', () => {
  const tagged = normalizeMetadata({
    format: { tags: { TITLE: 'Title', ARTIST: 'Artist', ALBUM: 'Album', DATE: '2026-05-28' } },
    streams: [{ tags: { genre: 'Rock', track: '10' } }],
  }, '/fixture/library/a.wav');

  assert.equal(tagged.title, 'Title');
  assert.equal(tagged.artist, 'Artist');
  assert.equal(tagged.album, 'Album');
  assert.equal(tagged.genre, 'Rock');
  assert.equal(tagged.track, '10');
  assert.equal(tagged.year, '2026-05-28');
  assert.equal(tagged.hasTags, true);

  const untagged = normalizeMetadata({ format: {}, streams: [] }, '/fixture/library/no-tag.wav');
  assert.equal(untagged.title, 'no-tag.wav');
  assert.equal(untagged.artist, false);
  assert.equal(untagged.hasTags, false);
});

test('normalizeMusicMetadata uses library tags, pictures, native fallback, and filename fallback', () => {
  const parsed = normalizeMusicMetadata({
    common: {
      title: 'Title',
      artist: 'Artist',
      album: 'Album',
      genre: ['Rock'],
      lyrics: [{ language: 'eng', descriptor: '', text: 'line1\rline2\r\nline3' }],
      track: { no: 4 },
      year: 2026,
      picture: [{ format: 'image/png', data: Buffer.from('png') }],
    },
    native: {},
  }, '/fixture/library/a.wav');

  assert.equal(parsed.title, 'Title');
  assert.equal(parsed.artist, 'Artist');
  assert.equal(parsed.album, 'Album');
  assert.equal(parsed.genre, 'Rock');
  assert.equal(parsed.lyrics, 'line1\nline2\nline3');
  assert.equal(parsed.track, '4');
  assert.equal(parsed.year, '2026');
  assert.equal(parsed.picture.mime, 'image/png');
  assert.equal(parsed.picture.length, 3);
  assert.equal(parsed.hasTags, true);

  const nativeOnly = normalizeMusicMetadata({
    common: {},
    native: { id3v2: [{ id: 'albumartist', value: 'Native Artist' }, { id: 'tracknumber', value: '9' }] },
  }, '/fixture/library/native.wav');
  assert.equal(nativeOnly.title, 'native.wav');
  assert.equal(nativeOnly.artist, 'Native Artist');
  assert.equal(nativeOnly.track, '9');
});

test('normalizeTagText repairs typical mojibake without changing valid Japanese or European names', () => {
  const japaneseTitle = '\u697d\u66f2\u30bf\u30a4\u30c8\u30eb';
  const cp932Mojibake = iconv.decode(Buffer.from(japaneseTitle, 'utf8'), 'cp932');
  const latin1Mojibake = Buffer.from(japaneseTitle, 'utf8').toString('latin1');
  const europeanName = 'Beyonc\u00e9 M\u00f6tley Cr\u00fce';

  assert.equal(normalizeTagText(japaneseTitle), japaneseTitle);
  assert.equal(normalizeTagText(cp932Mojibake), japaneseTitle);
  assert.equal(normalizeTagText(latin1Mojibake), japaneseTitle);
  assert.equal(normalizeTagText(europeanName), europeanName);

  const parsed = normalizeMusicMetadata({
    common: { title: cp932Mojibake, artist: latin1Mojibake, album: japaneseTitle },
    native: {},
  }, '/fixture/library/mojibake.mp3');
  assert.equal(parsed.title, japaneseTitle);
  assert.equal(parsed.artist, japaneseTitle);
  assert.equal(parsed.album, japaneseTitle);
});

test('normalizeTagValue decodes Japanese native tag buffers with encoding candidates', () => {
  const title = '\u53e4\u3044\u30bf\u30b0\u30bf\u30a4\u30c8\u30eb';
  const artist = '\u65e7\u30a2\u30fc\u30c6\u30a3\u30b9\u30c8';
  const album = '\u30a2\u30eb\u30d0\u30e0\u540d';

  assert.equal(normalizeTagValue(iconv.encode(title, 'cp932')), title);
  assert.equal(normalizeTagValue(iconv.encode(artist, 'euc-jp')), artist);

  const parsed = normalizeMusicMetadata({
    common: {},
    native: {
      id3v1: [
        { id: 'title', value: iconv.encode(title, 'cp932') },
        { id: 'artist', value: iconv.encode(artist, 'cp932') },
        { id: 'album', value: iconv.encode(album, 'cp932') },
      ],
    },
  }, '/fixture/library/fallback.mp3');
  assert.equal(parsed.title, title);
  assert.equal(parsed.artist, artist);
  assert.equal(parsed.album, album);
});
test('normalizeTagText repairs WAV INFO tags whose CP932 high bits were stripped', () => {
  const strippedTitle = stripCp932HighBits('繝・せ繝域峇蜷喉');
  const strippedArtist = stripCp932HighBits('繝・せ繝域ｭ梧焔A');
  const strippedMixedTitle = `${stripCp932HighBits('繝・せ繝域ｷｷ蝨ｨA')} English suffix`;
  const strippedKatakanaTitle = stripCp932HighBits('繝・せ繝医き繝晦');

  assert.equal(normalizeTagText(strippedTitle), '繝・せ繝育ｨ蜷喉');
  assert.equal(normalizeTagText(strippedArtist), '繝・せ繝磯ｵ懈焔A');
  assert.equal(normalizeTagText(strippedMixedTitle), '繝・せ繝域ｷｷ豎蘗 English suffix');
  assert.equal(normalizeTagText(strippedKatakanaTitle), '繝・せ繝医き繝晦');

  const parsed = normalizeMusicMetadata({
    common: { title: strippedTitle, artist: strippedArtist, album: '繝・せ繝医い繝ｫ繝舌ΒA' },
    native: {},
  }, '/fixture/library/繝・せ繝磯ｵ懈焔A/繝・せ繝医い繝ｫ繝舌ΒA/(01) [繝・せ繝磯ｵ懈焔A] 繝・せ繝育ｨ蜷喉.wav');
  assert.equal(parsed.title, '繝・せ繝育ｨ蜷喉');
  assert.equal(parsed.artist, '繝・せ繝磯ｵ懈焔A');
  assert.equal(parsed.album, '繝・せ繝医い繝ｫ繝舌ΒA');
});

test('readMetadata delegates to music-metadata parser and normalizes the result', async () => {
  const parsed = await readMetadata('/fixture/library/library.wav', {
    parseFile: async (filePath, options) => {
      assert.equal(filePath, '/fixture/library/library.wav');
      assert.deepEqual(options, { duration: false });
      return { common: { title: 'Library Title' }, native: {} };
    },
  });
  assert.equal(parsed.title, 'Library Title');
});

function stripCp932HighBits(value) {
  return String.fromCharCode(...iconv.encode(value, 'cp932').map((byte) => byte & 0x7f));
}

