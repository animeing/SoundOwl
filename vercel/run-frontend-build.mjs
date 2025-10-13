import { spawnSync } from 'node:child_process';
import { existsSync, rmSync, mkdirSync, cpSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const frontendDir = path.join(repoRoot, 'frontend');
const startDir = process.cwd();

if (!existsSync(path.join(frontendDir, 'package.json'))) {
  console.error('Unable to locate frontend package.json at', frontendDir);
  process.exit(1);
}

const buildResult = spawnSync('npm', ['run', 'build:webpack'], {
  cwd: frontendDir,
  stdio: 'inherit'
});

if (buildResult.status !== 0) {
  process.exit(buildResult.status ?? 1);
}

const outputDir = path.join(repoRoot, 'js');
if (!existsSync(outputDir)) {
  console.error(`Expected build output directory '${outputDir}' was not created`);
  process.exit(1);
}

const resolvedStartDir = path.resolve(startDir);
if (resolvedStartDir !== repoRoot) {
  const destination = path.join(resolvedStartDir, 'js');
  rmSync(destination, { recursive: true, force: true });
  mkdirSync(destination, { recursive: true });
  cpSync(outputDir, destination, { recursive: true });
}
