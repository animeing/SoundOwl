import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const frontendDir = path.join(repoRoot, 'frontend');

if (!existsSync(path.join(frontendDir, 'package.json'))) {
  process.exit(0);
}

const result = spawnSync('npm', ['install'], {
  cwd: frontendDir,
  stdio: 'inherit'
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
