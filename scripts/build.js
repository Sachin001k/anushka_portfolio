// Builds the static site from src/ and content/ into dist/.
//
//   src/layout.html         page shell (head, header, menu, footer)
//   src/pages/*.html        one file per page, with front matter (title, nav, ...)
//   src/templates/*.html    blog list card + single post templates
//   content/blog/*.md       blog posts (front matter + Markdown)
//   src/assets/             css, js, images, pdfs — copied as-is
//   src/assets/galleries/   one folder per photo/document gallery (see {{gallery name}})
//
// Placeholders look like {{name}}. Partials are included with {{> name}}.
// {{gallery book-club}} renders every image/PDF in src/assets/galleries/book-club/.
// {{#if-gallery book-club}} … {{/if-gallery}} hides a whole section until that folder has files.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { marked } from 'marked';
import sizeOf from 'image-size';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'src');
const CONTENT = path.join(root, 'content');
const DIST = path.join(root, process.env.OUT_DIR || 'dist');
const GALLERIES = path.join(SRC, 'assets', 'galleries');
const DEV = Boolean(process.env.DEV);

const SITE = {
  name: 'Daily Digest',
  url: 'https://anushka-daily-digest.netlify.app', // change here if you move to your own domain
};

const NAV = [
  { key: 'home', label: 'Home', href: '/' },
  { key: 'cookbook', label: 'Cookbook', href: '/cookbook/' },
  { key: 'supper', label: 'Supper Stories', href: '/supper-stories/' },
  { key: 'research', label: 'Research', href: '/research/' },
  { key: 'blog', label: 'Blog', href: '/blog/' },
  { key: 'sessions', label: 'Sessions Conducted', href: '/sessions-conducted/' },
  { key: 'work', label: 'Work Experience', href: '/work-experience/' },
  { key: 'join', label: 'Join Us', href: '/join-us/' },
];

const read = (p) => fs.readFileSync(p, 'utf8');

const escapeHtml = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Replace {{key}} with values; unknown keys are left empty.
const fill = (tpl, data) => tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => (data[k] ?? ''));

