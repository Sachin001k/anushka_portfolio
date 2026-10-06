// Full-screen menu
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

// "Copy link" share button on blog posts
document.querySelectorAll('[data-copy-link]').forEach((el) => {
  el.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      el.setAttribute('data-copied', '');
      setTimeout(() => el.removeAttribute('data-copied'), 1500);
    } catch {}
  });
});

// Join form: submit in the background and show a message instead of leaving the page
const joinForm = document.querySelector('.join-form');
if (joinForm) {
  const status = joinForm.querySelector('.join-form__status');
  const button = joinForm.querySelector('button[type="submit"]');
  joinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    button.disabled = true;
    status.textContent = 'Sending…';
    try {
      const res = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(joinForm)).toString(),
      });
      if (!res.ok) throw new Error(res.statusText);
      joinForm.reset();
      status.textContent = 'Thanks for submitting! We’ll be in touch soon.';
    } catch {
      status.textContent = 'Sorry, something went wrong. Please email anushkabahorey@gmail.com instead.';
    } finally {
      button.disabled = false;
    }
  });
}

// Click a gallery photo to view it large
const galleryLinks = document.querySelectorAll('a[data-lightbox]');
if (galleryLinks.length && 'HTMLDialogElement' in window) {
  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.innerHTML =
    '<button class="lightbox__close" type="button" aria-label="Close">×</button><img alt=""><p class="lightbox__caption"></p>';
  document.body.appendChild(dialog);
  const img = dialog.querySelector('img');
  const caption = dialog.querySelector('.lightbox__caption');
  dialog.querySelector('.lightbox__close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  galleryLinks.forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const thumb = a.querySelector('img');
      img.src = a.href;
      img.alt = thumb ? thumb.alt : '';
      caption.textContent = img.alt;
      dialog.showModal();
    });
  });
}
