import { readFileSync } from 'fs';
import path from 'path';

export function createRootHandler(rootDir) {
  const templatePath = path.join(rootDir, 'server', 'frontend', 'templates', 'root.html');

  return function rootHandler(_req, res) {
    const html = buildRootHtml(templatePath);
    res.send(html);
  };
}

export function buildRootHtml(templatePath) {
  return readFileSync(templatePath, 'utf8');
}
