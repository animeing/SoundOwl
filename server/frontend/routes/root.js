import { readFileSync } from 'fs';
import path from 'path';

export function createRootHandler(rootDir) {
  const templatePath = path.join(rootDir, 'server', 'frontend', 'templates', 'root.html');

  return function rootHandler(_req, res) {
    sendRootHtml(res, templatePath);
  };
}

export function buildRootHtml(templatePath) {
  return readFileSync(templatePath, 'utf8');
}

function sendRootHtml(res, templatePath) {
  const html = buildRootHtml(templatePath);
  res.type('text/html').send(html);
}
