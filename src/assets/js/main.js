// The Daily Digest — site interactions.
// Everything here is progressive: the site works fully without JavaScript.

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('js');

// ---------- Full-screen menu (phones/tablets) ----------
(() => {
  const btn = document.querySelector('.site-header__menu-btn');
  const menu = document.getElementById('site-menu');
  if (!btn || !menu) return;
  const close = menu.querySelector('.site-menu__close');

  const setOpen = (open) => {
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    document.documentElement.classList.toggle('menu-open', open);
    (open ? close : btn).focus();
  };

  btn.addEventListener('click', () => setOpen(true));
  close.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) setOpen(false);
  });
})();

// ---------- Header shadow + back-to-top button + reading progress ----------
(() => {
  const header = document.querySelector('.site-header');
  const toTop = document.querySelector('.to-top');
  const article = document.querySelector('.post');
  let bar;
  if (article) {
    bar = document.createElement('div');
    bar.className = 'read-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
  }

  let ticking = false;
  const update = () => {
    const y = window.scrollY;
    header?.classList.toggle('is-scrolled', y > 10);
    if (toTop) toTop.hidden = y < 700;
    if (bar) {
      const start = article.offsetTop;
      const end = start + article.offsetHeight - window.innerHeight;
      const pct = Math.min(1, Math.max(0, (y - start) / Math.max(1, end - start)));
      bar.style.transform = `scaleX(${pct})`;
    }
    ticking = false;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true },
  );
  update();

  toTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
})();

// ---------- Reveal-on-scroll ----------
(() => {
  if (reduceMotion || !('IntersectionObserver' in window)) return;
  const selectors = [
    'main h1', 'main h2', '.hero__intro', '.hero__gallery img',
    '.impact__card', '.founder__text > *', '.head', '.heads__join',
    '.book__cover', '.book__text', '.feature', '.featured__more', '.partners__collage', '.partners__more',
    '.testimonial', '.gallery > *', '.paper__row', '.paper__kicker', '.paper__subtitle',
    '.session__photos', '.session-type', '.supper-about__text > *', '.supper-session > p',
    '.work__item > p', '.community__meta', '.community__what', '.what li', '.join-form', '.contact',
    '.post-card', '.press', '.post', '.mini-card', '.workshops-intro p', '.page-intro__lede',
  ];
  const els = document.querySelectorAll(selectors.join(','));
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  els.forEach((el) => {
    // Stagger siblings (cards in a row, gallery items…)
    const siblings = [...el.parentElement.children].filter((c) => c.matches(selectors.join(',')));
    const i = siblings.indexOf(el);
    el.style.setProperty('--reveal-delay', `${Math.min(i, 6) * 80}ms`);
    el.classList.add('reveal');
    io.observe(el);
  });
})();

// ---------- Count-up numbers (Impact section) ----------
(() => {
  const nums = document.querySelectorAll('.impact__num');
  if (!nums.length) return;
  const run = (el) => {
    const textNode = el.firstChild; // "350" (the "+" is in a <span>)
    const target = parseInt(textNode.textContent, 10);
    const width = textNode.textContent.trim().length; // keep leading zero: "03"
    if (reduceMotion || Number.isNaN(target)) return;
    const duration = 1400;
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      textNode.textContent = String(Math.round(target * eased)).padStart(width, '0');
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        run(entry.target);
        io.unobserve(entry.target);
      }
    },
    { threshold: 0.6 },
  );
  nums.forEach((n) => io.observe(n));
})();

