const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = readFileSync(
  path.join(__dirname, '../src/audio/AudioPlayStateAction.js'),
  'utf8'
);

async function playbackFixture() {
  const requests = [];
  const notices = [];
  const socketMessages = [];
  const playedClips = [];
  const context = vm.createContext({ EventTarget, JSON });
  const module = new vm.SourceTextModule(source, { context });

  class SoundPlayedAction {
    constructor() {
      this.httpRequestor = new EventTarget();
      this.formDataMap = {
        values: [],
        append(name, value) { this.values.push([name, value]); }
      };
      this.executeCount = 0;
      requests.push(this);
    }
    execute() {
      this.executeCount += 1;
    }
  }

  class MessageWindow {
    constructor() {
      this.openCount = 0;
      this.closeDelay = null;
      notices.push(this);
    }
    setAttribute(name, value) { this[name] = value; }
    open() { this.openCount += 1; }
    close(delay) { this.closeDelay = delay; }
  }

  const exportsByImport = {
    '../base': { BaseFrameWork: {}, MessageWindow },
    '../page': { SoundPlayedAction },
    '../websocket': {
      SoundOwlProperty: {
        WebSocket: {
          Socket: { send(message) { socketMessages.push(JSON.parse(message)); } }
        }
      }
    },
    './enum/AudioPlayStateEnum': { AudioPlayStateEnum: { STOP: 'stopped' } },
    './enum/AudioStateEnum': { AudioStateEnum: {} },
    './Playlist': { Playlist: class {} }
  };
  await module.link((specifier) => {
    const exports = exportsByImport[specifier];
    if (!exports) throw new Error('Unexpected import: ' + specifier);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await module.evaluate();

  const playback = Object.create(module.namespace.AudioPlayStateAction.prototype);
  playback.playList = {
    currentAudioClip: { soundHash: 'fixture-sound' },
    next() { return null; }
  };
  playback.play = (clip) => playedClips.push(clip);
  playback.handlePlayedAction();
  return { playback, requests, notices, socketMessages, playedClips };
}

test('successful play recording advances playback without a failure notice', async () => {
  const fixture = await playbackFixture();
  const [request] = fixture.requests;
  request.httpRequestor.dispatchEvent(new Event('success'));

  assert.deepEqual(request.formDataMap.values, [['SoundHash', 'fixture-sound']]);
  assert.equal(request.executeCount, 1);
  assert.equal(fixture.notices.length, 0);
  assert.equal(fixture.playback.currentPlayState, 'stopped');
  assert.deepEqual(fixture.socketMessages, [{ eventType: 'played', soundHash: 'fixture-sound' }]);
  assert.deepEqual(fixture.playedClips, []);
});

for (const status of [0, 404, 500]) {
  test(`play recording failure (HTTP ${status}) informs the user without retrying`, async () => {
    const fixture = await playbackFixture();
    const [request] = fixture.requests;
    request.httpRequestor.status = status;
    request.httpRequestor.dispatchEvent(new Event('error'));

    assert.equal(fixture.notices.length, 1);
    assert.match(fixture.notices[0].value, /Could not confirm play history was saved/);
    assert.equal(fixture.notices[0].role, 'alert');
    assert.equal(fixture.notices[0].openCount, 1);
    assert.equal(fixture.notices[0].closeDelay, 4500);
    assert.equal(request.executeCount, 1);
    assert.equal(fixture.playback.currentPlayState, 'stopped');
  });
}
