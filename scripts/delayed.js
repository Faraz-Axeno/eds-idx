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

/** true when an open menu or an inner scroller under `target` takes a scroll by `deltaY` */
function scrollsInside(target, deltaY) {
  if (document.querySelector('header .header.is-open')) return true;
  for (let el = target; el && el !== document.body; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if (/(auto|scroll)/.test(overflowY) && el.scrollHeight > el.clientHeight) {
      const atTop = el.scrollTop <= 0;
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
      if ((deltaY < 0 && !atTop) || (deltaY > 0 && !atBottom)) return true;
    }
  }
  return false;
}

/** true when the wheel should stay native (zoom, sideways, open menu, inner scroller) */
function isNativeWheel(e) {
  if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || !e.deltaY) return true;
  return scrollsInside(e.target, e.deltaY);
}

/** the stop one gesture leads to: the next one down (dir 1) or up (dir -1) */
function nextStop(dir) {
  const y = window.scrollY;
  const stops = panelStops();
  return dir > 0
    ? stops.find((s) => s > y + 2) ?? stops[stops.length - 1]
    : [...stops].reverse().find((s) => s < y - 2) ?? 0;
}

/**
 * Wheel-driven panel scrolling with GSAP: each wheel gesture eases to the
 * next / previous full-viewport panel. On the JSW NEV page, touch swipes do the same
 * (phones and tablets have no wheel: a flick would otherwise race through the page).
 */
async function initSmoothScroll() {
  // the JSW NEV page always moves one stop per gesture (with reduced motion: without the glide)
  const stepped = document.body.classList.contains('jsw-phase-3');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced && !stepped) return;
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

  /** eases one stop down (dir 1) or up (dir -1) */
  const glide = (dir) => {
    if (tweening) return;
    const destY = nextStop(dir);
    if (Math.abs(destY - window.scrollY) < 2) return;

    tweening = true;
    // CSS snap / smooth-behaviour would fight the tween; the tween ends on a snap point
    root.classList.add('gsap-scrolling');
    gsap.to(window, {
      duration: reduced ? 0 : 1.8,
      scrollTo: { y: destY, autoKill: true, onAutoKill: done },
      ease: 'power2.inOut',
      overwrite: 'auto',
      onComplete: done,
      onInterrupt: done,
    });
  };

  window.addEventListener('wheel', (e) => {
    // already handled, e.g. by a panel's in-place step (mg-masonry-grid)
    if (e.defaultPrevented || isNativeWheel(e)) return;
    e.preventDefault();

    // one panel per gesture: ignore the rest of a trackpad/inertia burst
    const now = performance.now();
    const burst = now - lastWheel < 150;
    lastWheel = now;
    if (burst) return;
    glide(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  // a page's own controls can ask for the same glide, e.g. the JSW SCROLL button (jsw-hero)
  document.addEventListener('jsw:glide', (e) => {
    e.preventDefault();
    glide(e.detail < 0 ? -1 : 1);
  });

  if (!stepped) return;
  // touch: a vertical swipe glides one stop, like a wheel gesture, however fast it is.
  // The browser's own vertical panning (and its momentum fling) is switched off up front
  // (html.touch-panels: touch-action, styles/jsw-phase-3.css): real phones start scrolling
  // before a touchmove can be cancelled, so preventDefault alone is not enough there.
  // Taps, sideways swipes and pinch zoom stay native.
  root.classList.add('touch-panels');
  const SWIPE = 24; // px of finger travel that count as a swipe
  let start = null;
  let mode = null; // 'panel' | 'native', per gesture
  let swiped = false;
  const swipe = (dy) => {
    if (swiped || mode !== 'panel' || Math.abs(dy) < SWIPE) return;
    swiped = true;
    // finger up (dy < 0) moves the page down
    glide(dy < 0 ? 1 : -1);
  };
  window.addEventListener('touchstart', (e) => {
    start = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    mode = start ? null : 'native';
    swiped = false;
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (!start || mode === 'native' || e.touches.length !== 1) {
      mode = 'native';
      return;
    }
    const dx = e.touches[0].clientX - start.x;
    const dy = e.touches[0].clientY - start.y;
    if (!mode) {
      mode = Math.abs(dy) >= Math.abs(dx) && !scrollsInside(e.target, -dy) ? 'panel' : 'native';
    }
    if (mode !== 'panel') return;
    if (e.cancelable) e.preventDefault();
    swipe(dy);
  }, { passive: false });
  // a short, quick flick may end before travelling far enough on a move
  window.addEventListener('touchend', (e) => {
    const touch = e.changedTouches[0];
    if (start && touch) swipe(touch.clientY - start.y);
    start = null;
  }, { passive: true });
}

initSmoothScroll();