// ---------- Photo viewer (galleries): arrows, keyboard, swipe ----------
(() => {
  const links = [...document.querySelectorAll('a[data-lightbox]')];
  if (!links.length || !('HTMLDialogElement' in window)) return;

  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.innerHTML = `
    <button class="lightbox__close" type="button" aria-label="Close">×</button>
    <button class="lightbox__nav lightbox__nav--prev" type="button" aria-label="Previous photo">‹</button>
    <figure class="lightbox__figure"><img alt=""><figcaption class="lightbox__caption"></figcaption></figure>
    <button class="lightbox__nav lightbox__nav--next" type="button" aria-label="Next photo">›</button>`;
  document.body.appendChild(dialog);
  const img = dialog.querySelector('img');
  const caption = dialog.querySelector('.lightbox__caption');
  const prev = dialog.querySelector('.lightbox__nav--prev');
  const next = dialog.querySelector('.lightbox__nav--next');

  let group = [];
  let index = 0;
  const show = (i) => {
    index = (i + group.length) % group.length;
    const a = group[index];
    const thumb = a.querySelector('img');
    img.classList.remove('is-loaded');
    img.onload = () => img.classList.add('is-loaded');
    img.src = a.href;
    img.alt = thumb ? thumb.alt : '';
    caption.textContent = `${img.alt}${group.length > 1 ? `  ·  ${index + 1} / ${group.length}` : ''}`;
    prev.hidden = next.hidden = group.length < 2;
  };

  links.forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      group = [...a.closest('.gallery').querySelectorAll('a[data-lightbox]')];
      show(group.indexOf(a));
      dialog.showModal();
      document.documentElement.classList.add('menu-open');
    });
  });
  dialog.addEventListener('close', () => document.documentElement.classList.remove('menu-open'));
  dialog.querySelector('.lightbox__close').addEventListener('click', () => dialog.close());
  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(index - 1);
    if (e.key === 'ArrowRight') show(index + 1);
  });
  let touchX = null;
  dialog.addEventListener('touchstart', (e) => (touchX = e.touches[0].clientX), { passive: true });
  dialog.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
    touchX = null;
  });
})();

// ---------- Blog search ----------
(() => {
  const input = document.querySelector('.blog-search input');
  const cards = [...document.querySelectorAll('.post-card')];
  const empty = document.querySelector('.blog-search__empty');
  const count = document.querySelector('.blog-search__count');
  if (!input || !cards.length) return;
  const setCount = (n) => {
    if (count) count.textContent = n === cards.length ? `${n} posts` : `${n} of ${cards.length} posts`;
  };
  setCount(cards.length);
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    cards.forEach((card) => {
      const match = !q || card.textContent.toLowerCase().includes(q);
      card.hidden = !match;
      if (match) shown++;
    });
    if (empty) empty.hidden = shown > 0;
    setCount(shown);
  });
})();

// ---------- "Copy link" share button on blog posts ----------
document.querySelectorAll('[data-copy-link]').forEach((el) => {
  el.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      el.setAttribute('data-copied', '');
      setTimeout(() => el.removeAttribute('data-copied'), 1500);
    } catch {}
  });
});

// ---------- Join form: submit in the background and show a message ----------
(() => {
  const form = document.querySelector('.join-form');
  if (!form) return;
  const status = form.querySelector('.join-form__status');
  const button = form.querySelector('button[type="submit"]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    button.disabled = true;
    status.textContent = 'Sending…';
    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form)).toString(),
      });
      if (!res.ok) throw new Error(res.statusText);
      form.reset();
      form.classList.add('is-sent');
      status.textContent = 'Thanks for submitting! We’ll be in touch soon.';
    } catch {
      status.textContent = 'Sorry, something went wrong. Please email anushkabahorey@gmail.com instead.';
    } finally {
      button.disabled = false;
    }
  });
})();

