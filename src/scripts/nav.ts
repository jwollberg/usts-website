/**
 * Mobile menu toggle.
 *
 * Lives in its own module rather than inline in Header.astro: Astro inlines
 * small scripts straight into the HTML, and the site's Content-Security-Policy
 * is `script-src 'self'` with no unsafe-inline. An inlined copy is silently
 * blocked in production. Importing a module forces Astro to emit a real file.
 */
const toggle = document.getElementById('menu-toggle');
  const menu = document.getElementById('mobile-menu');
  const iconOpen = document.querySelector('[data-icon-open]');
  const iconClose = document.querySelector('[data-icon-close]');

  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!open));
    toggle.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
    menu?.classList.toggle('hidden', open);
    iconOpen?.classList.toggle('hidden', !open);
    iconClose?.classList.toggle('hidden', open);
  });
