const fs = require('node:fs');
const path = require('node:path');

const frontendRoot = path.resolve(__dirname, '..');
const projectRoot = path.resolve(frontendRoot, '..');
const fontistoRoot = path.dirname(require.resolve('fontisto/package.json'));
const source = path.join(fontistoRoot, 'fonts', 'fontisto', 'fontisto.ttf');
const targets = [
  path.join(projectRoot, 'fonts', 'fontisto.ttf'),
  path.join(projectRoot, 'backend-node', 'assets', 'fontisto.ttf'),
];

if (!fs.existsSync(source)) {
  throw new Error(`Fontisto font was not found in npm package: ${source}`);
}

for (const target of targets) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  console.log(`synced ${path.relative(projectRoot, target)} from fontisto@${require('fontisto/package.json').version}`);
}
