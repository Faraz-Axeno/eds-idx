// add delayed functionality here
import { loadScript } from './aem.js';

const GSAP_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js';
const SCROLL_TO_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollToPlugin.min.js';

/** scroll positions of the full-viewport panels (sections + footer), ascending */
function panelStops() {
  const maxY = document.documentElement.scrollHeight - window.innerHeight;
  const stops = new Set([0, maxY]);
  document.querySelectorAll('main > .section').forEach((section) => {
    const rect = section.getBoundingClientRect();
    if (rect.height < 2) return; // e.g. the fixed section indicator's host
    const top = Math.round(rect.top + window.scrollY);
    stops.add(Math.min(top, maxY));
    // only panels much taller than the viewport get a second stop at their bottom edge;
    // a few px of overflow must not cost an extra wheel gesture
    if (rect.height > window.innerHeight * 1.25) {
      stops.add(Math.min(top + Math.round(rect.height) - window.innerHeight, maxY));
    }
  });
  // blocks can add their own stops: data-scroll-stops="px,px" (offsets from their own top)
  document.querySelectorAll('main [data-scroll-stops]').forEach((el) => {
    const top = el.getBoundingClientRect().top + window.scrollY;
    el.dataset.scrollStops.split(',').map(Number).filter((n) => n > 0)
      .forEach((offset) => stops.add(Math.min(Math.round(top + offset), maxY)));
  });
  return [...stops].sort((a, b) => a - b);
}

/** true when the wheel should stay native (zoom, sideways, open menu, inner scroller) */
function isNativeWheel(e) {
  if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || !e.deltaY) return true;
  if (document.querySelector('header .header.is-open')) return true;
  for (let el = e.target; el && el !== document.body; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if (/(auto|scroll)/.test(overflowY) && el.scrollHeight > el.clientHeight) {
      const atTop = el.scrollTop <= 0;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBottom)) return true;
    }
  }
  return false;
}

/**
 * Wheel-driven panel scrolling with GSAP: each wheel gesture eases to the
 * next / previous full-viewport panel.
 */
async function initSmoothScroll() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // pages whose blocks drive scrolling themselves (e.g. a pinned ScrollTrigger) opt out
  if (document.body.dataset.nativeScroll) return;
  await loadScript(GSAP_SRC);
  await loadScript(SCROLL_TO_SRC);
  const { gsap, ScrollToPlugin } = window;
  if (!gsap || !ScrollToPlugin) return;
  gsap.registerPlugin(ScrollToPlugin);

  const root = document.documentElement;
  let tweening = false;
  let lastWheel = 0;
  const done = () => {
    tweening = false;
    root.classList.remove('gsap-scrolling');
  };

  window.addEventListener('wheel', (e) => {
    // already handled, e.g. by a panel's in-place step (mg-masonry-grid)
    if (e.defaultPrevented || isNativeWheel(e)) return;
    e.preventDefault();

    // one panel per gesture: ignore the rest of a trackpad/inertia burst
    const now = performance.now();
    const burst = now - lastWheel < 150;
    lastWheel = now;
    if (tweening || burst) return;

    const y = window.scrollY;
    const stops = panelStops();
    const destY = e.deltaY > 0
      ? stops.find((s) => s > y + 2) ?? stops[stops.length - 1]
      : [...stops].reverse().find((s) => s < y - 2) ?? 0;
    if (Math.abs(destY - y) < 2) return;

    tweening = true;
    // CSS snap / smooth-behaviour would fight the tween; the tween ends on a snap point
    root.classList.add('gsap-scrolling');
    gsap.to(window, {
      duration: 1.8,
      scrollTo: { y: destY, autoKill: true, onAutoKill: done },
      ease: 'power2.inOut',
      overwrite: 'auto',
      onComplete: done,
      onInterrupt: done,
    });
  }, { passive: false });
}

initSmoothScroll();
