# The Daily Digest

Anushka Bahorey's science and gut-health website. This repo replaces the old Wix site
(anushkabahorey.wixsite.com/daily-digest) with plain HTML/CSS/JS and a small Node build script.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:3000, rebuilds and reloads on every save
npm run build      # writes the finished site to dist/
```

Requires Node 18 or newer.

## Where things live

| What | Where |
|---|---|
| Pages | `src/pages/*.html` (sub-pages in folders, e.g. `src/pages/sessions-conducted/`) |
| Photo & document galleries | `src/assets/galleries/<name>/`, filled by `npm run images` |
| Blog posts | `content/blog/*.md` |
| Header, menu, footer | `src/partials/` |
| Page shell (`<head>`, fonts) | `src/layout.html` |
| Blog list card, post page | `src/templates/` |
| All styling | `src/assets/css/style.css` |
| Menu, form and share-button JS | `src/assets/js/main.js` |
| Images / PDFs | `src/assets/images/`, `src/assets/files/` |
| Build, dev server, image tool | `scripts/build.js`, `scripts/dev.js`, `scripts/images.js` |

Each page in `src/pages/` starts with a short header:

```html
---
title: About Us | Daily Digest
description: Shown in Google results and link previews.
nav: about          # highlights this item in the menu
---
```

The file name becomes the URL: `about.html` → `/about/`, `index.html` → `/`.

Pages: Home, Cookbook, Supper Stories, Research, Blog, Sessions Conducted (with sub-pages
*Sessions I Conducted* and *Sessions by Our Community*), Work Experience, Join Us.
To change the menu, edit `NAV` at the top of `scripts/build.js`.

## Adding photos, certificates and letters (galleries)

Several sections show every file in a folder, so you never need to edit HTML to add photos:

1. Put the original files (JPG, PNG, iPhone HEIC or PDF) in a folder inside `media/`:

   | Folder | Shows up on |
   |---|---|
   | `media/book-club/` | Cookbook → Book Club Sessions |
   | `media/supper-stories-may-2026/` | Supper Stories → 3 May 2026 (Aam Panna) |
   | `media/supper-stories-july-2026/` | Supper Stories → 12 July 2026 (Jaggery Bites) |
   | `media/community-sessions/` | Sessions Conducted → Sessions by Our Community |
   | `media/resources/` | Sessions Conducted → Resources Used (PPTs etc.) |
   | `media/certificates/` | Sessions Conducted → Certificates & Letters of Recommendation |
   | `media/doctor-validations/` | Sessions Conducted → Validated By Doctors |
   | `media/work-ajanta/` | Work Experience → Ajanta Pharma letter of recommendation |
   | `media/work-barc/` | Work Experience → BARC letter of recommendation |
   | `media/press/` | Blog → Published in Print (the Powai magazine PDF) |

2. Run `npm run images`. Photos are resized and saved as WebP in `src/assets/galleries/<folder>/`,
   and PDFs are copied as-is. The `media/` folder isn't committed; only the optimised copies are.
3. Files are shown in name order, and the name becomes the caption:
   `01-ngo-certificate-vidya.jpg` → "Ngo certificate vidya". Rename the files to control order and captions.

Sections whose folder is empty are hidden on the live site. `npm run dev` shows a dashed placeholder
there instead, so you can see where things will go. To add a gallery to another page, write
`{{gallery my-folder}}` in the page HTML.

## Adding a blog post

1. Create `content/blog/my-new-post.md` (the file name becomes `/post/my-new-post/`):

   ```markdown
   ---
   title: "My New Post"
   date: "2026-10-06T10:00:00Z"
   author: "Anushka Bahorey"
   readTime: "3 min read"
   cover: "/assets/images/blog/my-new-post.webp"
   excerpt: "One or two sentences shown on the blog page."
   pdf: "/assets/files/newsletters/october-2026.pdf"   # optional
   pdfName: "October 2026.pdf"                          # optional
   ---

   Write the post here in Markdown. **Bold**, _italic_, ## headings, - lists,
   and images: ![description](/assets/images/blog/my-image.webp)
   ```

2. Put the cover image in `src/assets/images/blog/`. Use WebP or JPG, about 1400px wide.
3. Run `npm run dev` to preview it. Posts are sorted newest first by `date`.

## Deploying (Netlify, free)

1. Push this repo to GitHub.
2. On [netlify.com](https://app.netlify.com), choose **Add new site → Import an existing project** and pick the repo.
   `netlify.toml` already sets the build command (`npm run build`) and publish folder (`dist`).
3. The site goes live at `something.netlify.app`. You can rename it under **Site configuration → Change site name**,
   for example `daily-digest.netlify.app`. To use your own domain later, add it under **Domain management**.
4. Every push to `main` redeploys automatically.

### Join-our-community form

The form on the Join Us page uses **Netlify Forms**, so no extra service or code is needed.
After the first deploy:

- Submissions appear in Netlify under **Forms → community-head**.
- To get them by email, open **Forms → Form notifications → Add notification → Email notification**
  and enter `anushkabahorey@gmail.com`.

The form only works on the deployed Netlify site. Locally, it shows an error message when submitted.

### After moving

- Old Wix links keep working: `/research-hub` redirects to `/cookbook/` and `/about` to `/join-us/` (see `netlify.toml`).
- Update `SITE.url` in `scripts/build.js` to the new address so the blog share buttons link to the right place.
- The old Wix site and the PDFs hosted there are no longer needed. Everything is in this repo.

## Differences from the Wix version

- Fonts are free Google Fonts: Fraunces, Figtree, EB Garamond, Aboreto and Jost.
  The Wix fonts (Avenir, Adobe Caslon, Futura) are licensed to Wix and can't be reused.
  The replacements were matched against the original text widths.
- Blog view counts, likes and comments were Wix features and have been removed.
  The share buttons are kept.
- The Wix site had no real mobile layout. This version adapts to phones and tablets.
- Images are converted to WebP and resized: about 4 MB in total, down from roughly 130 MB of originals.
