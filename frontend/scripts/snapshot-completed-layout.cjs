const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { PNG } = require('pngjs');

const source = 'http://soundowl.animeing.net/';
const destination = path.resolve(__dirname, '../tests/completed-reference');

async function getText(url) {
  const response = await fetch(new URL(url, source));
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }
  return response.text();
}

async function main() {
  let html = await getText('/');
  let bundle = await getText('/js/main.bundle.js');
  const searchChunkName = 'src_layout_search_Search_vue.main.bundle.js';
  const searchChunk = await getText(`/js/${searchChunkName}`);

  if (!/<body id="app">\s*<\/body>/i.test(html)) {
    throw new Error('Completed HTML contains unexpected body content');
  }
  if (/<(?:img|audio|video)\b/i.test(html)) {
    throw new Error('Completed HTML contains media elements');
  }

  const embedded = [...bundle.matchAll(/data:([^;]+);base64,([A-Za-z0-9+/=]+)/g)]
    .filter((match) => match[1] !== '<type>');
  if (embedded.length !== 8 || embedded.some((match) => match[1] !== 'image/png')) {
    throw new Error(`Unexpected embedded assets in completed JS: ${embedded.map((match) => match[1]).join(', ')}`);
  }
  for (const match of embedded) {
    const image = PNG.sync.read(Buffer.from(match[2], 'base64'));
    if (image.width !== 8 || image.height !== 8) {
      throw new Error('Completed JS contains an embedded image larger than 8x8');
    }
  }
  const pattern = new PNG({ width: 8, height: 8 });
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const offset = (y * 8 + x) * 4;
      const shade = (x < 4) === (y < 4) ? 224 : 192;
      pattern.data.fill(shade, offset, offset + 3);
      pattern.data[offset + 3] = 255;
    }
  }
  const syntheticPattern = PNG.sync.write(pattern).toString('base64');
  bundle = bundle.replace(/data:image\/png;base64,[A-Za-z0-9+/=]+/g, `data:image/png;base64,${syntheticPattern}`);

  html = html
    .replace('url(img/fontisto.php)', "url(/fonts/fontisto.ttf) format('truetype')")
    .replace(/\s*<link rel="(?:icon|manifest)"[^>]*>/g, '')
    .replace('<script src="js/main.bundle.js" defer></script>',
      '<script src="front-config.js"></script>\n    <script src="js/main.bundle.js" defer></script>');
  if (!html.includes('<script src="front-config.js"></script>')) {
    throw new Error('Synthetic frontend config hook was not inserted');
  }
  if (/fontisto\.php|data:audio\//.test(html + bundle)) {
    throw new Error('Completed snapshot still contains an unsupported asset');
  }
  if (!bundle.includes('src_layout_search_Search_vue')
    || /data:image\/|data:audio\/|;base64,/.test(searchChunk)) {
    throw new Error('Unexpected search chunk content');
  }

  await fs.mkdir(path.join(destination, 'js'), { recursive: true });
  await fs.writeFile(path.join(destination, 'index.html'), html);
  await fs.writeFile(path.join(destination, 'js/main.bundle.js'), bundle);
  await fs.writeFile(path.join(destination, 'js', searchChunkName), searchChunk);
  console.log(`Sanitized completed code: HTML ${Buffer.byteLength(html)} bytes, JS ${Buffer.byteLength(bundle)} + ${Buffer.byteLength(searchChunk)} bytes`);
  console.log(`JS SHA-256: ${crypto.createHash('sha256').update(bundle).digest('hex')}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
