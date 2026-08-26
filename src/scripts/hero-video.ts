/**
 * Loads the hero background video, but only when it is worth loading.
 *
 * The <video> ships with no src and preload="none" so a phone never downloads
 * 1.5 MB for something the layout hides. The source is attached only on large
 * screens, and never when the visitor has asked for reduced motion — they keep
 * the poster frame, which is a still from the same footage.
 */

const video = document.getElementById('hero-video') as HTMLVideoElement | null;

if (video) {
  const wideEnough = window.matchMedia('(min-width: 1024px)');
  const wantsMotion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // A metered or very slow connection is not worth spending on decoration.
  const conn = (navigator as any).connection;
  const cheapData = !conn?.saveData && !/2g/.test(conn?.effectiveType ?? '');

  let started = false;

  const start = () => {
    if (started || !wideEnough.matches || !wantsMotion || !cheapData) return;
    started = true;

    video.src = video.dataset.src ?? '';
    video.load();

    // Reveal only once frames exist, so it never flashes as a black block.
    video.addEventListener(
      'loadeddata',
      () => {
        video.dataset.ready = 'true';
      },
      { once: true }
    );

    // Autoplay can still be refused; a muted inline video is normally allowed,
    // and if it is not we simply keep showing the poster.
    void video.play().catch(() => {
      delete video.dataset.ready;
    });
  };

  // Wait for the page to settle so the video never competes with the fonts and
  // the first paint.
  if (document.readyState === 'complete') {
    start();
  } else {
    window.addEventListener('load', start, { once: true });
  }

  // Someone resizing a desktop window past the breakpoint should still get it.
  wideEnough.addEventListener('change', start);

  // Stop decoding while the tab is hidden.
  document.addEventListener('visibilitychange', () => {
    if (!started) return;
    if (document.hidden) video.pause();
    else void video.play().catch(() => {});
  });
}
