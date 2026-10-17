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