// ---------- In-site PDF viewer ----------
// Every link to a PDF on this site opens in a styled viewer (rendered with PDF.js)
// instead of the browser's own PDF screen. Pages load as you scroll, so even the
// 20 MB magazines start showing quickly. Falls back to a normal new tab on error.
(() => {
  const isSitePdf = (a) => {
    try {
      const u = new URL(a.href, location.href);
      return u.origin === location.origin && u.pathname.toLowerCase().endsWith('.pdf');
    } catch {
      return false;
    }
  };
  const links = [...document.querySelectorAll('a[href]')].filter(isSitePdf);
  if (!links.length || !('HTMLDialogElement' in window)) return;

  const PDFJS = '/assets/vendor/pdfjs/pdf.min.mjs';
  const WORKER = '/assets/vendor/pdfjs/pdf.worker.min.mjs';
  let pdfjsPromise;
  const loadPdfjs = () =>
    (pdfjsPromise ||= import(PDFJS).then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = WORKER;
      return lib;
    }));

  const dialog = document.createElement('dialog');
  dialog.className = 'pdfv';
  dialog.innerHTML = `
    <div class="pdfv__bar">
      <div class="pdfv__title"><span class="pdfv__badge" aria-hidden="true">PDF</span><span class="pdfv__name"></span></div>
      <div class="pdfv__controls">
        <span class="pdfv__pages" aria-live="polite"></span>
        <button type="button" class="pdfv__btn" data-act="out" aria-label="Zoom out">−</button>
        <span class="pdfv__zoom">100%</span>
        <button type="button" class="pdfv__btn" data-act="in" aria-label="Zoom in">+</button>
        <a class="pdfv__btn pdfv__btn--wide" data-act="download" download aria-label="Download PDF">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19h14"/></svg>
          <span>Download</span>
        </a>
        <button type="button" class="pdfv__btn pdfv__close" data-act="close" aria-label="Close">×</button>
      </div>
    </div>
    <div class="pdfv__body" tabindex="0">
      <div class="pdfv__status"><span class="pdfv__spinner" aria-hidden="true"></span><span class="pdfv__msg">Opening…</span></div>
      <div class="pdfv__pagesWrap"></div>
    </div>`;
  document.body.appendChild(dialog);

  const nameEl = dialog.querySelector('.pdfv__name');
  const pagesEl = dialog.querySelector('.pdfv__pages');
  const zoomEl = dialog.querySelector('.pdfv__zoom');
  const body = dialog.querySelector('.pdfv__body');
  const wrap = dialog.querySelector('.pdfv__pagesWrap');
  const status = dialog.querySelector('.pdfv__status');
  const msg = dialog.querySelector('.pdfv__msg');
  const dl = dialog.querySelector('[data-act="download"]');

  let doc = null;
  let loadingTask = null;
  let zoom = 1;
  let observer = null;
  let pageObserver = null;
  let currentHref = '';

  const titleFor = (a) => {
    const t =
      a.querySelector('.gallery__pdf-label, .post-pdf__name')?.textContent ||
      a.textContent ||
      decodeURIComponent(a.pathname.split('/').pop());
    return t.replace(/\s+/g, ' ').replace(/^PDF\s*/, '').replace(/(View|Download) PDF.*$/, '').replace(/\.pdf$/i, '').trim() || 'Document';
  };

  const baseWidth = () => Math.min(body.clientWidth - 32, 920);

  async function renderPage(slot) {
    if (slot.dataset.state) return;
    slot.dataset.state = 'rendering';
    const page = await doc.getPage(Number(slot.dataset.page));
    const unscaled = page.getViewport({ scale: 1 });
    const cssWidth = baseWidth() * zoom;
    const scale = cssWidth / unscaled.width;
    const viewport = page.getViewport({ scale: scale * Math.min(window.devicePixelRatio || 1, 2) });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    slot.style.width = `${cssWidth}px`;
    slot.style.aspectRatio = `${unscaled.width} / ${unscaled.height}`;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    slot.replaceChildren(canvas);
    slot.dataset.state = 'done';
  }

  function layoutPages(firstAspect) {
    observer?.disconnect();
    pageObserver?.disconnect();
    wrap.replaceChildren();
    const width = baseWidth() * zoom;
    for (let i = 1; i <= doc.numPages; i++) {
      const slot = document.createElement('div');
      slot.className = 'pdfv__page';
      slot.dataset.page = i;
      slot.style.width = `${width}px`;
      slot.style.aspectRatio = firstAspect;
      slot.innerHTML = `<span class="pdfv__pageNum">${i}</span>`;
      wrap.appendChild(slot);
    }
    observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && renderPage(e.target).catch(() => {})),
      { root: body, rootMargin: '800px 0px' },
    );
    pageObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) pagesEl.textContent = `Page ${visible.target.dataset.page} of ${doc.numPages}`;
      },
      { root: body, threshold: [0.25, 0.5, 0.75] },
    );
    wrap.querySelectorAll('.pdfv__page').forEach((s) => {
      observer.observe(s);
      pageObserver.observe(s);
    });
    zoomEl.textContent = `${Math.round(zoom * 100)}%`;
  }

  // Pre-rendered page images (made by `npm run images`) load much faster than the PDF itself.
  let pagesIndexPromise;
  const pagesIndex = () =>
    (pagesIndexPromise ||= fetch('/assets/pdf-pages.json')
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({})));

  function showImagePages(entry) {
    observer?.disconnect();
    pageObserver?.disconnect();
    wrap.replaceChildren();
    const width = baseWidth() * zoom;
    entry.sizes.forEach(([w, h], i) => {
      const slot = document.createElement('div');
      slot.className = 'pdfv__page';
      slot.dataset.page = i + 1;
      slot.style.width = `${width}px`;
      slot.style.aspectRatio = `${w} / ${h}`;
      const img = document.createElement('img');
      img.src = `${entry.dir}/${String(i + 1).padStart(3, '0')}.webp`;
      img.alt = `Page ${i + 1}`;
      img.decoding = 'async';
      if (i > 1) img.loading = 'lazy';
      img.onload = () => slot.classList.add('is-loaded');
      slot.append(img);
      wrap.appendChild(slot);
    });
    pageObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) pagesEl.textContent = `Page ${visible.target.dataset.page} of ${entry.pages}`;
      },
      { root: body, threshold: [0.25, 0.5, 0.75] },
    );
    wrap.querySelectorAll('.pdfv__page').forEach((el) => pageObserver.observe(el));
    zoomEl.textContent = `${Math.round(zoom * 100)}%`;
  }

  let imageEntry = null;

  async function open(a) {
    currentHref = a.href;
    nameEl.textContent = titleFor(a);
    dl.href = a.href;
    pagesEl.textContent = '';
    wrap.replaceChildren();
    status.hidden = false;
    msg.textContent = 'Opening…';
    zoom = 1;
    dialog.showModal();
    document.documentElement.classList.add('menu-open');
    body.scrollTop = 0;
    try {
      const entry = (await pagesIndex())[new URL(a.href).pathname];
      if (entry) {
        if (currentHref !== a.href) return;
        imageEntry = entry;
        status.hidden = true;
        pagesEl.textContent = `Page 1 of ${entry.pages}`;
        showImagePages(entry);
        return;
      }
      imageEntry = null;
      const pdfjs = await loadPdfjs();
      loadingTask = pdfjs.getDocument({ url: a.href, disableAutoFetch: true });
      loadingTask.onProgress = ({ loaded, total }) => {
        if (total && loaded < total) msg.textContent = `Loading… ${Math.round((loaded / total) * 100)}%`;
      };
      doc = await loadingTask.promise;
      if (currentHref !== a.href) return;
      const first = await doc.getPage(1);
      const v = first.getViewport({ scale: 1 });
      status.hidden = true;
      pagesEl.textContent = `Page 1 of ${doc.numPages}`;
      layoutPages(`${v.width} / ${v.height}`);
    } catch (err) {
      dialog.close();
      window.open(a.href, '_blank', 'noopener');
    }
  }

  function close() {
    observer?.disconnect();
    pageObserver?.disconnect();
    loadingTask?.destroy();
    doc = null;
    imageEntry = null;
    loadingTask = null;
    currentHref = '';
    wrap.replaceChildren();
  }

  links.forEach((a) => {
    a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // allow "open in new tab"
      e.preventDefault();
      open(a);
    });
    // start fetching the library as soon as someone shows intent
    a.addEventListener('pointerenter', pagesIndex, { once: true });
  });
  // …or quietly in the background once the page has finished loading
  window.addEventListener('load', () => (window.requestIdleCallback || setTimeout)(() => pagesIndex(), { timeout: 3000 }));

  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('menu-open');
    close();
  });
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.querySelector('[data-act="close"]').addEventListener('click', () => dialog.close());

  const setZoom = (z) => {
    if (!doc && !imageEntry) return;
    const ratio = body.scrollTop / Math.max(1, body.scrollHeight);
    zoom = Math.min(2.5, Math.max(0.5, Math.round(z * 100) / 100));
    const first = wrap.firstElementChild;
    if (imageEntry) showImagePages(imageEntry);
    else layoutPages(first?.style.aspectRatio || '3 / 4');
    body.scrollTop = ratio * body.scrollHeight;
  };
  dialog.querySelector('[data-act="in"]').addEventListener('click', () => setZoom(zoom + 0.25));
  dialog.querySelector('[data-act="out"]').addEventListener('click', () => setZoom(zoom - 0.25));
  dialog.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === '=' || e.key === '+')) { e.preventDefault(); setZoom(zoom + 0.25); }
    if ((e.metaKey || e.ctrlKey) && e.key === '-') { e.preventDefault(); setZoom(zoom - 0.25); }
  });
  let resizeTimer;
  window.addEventListener('resize', () => {
    if (!dialog.open || (!doc && !imageEntry)) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => setZoom(zoom), 200);
  });
})();