const partials = Object.fromEntries(
  fs.readdirSync(path.join(SRC, 'partials')).map((f) => [path.basename(f, '.html'), read(path.join(SRC, 'partials', f))]),
);
const withPartials = (html) =>
  html
    .replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => partials[name] ?? '')
    // {{#if-gallery name}} … {{/if-gallery}} — the whole block is left out until that gallery has files
    .replace(/\{\{#if-gallery\s+([\w-]+)\s*\}\}([\s\S]*?)\{\{\/if-gallery\}\}/g, (_, name, block) =>
      DEV || galleryFiles(name).length ? block : (missingGalleries.add(name), ''),
    )
    .replace(/\{\{\s*gallery\s+([\w-]+)\s*\}\}/g, (_, name) => renderGallery(name));

// ---------- galleries ----------
// Every image or PDF dropped into src/assets/galleries/<name>/ shows up wherever
// {{gallery <name>}} is used, sorted by file name (prefix with 01-, 02- to control order).
// The file name doubles as the caption/alt text: "school-lor-cms.webp" → "School lor cms".
const IMAGE_EXT = new Set(['.webp', '.jpg', '.jpeg', '.png', '.gif', '.avif']);
const missingGalleries = new Set();

const SMALL_WORDS = new Set(['a', 'an', 'and', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']);
const UPPER_WORDS = new Set(['ngo', 'lor', 'barc', 'ppt', 'crest', 'cms', 'sis']);
const captionFrom = (file) =>
  path
    .basename(file, path.extname(file))
    .replace(/^(\d+[-_ ]+)+/, '') // ordering prefix like "01-"
    .split(/[-_ ]+/)
    .filter(Boolean)
    .map((w, i) =>
      UPPER_WORDS.has(w.toLowerCase())
        ? w.toUpperCase()
        : i > 0 && SMALL_WORDS.has(w.toLowerCase())
          ? w.toLowerCase()
          : w.charAt(0).toUpperCase() + w.slice(1),
    )
    .join(' ');

function galleryFiles(name) {
  const dir = path.join(GALLERIES, name);
  return fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((f) => !f.startsWith('.') && !f.endsWith('.thumb.webp'))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    : [];
}

function renderGallery(name) {
  const dir = path.join(GALLERIES, name);
  const files = galleryFiles(name);
  if (!files.length) {
    missingGalleries.add(name);
    return DEV
      ? `<p class="gallery-empty">No files yet — add them to <code>media/${name}/</code> and run <code>npm run images</code>.</p>`
      : '';
  }
  const items = files.map((f) => {
    const ext = path.extname(f).toLowerCase();
    const href = `/assets/galleries/${name}/${encodeURIComponent(f)}`;
    const caption = escapeHtml(captionFrom(f));
    if (IMAGE_EXT.has(ext)) {
      let dims = '';
      try {
        const { width, height } = sizeOf(fs.readFileSync(path.join(dir, f)));
        dims = ` width="${width}" height="${height}"`;
      } catch {}
      return `<a class="gallery__item" href="${href}" data-lightbox><img src="${href}" alt="${caption}" loading="lazy"${dims}></a>`;
    }
    if (ext === '.pdf') {
      const thumb = `${path.basename(f, ext)}.thumb.webp`;
      if (fs.existsSync(path.join(dir, thumb))) {
        const { width, height } = sizeOf(fs.readFileSync(path.join(dir, thumb)));
        return `<a class="gallery__pdf" href="${href}" target="_blank" rel="noopener"><img src="/assets/galleries/${name}/${encodeURIComponent(thumb)}" alt="" loading="lazy" width="${width}" height="${height}"><span class="gallery__pdf-label"><span class="gallery__doc-icon" aria-hidden="true">PDF</span>${caption}</span></a>`;
      }
      return `<a class="gallery__doc" href="${href}" target="_blank" rel="noopener"><span class="gallery__doc-icon" aria-hidden="true">PDF</span><span>${caption}</span></a>`;
    }
    return '';
  });
  return `<div class="gallery gallery--${name}">\n${items.join('\n')}\n</div>`;
}

// Add a content hash to the CSS/JS links (style.css?v=1a2b3c4d) so browsers fetch
// the new file after every change instead of using a cached old copy.
const assetVersion = (rel) =>
  crypto.createHash('md5').update(fs.readFileSync(path.join(SRC, 'assets', rel))).digest('hex').slice(0, 8);
const layout = withPartials(read(path.join(SRC, 'layout.html')))
  .replace('/assets/css/style.css', `/assets/css/style.css?v=${assetVersion('css/style.css')}`)
  .replace('/assets/js/main.js', `/assets/js/main.js?v=${assetVersion('js/main.js')}`);

function renderNav(active) {
  return NAV.map(
    (n) =>
      `<li${n.key === 'join' ? ' class="nav-cta"' : ''}><a href="${n.href}"${n.key === active ? ' aria-current="page"' : ''}>${n.label}</a></li>`,
  ).join('\n');
}

const sitemapUrls = [];

function writePage(urlPath, { title, description = '', nav = '', body, bodyClass = '' }) {
  const pagePath = urlPath ? `/${urlPath.replace(/\/$/, '')}/` : '/';
  if (!['/404/', '/thank-you/'].includes(pagePath)) sitemapUrls.push(pagePath);
  const html = fill(layout, {
    canonical: SITE.url + pagePath,
    siteUrl: SITE.url,
    title: escapeHtml(title),
    description: escapeHtml(description),
    nav: renderNav(nav),
    bodyClass,
    content: body,
    year: new Date().getFullYear(),
  });
  const out = path.join(DIST, urlPath, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
}

// ---------- dates (shown in India time, like the old site) ----------
const TZ = 'Asia/Kolkata';
function formatDate(iso, { short = false } = {}) {
  const d = new Date(iso);
  const sameYear =
    new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: TZ }).format(d) ===
    new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: TZ }).format(new Date());
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...(short && sameYear ? {} : { year: 'numeric' }),
    timeZone: TZ,
  }).format(d);
}

