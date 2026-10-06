// Local dev server: builds the site, serves it on http://localhost:3000,
// and rebuilds + reloads the browser whenever something in src/ or content/ changes.
//   npm run dev               watch mode
//   npm run preview           serve the current build without watching

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Dev builds go to .dev/ so they never clash with `npm run build` (dist/).
const DIST = path.join(root, process.argv.includes('--no-watch') ? 'dist' : '.dev');
const ASSETS = path.join(root, 'src', 'assets');
const PORT = Number(process.env.PORT) || 3000;
const watch = !process.argv.includes('--no-watch');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.xml': 'application/xml', '.txt': 'text/plain',
};

const build = () =>
  spawnSync(process.execPath, [path.join(root, 'scripts', 'build.js')], {
    stdio: 'inherit',
    env: { ...process.env, SKIP_ASSETS: watch ? '1' : '', DEV: watch ? '1' : '', OUT_DIR: path.relative(root, DIST) },
  });

build();

const clients = new Set();
const RELOAD = `<script>new EventSource('/__reload').onmessage=()=>location.reload()</script>`;

function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const base = clean.startsWith('/assets/') && watch ? path.join(ASSETS, clean.slice(8)) : path.join(DIST, clean);
  if (!base.startsWith(root)) return null;
  for (const candidate of [base, path.join(base, 'index.html'), base + '.html']) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

http
  .createServer((req, res) => {
    if (req.url === '/__reload') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    const file = resolveFile(req.url);
    if (!file) {
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      return res.end(fs.existsSync(path.join(DIST, '404.html')) ? fs.readFileSync(path.join(DIST, '404.html')) : 'Not found');
    }
    // Redirect /about -> /about/ so relative URLs behave like production.
    if (!req.url.split('?')[0].endsWith('/') && file.endsWith('index.html')) {
      res.writeHead(301, { Location: req.url.split('?')[0] + '/' });
      return res.end();
    }
    const type = TYPES[path.extname(file)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    if (watch && type.startsWith('text/html')) {
      return res.end(fs.readFileSync(file, 'utf8').replace('</body>', `${RELOAD}</body>`));
    }
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => console.log(`\n  Daily Digest running at http://localhost:${PORT}\n`));

if (watch) {
  let timer;
  const onChange = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      build();
      for (const c of clients) c.write('data: reload\n\n');
    }, 100);
  };
  for (const dir of ['src', 'content']) fs.watch(path.join(root, dir), { recursive: true }, onChange);
}
