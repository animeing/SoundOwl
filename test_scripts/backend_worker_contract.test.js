const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn, execFile } = require('node:child_process');

const IS_FIXTURE = process.env.SOUNDOWL_CONTRACT_MODE === 'fixture';

function phpHelper(command) {
  return new Promise((resolve, reject) => {
    execFile('php', ['test_scripts/worker_helper.php', command], { timeout: 15000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${error.message}\nstdout=${stdout}\nstderr=${stderr}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (parseError) {
        reject(new Error(`invalid helper JSON: ${stdout}\nstderr=${stderr}`));
      }
    });
  });
}

function waitFor(predicate, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const timer = setInterval(async () => {
      try {
        if (await predicate()) {
          clearInterval(timer);
          resolve();
          return;
        }
      } catch (error) {
        clearInterval(timer);
        reject(error);
        return;
      }
      if (Date.now() - startedAt > timeoutMs) {
        clearInterval(timer);
        reject(new Error('Timed out waiting for worker condition'));
      }
    }, 250);
  });
}

test('queueAction processes a valid Redis job and updates loudness_target', { timeout: 30000 }, async () => {
  if (!IS_FIXTURE) {
    return;
  }

  await phpHelper('reset');
  await phpHelper('push-valid');

  const worker = spawn('php', ['api/quescript/queueAction.php'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  worker.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  worker.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  try {
    await waitFor(() => output.length > 0);
    const loudness = Number((await phpHelper('loudness')).loudness_target);
    assert.ok(Number.isFinite(loudness));
    assert.ok(loudness < 0, `worker output: ${output}`);

    await waitFor(async () => (await phpHelper('lock')).exists === false);
    assert.match(output, /dB|音|更新|volume/i);
  } finally {
    worker.kill('SIGTERM');
    await phpHelper('restore');
  }
});

test('queueAction skips invalid Redis jobs without changing loudness_target', { timeout: 30000 }, async () => {
  if (!IS_FIXTURE) {
    return;
  }

  await phpHelper('reset');
  await phpHelper('push-invalid');

  const worker = spawn('php', ['api/quescript/queueAction.php'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  worker.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  worker.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  try {
    await waitFor(() => output.length > 0);
    const loudness = Number((await phpHelper('loudness')).loudness_target);
    assert.equal(loudness, 0);
  } finally {
    worker.kill('SIGTERM');
    await phpHelper('restore');
  }
});