// ---------- blog ----------
function loadPosts() {
  const dir = path.join(CONTENT, 'blog');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const { data, content } = matter(read(path.join(dir, f)));
      const slug = path.basename(f, '.md');
      const words = content.split(/\s+/).length;
      return {
        ...data,
        slug,
        url: `/post/${slug}/`,
        readTime: data.readTime || `${Math.max(1, Math.round(words / 200))} min read`,
        html: marked.parse(content),
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function fileSize(publicPath) {
  try {
    const bytes = fs.statSync(path.join(SRC, publicPath)).size;
    return `${(bytes / 1e6).toFixed(2)}MB`;
  } catch {
    return '';
  }
}

function buildBlog(posts) {
  const cardTpl = read(path.join(SRC, 'templates', 'post-card.html'));
  const smallCardTpl = read(path.join(SRC, 'templates', 'post-card-small.html'));
  const postTpl = withPartials(read(path.join(SRC, 'templates', 'post.html')));
  const pdfTpl = read(path.join(SRC, 'templates', 'post-pdf.html'));

  const cardData = (p) => ({
    url: p.url,
    title: escapeHtml(p.title),
    excerpt: escapeHtml(p.excerpt),
    cover: p.cover,
    author: escapeHtml(p.author),
    initial: escapeHtml((p.author || 'A')[0]),
    date: formatDate(p.date, { short: true }),
    datetime: new Date(p.date).toISOString(),
    readTime: p.readTime,
  });

  const listHtml = posts.map((p) => fill(cardTpl, cardData(p))).join('\n');
  const blogPage = matter(read(path.join(SRC, 'pages', 'blog.html')));
  writePage('blog', {
    ...blogPage.data,
    body: withPartials(fill(blogPage.content, { posts: listHtml })),
  });

  for (const p of posts) {
    const recent = posts
      .filter((r) => r.slug !== p.slug)
      .slice(0, 3)
      .map((r) => fill(smallCardTpl, cardData(r)))
      .join('\n');
    const pdf = p.pdf
      ? fill(pdfTpl, { href: p.pdf, name: escapeHtml(p.pdfName || path.basename(p.pdf)), size: fileSize(p.pdf) })
      : '';
    const body = fill(postTpl, {
      ...cardData(p),
      date: formatDate(p.date),
      pdf,
      body: p.html,
      recent,
      shareUrl: encodeURIComponent(SITE.url + p.url),
      shareText: encodeURIComponent(p.title),
    });
    writePage(`post/${p.slug}`, {
      title: `${p.title} | ${SITE.name}`,
      description: p.excerpt,
      nav: 'blog',
      body,
    });
  }
}

// ---------- pages ----------
// src/pages/about.html → /about/, src/pages/sessions-conducted/my-sessions.html → /sessions-conducted/my-sessions/
function buildPages(dir = path.join(SRC, 'pages'), prefix = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      buildPages(path.join(dir, entry.name), `${prefix}${entry.name}/`);
      continue;
    }
    if (!entry.name.endsWith('.html') || (!prefix && entry.name === 'blog.html')) continue;
    const { data, content } = matter(read(path.join(dir, entry.name)));
    const name = path.basename(entry.name, '.html');
    const urlPath = name === 'index' ? prefix : `${prefix}${name}`;
    writePage(urlPath, { ...data, body: withPartials(content) });
    if (!prefix && name === '404') fs.copyFileSync(path.join(DIST, '404', 'index.html'), path.join(DIST, '404.html'));
  }
}

// ---------- assets ----------
function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue;
    const a = path.join(from, entry.name);
    const b = path.join(to, entry.name);
    entry.isDirectory() ? copyDir(a, b) : fs.copyFileSync(a, b);
  }
}

export function build() {
  const started = Date.now();
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  // The dev server serves src/assets directly, so it skips this (large PDFs) copy.
  if (!process.env.SKIP_ASSETS) copyDir(path.join(SRC, 'assets'), path.join(DIST, 'assets'));
  buildPages();
  const posts = loadPosts();
  buildBlog(posts);
  fs.writeFileSync(
    path.join(DIST, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls
      .map((u) => `  <url><loc>${SITE.url}${u}</loc></url>`)
      .join('\n')}\n</urlset>\n`,
  );
  fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`);
  console.log(`Built ${posts.length} posts + pages in ${Date.now() - started}ms → ${path.relative(root, DIST)}/`);
  if (missingGalleries.size) {
    console.log(`  Waiting for files in: ${[...missingGalleries].map((g) => `media/${g}/`).join(', ')}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) build();
