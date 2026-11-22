// Section snap-scroll using GSAP Observer + ScrollToPlugin; skipped under prefers-reduced-motion.

import { loadScript } from './aem.js';
import { hasSectionStyle } from './utils/section-styles.js';

const VENDOR = `${window.hlx.codeBasePath}/scripts/vendor`;

// Blocks that consume gestures to step their own content before the page advances.
const blockScrollRegistry = new Map();

/**
 * Register a block's scroll controller: while canScrollDown/canScrollUp is true a gesture steps
 * the block instead of the page. Optional: isBusy() swallows gestures while a step animates;
 * hurryDown() is called for a downward gesture while busy; stopOffset() adds pixels below the
 * section top to its snap stop.
 * @param {Element} sectionEl The block's `.section` ancestor
 * @param {{canScrollDown: function, canScrollUp: function, scrollDown: function,
 *   scrollUp: function, isBusy?: function, hurryDown?: function, stopOffset?: function,
 *   destroy?: function}} controller
 */
export function registerBlockScroll(sectionEl, controller) {
  blockScrollRegistry.set(sectionEl, controller);
}

/**
 * Unregister a block's scroll controller, calling `destroy` if provided.
 * @param {Element} sectionEl The block's `.section` ancestor
 */
export function unregisterBlockScroll(sectionEl) {
  const controller = blockScrollRegistry.get(sectionEl);
  if (controller?.destroy) controller.destroy();
  blockScrollRegistry.delete(sectionEl);
}

// No ScrollTrigger: it cost ~1.8s of main-thread work on mobile for a refresh event the engine
// now takes from the window.
const GSAP_FILES = ['gsap.min.js', 'Observer.min.js', 'ScrollToPlugin.min.js'];

// gsap first, then the plugins that register onto it
async function loadGsap() {
  if (!window.gsap) await loadScript(`${VENDOR}/gsap.min.js`);
  await Promise.all([
    window.Observer ? Promise.resolve() : loadScript(`${VENDOR}/Observer.min.js`),
    window.ScrollToPlugin ? Promise.resolve() : loadScript(`${VENDOR}/ScrollToPlugin.min.js`),
  ]);
  return window.gsap;
}

/**
 * Downloads GSAP without running it while the page loads, so initSectionSnap doesn't wait on the
 * network and native scrolling unlocks sooner.
 */
export function preloadSectionSnap() {
  if (window.gsap) return;
  GSAP_FILES.forEach((file) => {
    const href = `${VENDOR}/${file}`;
    if (document.head.querySelector(`link[href="${href}"], script[src="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = href;
    document.head.append(link);
  });
}

/**
 * While GSAP loads, native scrolling is held by CSS (`html:not(.snap-ready)`); this records the
 * last gesture direction so it can be replayed once the engine is live.
 * @returns {{release: function(): number}} release() unlocks scrolling, returns the queued
 *   direction (1 = down, -1 = up, 0 = none)
 */
function guardScrollUntilReady() {
  const root = document.documentElement;

  let pending = 0;
  let touchStartY = null;
  const onWheel = (e) => {
    if (e.deltaY) pending = e.deltaY > 0 ? 1 : -1;
    e.preventDefault();
  };
  const onTouchStart = (e) => { touchStartY = e.touches[0]?.clientY ?? null; };
  const onTouchMove = (e) => {
    const y = e.touches[0]?.clientY;
    if (touchStartY !== null && y !== undefined && Math.abs(touchStartY - y) > 10) {
      pending = touchStartY > y ? 1 : -1;
    }
    e.preventDefault();
  };
  const onKeyDown = (e) => {
    if (e.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') pending = 1;
    else if (e.key === 'ArrowUp' || e.key === 'PageUp') pending = -1;
    else return;
    e.preventDefault();
  };

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('keydown', onKeyDown);

  return {
    release() {
      root.classList.add('snap-ready');
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKeyDown);
      return pending;
    },
  };
}

/**
 * Wire up section-by-section snapping with GSAP.
 * @param {Element} main The <main> element
 */
export default async function initSectionSnap(main) {
  const sections = [...main.querySelectorAll(':scope > .section')];
  if (sections.length < 2) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // not in Universal Editor: snapping fights authors scrolling the canvas
  if (document.querySelector('[data-aue-resource]')) return;

  const guard = window.gsap && window.Observer && window.ScrollToPlugin
    ? null
    : guardScrollUntilReady();

  let gsap;
  try {
    gsap = await loadGsap();
  } catch (err) {
    guard?.release(); // never leave the page stuck without scroll
    throw err;
  }
  const { Observer, ScrollToPlugin } = window;
  if (!gsap || !Observer || !ScrollToPlugin) {
    guard?.release();
    return;
  }
  gsap.registerPlugin(Observer, ScrollToPlugin);

  const footer = document.querySelector('footer');
  // the footer's scroll-margin-top (footer.css): stopping at the footer's top, the page stops
  // this far above it so the footer's content starts below the fixed header
  const footerRoom = () => (footer ? parseFloat(getComputedStyle(footer).scrollMarginTop) || 0 : 0);

  // each section top, plus one final stop for the footer
  const getStops = () => {
    const stops = sections.map((section) => section.offsetTop
      + (blockScrollRegistry.get(section)?.stopOffset?.() ?? 0));
    if (footer && footer.offsetHeight > 0) {
      const vh = window.innerHeight;
      const footerBottom = footer.offsetTop + footer.offsetHeight;
      const footerTarget = Math.min(footer.offsetTop - footerRoom(), footerBottom - vh);
      stops.push(Math.max(footerTarget, stops[stops.length - 1]));
    }
    return stops;
  };

  // .scroll-runway sections scroll natively while they fill the screen; crossing either edge
  // hands back to the snap
  const runways = sections.filter((section) => section.classList.contains('scroll-runway'));
  const runwayEnd = (section) => section.offsetTop + section.offsetHeight - window.innerHeight;

  // A footer that doesn't fit below the header reads like a runway: from its stop (its top,
  // clear of the header) it scrolls natively to the end of the page, and scrolling back up past
  // that stop snaps to the last section. A footer that fits keeps its single stop.
  const footerIndex = sections.length;
  const footerTall = () => !!footer
    && footer.offsetHeight + footerRoom() > window.innerHeight + 1;
  const activeRunways = () => (footerTall() ? [...runways, footer] : runways);
  // where a runway starts: a section's top, or the footer's stop
  const runwayTop = (el) => (el === footer ? footer.offsetTop - footerRoom() : el.offsetTop);
  // `y` is inside runway `el` (give or take `slack` px). The footer ends the page, so anything
  // past its end is still the footer: iOS reports positions past the end while the page
  // bounces there, and reading those as "left the footer" pulled the page back up to its top.
  const withinRunway = (el, y, slack) => y >= runwayTop(el) - slack
    && (el === footer || y <= runwayEnd(el) + slack);

  let index = 0;
  let animating = false;
  let inRunway = false;

  // iOS/iPadOS 26 Safari draws page content behind its translucent bars, outside the svh box a
  // section fills, so neighbouring sections showed there. `.bar-cover` (styles.css) is kept on
  // the visible area in the same frame as every scroll step; its black strips sit only behind
  // the bars. iPhone/iPad only.
  const BAR_COVER_ABOVE = 150; // px, taller than any status bar / top address bar
  const BAR_COVER_BELOW = 200; // px, taller than any floating address bar area
  const barCover = CSS.supports('-webkit-touch-callout', 'none') ? document.createElement('div') : null;
  const placeBarCover = () => {
    if (!barCover) return;
    // The page's own end (the cover, absolutely placed, isn't counted in it). The cover never
    // goes past it: iOS reports positions past the end while the page bounces there, and a
    // cover moved that far made the page longer, so it could be scrolled on past the footer.
    const end = document.body.offsetHeight;
    const y = Math.min(Math.max(0, window.scrollY), Math.max(0, end - window.innerHeight));
    // No strip below once the page is at the footer (on its stop, or in it when it scrolls): the
    // footer runs to the page end with its own background, and with the browser's bar minimised
    // (the screen taller than the cover's 100svh) the strip lay over the footer's bottom links.
    const footerStop = footer
      ? Math.min(runwayTop(footer), footer.offsetTop + footer.offsetHeight - window.innerHeight)
      : Infinity;
    const inFooter = y >= footerStop - 1;
    const below = inFooter ? 0 : end - y - barCover.offsetHeight;
    barCover.style.setProperty('--bar-cover-y', `${y}px`);
    barCover.style.setProperty('--bar-cover-above', `${Math.max(0, Math.min(BAR_COVER_ABOVE, y))}px`);
    barCover.style.setProperty('--bar-cover-below', `${Math.max(0, Math.min(BAR_COVER_BELOW, below))}px`);
  };
  if (barCover) {
    barCover.className = 'bar-cover';
    barCover.setAttribute('aria-hidden', 'true');
    document.body.append(barCover);
    window.addEventListener('scroll', placeBarCover, { passive: true });
    window.addEventListener('resize', placeBarCover, { passive: true });
    placeBarCover();
  }

  // nearest stop to the current scroll position
  const syncIndex = () => {
    const stops = getStops();
    const y = window.scrollY;
    let nearest = 0;
    let best = Infinity;
    stops.forEach((top, i) => {
      const d = Math.abs(top - y);
      if (d < best) { best = d; nearest = i; }
    });
    index = nearest;
  };
  syncIndex();

  // a section can hold up navigation with `section.dataset.snapBusy = 'true'` (unused today)
  const isSectionBusy = () => sections[index]?.dataset.snapBusy === 'true';

  // the element a stop belongs to: a section, or the footer for the final stop
  const stopElement = (i) => sections[i] || footer;

  // `align` (anchor links) also re-aligns a page that arrived off-stop at the same section;
  // `motion` overrides the tween's duration/ease, and `motion.step` marks a one-section move
  const goTo = (target, align = false, motion = {}) => {
    const stops = getStops();
    const clamped = Math.min(Math.max(target, 0), stops.length - 1);
    if (animating || isSectionBusy()) return;
    if (clamped === index && !(align && Math.abs(window.scrollY - stops[clamped]) >= 2)) return;
    // stepping back up into a runway lands at its end, so it scrubs back from the last frame
    const y = motion.step && clamped < index && runways.includes(sections[clamped])
      ? runwayEnd(sections[clamped])
      : stops[clamped];
    const move = { from: stopElement(index), to: stopElement(clamped) };
    index = clamped;
    animating = true;
    document.dispatchEvent(new CustomEvent('snap:start', { detail: move }));
    // the Observer stays enabled through the tween so native scroll can't fight it
    gsap.to(window, {
      scrollTo: { y, autoKill: false },
      duration: motion.duration ?? 1.2,
      ease: motion.ease ?? 'power2.inOut',
      onUpdate: placeBarCover,
      onComplete: () => {
        animating = false;
        document.dispatchEvent(new CustomEvent('snap:end', { detail: move }));
      },
    });
  };

  // Trackpad/wheel momentum keeps firing after a step, which would read as a second gesture: stay
  // locked until wheel input has been quiet for QUIET_MS.
  const QUIET_MS = 200;
  const NEW_GESTURE_MIN = 10; // ignore the tiny deltas at the end of a momentum tail
  const NOTCH_MIN = 50; // a single mouse-wheel notch is ~100, well above any decayed tail
  let lastMag = 0;
  let lastNativeAt = -Infinity; // last wheel event handled by an inner scroller
  // A wheel delta that continues a momentum tail: smaller than the one before (small deltas may
  // repeat or jitter up by a pixel). Wheel notches repeat at full size, so they never are.
  const isDecaying = (mag, prev) => (mag < NOTCH_MIN ? mag <= prev + 1 : mag < prev);
  let locked = false;
  let unlockTimer;
  const armUnlock = () => {
    clearTimeout(unlockTimer);
    unlockTimer = setTimeout(() => { locked = false; }, QUIET_MS);
  };
  const lock = () => {
    locked = true;
    armUnlock();
  };

  // the mobile menu or a modal is open: the page behind it stays put
  const navOpen = () => document.documentElement.matches('.is-nav-open, .is-modal-open');

  // a gesture steps the current section's registered block first, while it has steps
  const handleDirection = (direction) => {
    if (animating || locked || navOpen()) return;
    lock();
    const controller = blockScrollRegistry.get(sections[index]);
    if (controller) {
      if (controller.isBusy?.()) {
        if (direction > 0) controller.hurryDown?.();
        return;
      }
      if (direction > 0 && controller.canScrollDown?.()) { controller.scrollDown(); return; }
      if (direction < 0 && controller.canScrollUp?.()) { controller.scrollUp(); return; }
    }
    goTo(index + direction, false, { step: true });
  };

  // Observer collapses a gesture into one onUp/onDown; the `animating` guard caps it to one step
  const observer = Observer.create({
    target: window,
    type: 'wheel,touch',
    wheelSpeed: -1,
    tolerance: 10,
    preventDefault: true,
    onUp: () => handleDirection(1),
    onDown: () => handleDirection(-1),
  });

  // a floating layer: fixed/absolute and clipped (replaced media excluded)
  const isFloatingLayer = (node) => {
    if (['IMG', 'VIDEO', 'CANVAS', 'OBJECT', 'EMBED'].includes(node.tagName)) return false;
    // blocks can opt their clipped, positioned content out (e.g. the social deck cards)
    if (node.closest('[data-snap-passthrough]')) return false;
    const style = getComputedStyle(node);
    return (style.position === 'fixed' || style.position === 'absolute') && style.overflowY !== 'visible';
  };

  // over a floating layer or a scrollable ancestor (either direction)
  const isSelfScrollable = (el) => {
    for (let node = el; node && node !== document.body; node = node.parentElement) {
      if (node.tagName === 'IFRAME') return true;
      if (isFloatingLayer(node)) return true;
      const oy = getComputedStyle(node).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight) {
        return true;
      }
    }
    return false;
  };

  // `node` scrolls and has room left to move in `direction` (1 = down, -1 = up)
  const canScrollFurther = (node, direction) => {
    const oy = getComputedStyle(node).overflowY;
    if (!(oy === 'auto' || oy === 'scroll') || node.scrollHeight <= node.clientHeight) return false;
    const atTop = node.scrollTop <= 0;
    // -1 tolerates sub-pixel rounding at the bottom edge
    const atBottom = node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
    return direction > 0 ? !atBottom : !atTop;
  };

  // 'native' (leave it to a scrollable node), 'swallow' (floating layer), or null
  const resolveGesture = (el, direction) => {
    for (let node = el; node && node !== document.body; node = node.parentElement) {
      if (node.tagName === 'IFRAME') return { mode: 'native', node }; // its scroll can't be read
      if (canScrollFurther(node, direction)) return { mode: 'native', node };
      if (isFloatingLayer(node)) return { mode: 'swallow' };
    }
    return null;
  };

  // independent reasons to keep the Observer off, so clearing one can't re-enable it early
  let overOverlay = false;
  let selecting = false;
  let mouseDown = false;
  let inHorizontalWheel = false;
  let inFreeWheel = false;
  let freeWheelTimer;

  // "No Snap" sections scroll natively, in and out. Inside one the Observer is off; on a snapping
  // stop next to one, a gesture towards it is left to the browser (boundaryFree) while a gesture
  // the other way still snaps.
  const noSnapSections = sections.filter((section) => section.classList.contains('no-snap')
    && !section.classList.contains('scroll-runway'));
  const noSnapVisible = new Set();

  // A snapping section of text only (no block, no section style with its own layout, not No Snap
  // or a runway) whose text is taller than the screen below the header: the text scrolls inside
  // the section, starting below the header (.has-text-scroll, styles.css)
  const textArea = (section) => section.querySelector(':scope > .default-content-wrapper');
  const textSections = sections.filter((section) => section.children.length === 1
    && textArea(section) && !noSnapSections.includes(section) && !runways.includes(section)
    && !hasSectionStyle(section));
  const navProbe = document.createElement('div');
  navProbe.style.cssText = 'position:absolute;visibility:hidden;height:var(--nav-offset)';
  // the text's own height, first element's top margin to last element's bottom margin (the
  // area's scrollHeight is never less than its own height once it scrolls)
  const textHeight = (area) => {
    const first = area.firstElementChild;
    const last = area.lastElementChild;
    if (!first) return 0;
    const margin = (el, side) => parseFloat(getComputedStyle(el)[side]) || 0;
    return last.getBoundingClientRect().bottom - first.getBoundingClientRect().top
      + margin(first, 'marginTop') + margin(last, 'marginBottom');
  };
  const fitText = () => {
    document.body.append(navProbe);
    const nav = navProbe.offsetHeight;
    navProbe.remove();
    textSections.forEach((section) => {
      const area = textArea(section);
      const on = section.classList.contains('has-text-scroll');
      // centred text taller than this would reach under the header
      const room = section.clientHeight - 2 * nav;
      const text = textHeight(area);
      // a little slack, so it can't flip back and forth right at the limit
      const tall = !blockScrollRegistry.has(section) && (on ? text > room - 8 : text > room);
      if (tall !== on) section.classList.toggle('has-text-scroll', tall);
    });
  };
  if (textSections.length) {
    let fitFrame = 0;
    const fitSoon = () => {
      cancelAnimationFrame(fitFrame);
      fitFrame = requestAnimationFrame(fitText);
    };
    const resized = new ResizeObserver(fitSoon);
    textSections.forEach((section) => {
      resized.observe(section);
      [...textArea(section).children].forEach((el) => resized.observe(el));
    });
    document.fonts?.ready.then(fitSoon);
    fitText();
    // entering one: its text from the top, or from the end when coming back up
    document.addEventListener('snap:start', ({ detail }) => {
      if (!detail?.to?.classList?.contains('has-text-scroll')) return;
      const area = textArea(detail.to);
      const fromBelow = detail.from && detail.from.offsetTop > detail.to.offsetTop;
      area.scrollTop = fromBelow ? area.scrollHeight : 0;
    });
  }
  // the current section's text scroll area, if it has one
  const currentTextArea = () => (sections[index]?.classList.contains('has-text-scroll')
    ? textArea(sections[index]) : null);

  // after scrolling out of a No Snap zone, the page is held on its stop for a moment so
  // momentum can't carry it on
  const EXIT_HOLD_MS = 500;
  let exitHoldUntil = 0;
  // resting on a stop whose neighbour in `direction` is a No Snap section, with no block owning
  // the gesture
  const boundaryFree = (direction) => {
    if (animating || inRunway || noSnapVisible.size > 0 || navOpen()
      || performance.now() < exitHoldUntil) return false;
    if (!noSnapSections.includes(sections[index + direction])) return false;
    const controller = blockScrollRegistry.get(sections[index]);
    if (controller?.isBusy?.()) return false;
    if (direction > 0 ? controller?.canScrollDown?.() : controller?.canScrollUp?.()) return false;
    return Math.abs(window.scrollY - getStops()[index]) < 2;
  };

  // Native user scrolling is off (html.snap-locked, styles.css) while the engine moves the page,
  // except in runways, No Snap sections and on a stop next to one.
  const html = document.documentElement;
  const syncLock = () => html.classList.toggle(
    'snap-locked',
    !inRunway && noSnapVisible.size === 0 && !boundaryFree(1) && !boundaryFree(-1),
  );
  document.addEventListener('snap:end', () => syncLock());
  const updateObserverState = () => {
    syncLock();
    if (overOverlay || selecting || mouseDown || inHorizontalWheel || inFreeWheel || inRunway
      || noSnapVisible.size > 0) {
      observer.disable();
    } else if (!observer.isEnabled) {
      // native scroll may have moved the page meanwhile: resync (not mid-tween)
      if (!animating) syncIndex();
      observer.enable();
    }
  };
  const setOverlayState = (next) => {
    if (next === overOverlay) return;
    overOverlay = next;
    updateObserverState();
  };

  // Inside a runway, wheel/trackpad input is applied here (preventDefault + scrollTo), not
  // natively: a gesture latched to native scroll can't be cancelled and would fight the snap
  // tween at the edge. Touch, keys and the scrollbar scroll natively and hand over at the edge.
  if (runways.length || footer) {
    const SMOOTH_MIN = 40; // wheel notches (~100px) glide; trackpad pixel deltas apply directly
    let lastY = window.scrollY;
    let runwayIndex = -1;
    let targetY = null;
    let glide = 0;

    const stopGlide = () => {
      cancelAnimationFrame(glide);
      glide = 0;
      targetY = null;
    };
    const handOver = (direction) => {
      stopGlide();
      inRunway = false;
      updateObserverState();
      // step from the runway, not from the stop updateObserverState resynced to
      index = runwayIndex;
      lock();
      const stops = getStops();
      const target = Math.min(Math.max(runwayIndex + direction, 0), stops.length - 1);
      const remaining = Math.abs(stops[target] - window.scrollY) / window.innerHeight;
      goTo(target, false, { duration: Math.min(1.2, Math.max(0.6, remaining * 1.2)) });
    };
    const glideStep = () => {
      const y = window.scrollY;
      const d = targetY - y;
      // The page scrolls in whole pixels, so a step under half a pixel rounds away: finish there,
      // or the glide never ends and keeps pulling the page back to its target.
      if (Math.abs(d * 0.2) < 0.5) {
        window.scrollTo(0, targetY);
        placeBarCover();
        stopGlide();
        return;
      }
      window.scrollTo(0, y + d * 0.2);
      placeBarCover();
      glide = requestAnimationFrame(glideStep);
    };

    window.addEventListener('wheel', (e) => {
      if (!inRunway || animating || e.ctrlKey || navOpen()) return;
      const section = stopElement(runwayIndex);
      const top = runwayTop(section);
      const end = runwayEnd(section);
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      if (e.cancelable) e.preventDefault();
      else return; // already latched natively (rare): left to the scroll listener
      const next = (targetY ?? window.scrollY) + delta;
      // the footer ends the page: past its end there is nothing to hand over to
      if (next > end + 1 && runwayIndex < footerIndex) { handOver(1); return; }
      if (next < top - 1 && runwayIndex > 0) { handOver(-1); return; }
      const clamped = Math.min(Math.max(next, top), end);
      if (!glide && Math.abs(delta) < SMOOTH_MIN) {
        window.scrollTo(0, clamped);
        placeBarCover();
        return;
      }
      targetY = clamped;
      if (!glide) glide = requestAnimationFrame(glideStep);
    }, { capture: true, passive: false });

    const onRunwayScroll = () => {
      const y = window.scrollY;
      const direction = y >= lastY ? 1 : -1;
      lastY = y;
      // A snap tween may pass through a runway's edge on its way out; read mid-tween, that
      // re-entered the runway and then handed over again, sometimes back up past it. Where the
      // tween lands is checked on snap:end instead.
      if (animating) return;
      const active = activeRunways().find((section) => withinRunway(section, y, 1));
      if (active) {
        runwayIndex = active === footer ? footerIndex : sections.indexOf(active);
        index = runwayIndex;
        if (!inRunway) {
          inRunway = true;
          updateObserverState();
        }
        return;
      }
      if (!inRunway || animating) return;
      // the footer shrank to fit the screen (e.g. a footer accordion closed): rest on its stop
      // rather than handing over to the section above
      if (runwayIndex === footerIndex && !footerTall()) {
        stopGlide();
        inRunway = false;
        updateObserverState();
        index = footerIndex;
        const stop = getStops()[footerIndex];
        if (Math.abs(window.scrollY - stop) >= 2) window.scrollTo({ top: stop, behavior: 'instant' });
        return;
      }
      handOver(direction);
    };
    window.addEventListener('scroll', onRunwayScroll, { passive: true });
    document.addEventListener('snap:end', onRunwayScroll);
    onRunwayScroll();

    // the footer changes height (it loads late, its accordion opens and closes): re-read
    // whether the page is in it, and settle a page left between stops onto the footer's stop
    if (footer) {
      new ResizeObserver(() => {
        if (animating) return;
        onRunwayScroll();
        // eslint-disable-next-line no-use-before-define
        if (!inRunway && index === footerIndex) realign();
      }).observe(footer);
    }
  }

  // The Observer preventDefaults every pointerdown, which blocks mouse drag-to-select: it is off
  // for the whole mouse press. A press on a draggable element (an <img>) ends in pointercancel,
  // not pointerup, so both clear it.
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    mouseDown = true;
    updateObserverState();
  }, { capture: true });
  const clearMouseDown = (e) => {
    if (e.pointerType !== 'mouse') return;
    mouseDown = false;
    updateObserverState();
  };
  document.addEventListener('pointerup', clearMouseDown, { capture: true });
  document.addEventListener('pointercancel', clearMouseDown, { capture: true });

  // Touch long-press-to-select: off from selectstart until the press ends (a selecting press ends
  // in pointercancel/touchcancel), with the next touchstart as a backstop.
  document.addEventListener('selectstart', () => {
    selecting = true;
    updateObserverState();
  });
  const clearSelecting = () => {
    if (!selecting) return;
    selecting = false;
    updateObserverState();
  };
  ['pointerup', 'pointercancel', 'touchend', 'touchcancel'].forEach((type) => {
    document.addEventListener(type, clearSelecting);
  });
  // capture, so the Observer is re-enabled before its own window listener sees this touch
  document.addEventListener('touchstart', clearSelecting, { capture: true, passive: true });

  // composedPath()[0], not .target: shadow-DOM panels retarget .target to their host
  const eventOrigin = (e) => (e.composedPath ? e.composedPath()[0] : e.target) || e.target;

  document.addEventListener('pointermove', (e) => setOverlayState(isSelfScrollable(eventOrigin(e))), { passive: true });
  document.addEventListener('touchstart', (e) => setOverlayState(isSelfScrollable(eventOrigin(e))), { capture: true, passive: true });
  // A sideways swipe always drifts vertically too, and the Observer would page on that drift.
  // The axis is decided from the first movement (capture phase, ahead of the Observer): a
  // sideways gesture is hidden from it and its native scroll cancelled, unless it starts on a
  // native horizontal scroller (e.g. the article carousel), which keeps its scroll.
  const AXIS_LOCK = 6; // px of travel before the axis is decided
  const VERTICAL_BIAS = 1.8; // vertical must beat horizontal by this factor to count as vertical
  const sidewaysScroller = (el) => {
    for (let node = el; node && node !== document.body; node = node.parentElement) {
      const ox = getComputedStyle(node).overflowX;
      if ((ox === 'auto' || ox === 'scroll') && node.scrollWidth > node.clientWidth) return node;
    }
    return null;
  };
  let zoneAxis = '';
  let zoneX = 0;
  let zoneY = 0;
  let zoneScroller = null;
  // this touch scrolls natively into a No Snap section (see boundaryFree)
  let zoneFree = false;
  let zoneFirstMove = false;
  // the vertical scroll area the touch started on (not a floating layer), and whether this
  // touch has paged the section because that area was already at its end
  const verticalScroller = (el) => {
    for (let node = el; node && node !== document.body; node = node.parentElement) {
      if (node.tagName === 'IFRAME' || isFloatingLayer(node)) return null;
      const oy = getComputedStyle(node).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && node.scrollHeight > node.clientHeight) return node;
    }
    return null;
  };
  let zoneVScroller = null;
  let zonePaged = false;
  window.addEventListener('touchstart', (e) => {
    zoneAxis = '';
    zoneScroller = null;
    zoneVScroller = null;
    zoneFree = false;
    zonePaged = false;
    zoneFirstMove = true;
    if (e.touches.length !== 1) return;
    zoneX = e.touches[0].clientX;
    zoneY = e.touches[0].clientY;
    zoneScroller = sidewaysScroller(eventOrigin(e));
    zoneVScroller = verticalScroller(eventOrigin(e));
  }, { capture: true, passive: true });
  window.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 1) return;
    if (zoneFree) { e.stopPropagation(); return; }
    if (zonePaged) {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
      return;
    }
    const towards = zoneY > e.touches[0].clientY ? 1 : -1; // finger up = page down
    // Next to a No Snap section native scroll isn't locked, and the browser commits on the first
    // uncancelled move: cancel it unless it heads into the No Snap section.
    if (zoneFirstMove) {
      zoneFirstMove = false;
      const onBoundary = boundaryFree(1) || boundaryFree(-1);
      if (onBoundary && !boundaryFree(towards) && !zoneScroller && e.cancelable) e.preventDefault();
    }
    if (!zoneAxis) {
      const dx = Math.abs(e.touches[0].clientX - zoneX);
      const dy = Math.abs(e.touches[0].clientY - zoneY);
      if (dx < AXIS_LOCK && dy < AXIS_LOCK) { e.stopPropagation(); return; }
      zoneAxis = dy > dx * VERTICAL_BIAS ? 'y' : 'x';
      // a vertical swipe into a No Snap section: left to the browser
      if (zoneAxis === 'y' && boundaryFree(towards)) {
        zoneFree = true;
        e.stopPropagation();
        return;
      }
      // a swipe on a scroll area already at its end that way pages on, as the wheel does (the
      // Observer is off over a scroll area, so it would never see it)
      if (zoneAxis === 'y' && zoneVScroller && overOverlay
        && !canScrollFurther(zoneVScroller, towards)) {
        zonePaged = true;
        e.stopPropagation();
        if (e.cancelable) e.preventDefault();
        handleDirection(towards);
        return;
      }
    }
    if (zoneAxis === 'x') {
      e.stopPropagation();
      if (e.cancelable && !zoneScroller) e.preventDefault();
    }
  }, { capture: true, passive: false });

  // not passive: the 'swallow' case calls preventDefault() directly
  document.addEventListener('wheel', (e) => {
    // A mostly sideways wheel (a trackpad drifts vertically too) is hidden from the Observer for
    // this one event, not stopped, so a block's own horizontal wheel handler still gets it.
    if (!(Math.abs(e.deltaY) > Math.abs(e.deltaX) * VERTICAL_BIAS) && e.deltaX) {
      inHorizontalWheel = true;
      updateObserverState();
      setTimeout(() => { inHorizontalWheel = false; updateObserverState(); }, 0);
      return;
    }
    const mag = Math.abs(e.deltaY);
    if (locked) {
      // momentum only decays, so after the tween a strong or growing delta is a new gesture
      if (!animating && mag >= NEW_GESTURE_MIN && (mag >= NOTCH_MIN || mag > lastMag * 1.5)) {
        clearTimeout(unlockTimer);
        locked = false;
      } else {
        armUnlock(); // momentum tail of the previous gesture: extend the lock
      }
    }
    const prevMag = lastMag;
    lastMag = mag;
    const direction = e.deltaY > 0 ? 1 : -1;
    const result = resolveGesture(eventOrigin(e), direction);
    const now = performance.now();
    if (result?.mode === 'native') {
      lastNativeAt = now;
      // an inner scroll (a long text, the register form) took this: the page isn't moving, so
      // the lock left from the step into this section has nothing left to absorb
      clearTimeout(unlockTimer);
      locked = false;
    }
    // Momentum from an inner scroll is swallowed while it dies away, so it can't carry the page
    // on by itself. Anything that isn't dying away (a new flick, a wheel notch, fingers still
    // pushing past the end) is a fresh gesture and moves on at once, with no pause needed.
    let isNativeTail = result === null && now - lastNativeAt < QUIET_MS;
    if (isNativeTail && !isDecaying(mag, prevMag)) {
      isNativeTail = false;
      lastNativeAt = -Infinity;
    }
    if (isNativeTail) lastNativeAt = now;
    setOverlayState(result !== null || isNativeTail);
    if (result?.mode === 'swallow' || isNativeTail) e.preventDefault();
    // Into a No Snap section from the stop next to it: hidden from the Observer until the wheel
    // goes quiet, so the browser scrolls it natively.
    if (result === null && !isNativeTail && !locked && boundaryFree(direction)) {
      inFreeWheel = true;
      updateObserverState();
      clearTimeout(freeWheelTimer);
      freeWheelTimer = setTimeout(() => { inFreeWheel = false; updateObserverState(); }, QUIET_MS);
    }
  }, { capture: true, passive: false });

  // keyboard paging; not in form fields, runways or No Snap sections (native scroll)
  const isFormField = (el) => el?.closest?.('input, textarea, select, [contenteditable="true"]');
  // Space (Shift+Space) pages too, unless it belongs to the focused control
  const usesSpace = (el) => el?.closest?.('button, a[href], summary, video, audio, [role="button"], [role="tab"], [role="checkbox"], [role="menuitem"]');
  const keyDirection = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) return 1;
    if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) return -1;
    return 0;
  };
  window.addEventListener('keydown', (e) => {
    if (isFormField(e.target) || inRunway || noSnapVisible.size > 0 || navOpen()) return;
    // into a No Snap section: the browser scrolls
    const keyDir = keyDirection(e);
    if (keyDir && boundaryFree(keyDir)) return;
    // text scrolling inside the current section reads on before the page moves
    const area = keyDir && !(e.key === ' ' && usesSpace(e.target)) ? currentTextArea() : null;
    if (area && canScrollFurther(area, keyDir)) {
      e.preventDefault();
      const step = e.key.startsWith('Arrow') ? 60 : area.clientHeight * 0.85;
      area.scrollBy({ top: keyDir * step, behavior: 'smooth' });
      return;
    }
    if (e.key === ' ' && !e.repeat && !usesSpace(e.target)) {
      e.preventDefault();
      handleDirection(e.shiftKey ? -1 : 1);
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); handleDirection(1); return; }
    if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); handleDirection(-1); return; }
    if (e.key === 'Home') { e.preventDefault(); goTo(0); return; }
    if (e.key === 'End') { e.preventDefault(); goTo(getStops().length - 1); }
  });

  // snap to an anchor's section; a target outside the sections (e.g. the footer) goes to the
  // last stop
  const snapToHash = (hash) => {
    if (!hash || hash === '#') return false;
    let target;
    try {
      target = document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch {
      target = document.getElementById(hash.slice(1));
    }
    if (!target) return false;
    const targetSection = target.closest('.section');
    const sectionIndex = targetSection ? sections.indexOf(targetSection) : -1;
    // in a No Snap section: jump straight there, to the section top if the target is on its
    // first screen, else to the target
    if (noSnapSections.includes(targetSection)) {
      const sectionTop = targetSection.offsetTop;
      const targetTop = target.getBoundingClientRect().top + window.scrollY;
      const top = targetTop - sectionTop < window.innerHeight ? sectionTop : targetTop;
      window.scrollTo({ top, behavior: 'instant' });
      index = sectionIndex;
      return true;
    }
    goTo(sectionIndex >= 0 ? sectionIndex : getStops().length - 1, true);
    return true;
  };

  // same-page anchor clicks: the snap drives the scroll, not the native jump
  document.addEventListener('click', (e) => {
    const link = e.target.closest?.('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || !href.includes('#')) return;
    let url;
    try {
      url = new URL(href, window.location.href);
    } catch {
      return;
    }
    if (url.pathname !== window.location.pathname || url.origin !== window.location.origin) return;
    if (!url.hash || url.hash === '#') return;
    // a hash whose target isn't on this page is left to the browser
    if (!document.getElementById(decodeURIComponent(url.hash.slice(1)))) return;
    e.preventDefault();
    if (url.hash !== window.location.hash) {
      window.history.pushState(null, '', url.hash);
    }
    snapToHash(url.hash);
  });

  window.addEventListener('hashchange', () => { snapToHash(window.location.hash); });

  // deep link / reload: settle on the hash's stop, and once more after late layout shifts
  if (window.location.hash) {
    snapToHash(window.location.hash);
    const realign = () => window.setTimeout(() => {
      if (!animating) snapToHash(window.location.hash);
    }, 300);
    if (document.readyState === 'complete') realign();
    else window.addEventListener('load', realign, { once: true });
  }

  // recompute after resize and layout shifts (the footer loads lazily, images settle by load)
  if (document.readyState !== 'complete') window.addEventListener('load', syncIndex, { once: true });
  window.addEventListener('resize', () => { syncIndex(); });

  // Instant re-align whenever the page rests off a stop the engine didn't put it on (find in
  // page, scroll restore, focus scrolling, a hash that matched nothing). Not while the page
  // scrolls on its own, nor while typing: iOS scrolls to keep the caret above the keyboard, and
  // pulling it back made the register form bounce (focusout re-aligns afterwards).
  const typingField = (el) => el?.closest?.('input:not([type="checkbox"], [type="radio"], [type="button"], [type="submit"]), textarea, select, [contenteditable="true"]');
  const engineIdle = () => {
    if (animating || inRunway || overOverlay || selecting || mouseDown || navOpen()
      || noSnapVisible.size > 0) return false;
    const y = window.scrollY;
    return !activeRunways().some((r) => withinRunway(r, y, 2));
  };
  // after leaving a text field: its section, held until the keyboard has closed (-1: none)
  let keyboardSection = -1;
  const restingOff = () => engineIdle() && !typingField(document.activeElement)
    && keyboardSection < 0;
  const jumpTo = (i) => {
    const top = getStops()[i];
    if (top === undefined) return;
    if (Math.abs(window.scrollY - top) >= 2) window.scrollTo({ top, behavior: 'instant' });
    index = i;
  };
  const realign = () => {
    if (!restingOff()) return;
    syncIndex();
    jumpTo(index);
  };
  // Which No Snap sections are on screen, read from the layout on every scroll (an
  // IntersectionObserver never fired again for a section starting at the viewport edge).
  const refreshNoSnap = () => {
    if (!noSnapSections.length) return;
    const wasIn = noSnapVisible.size > 0;
    let changed = false;
    noSnapSections.forEach((section) => {
      const { top, bottom } = section.getBoundingClientRect();
      const visible = top < window.innerHeight - 0.5 && bottom > 0.5;
      if (visible === noSnapVisible.has(section)) return;
      changed = true;
      if (visible) noSnapVisible.add(section);
      else noSnapVisible.delete(section);
    });
    // No Snap scrolls natively, so no black strips behind the bars there (styles.css)
    barCover?.classList.toggle('is-off', noSnapVisible.size > 0);
    if (wasIn && noSnapVisible.size === 0 && !animating && !inRunway) {
      // scrolled out of a No Snap zone: stop on the stop reached and hold there briefly
      syncIndex();
      jumpTo(index);
      lock();
      exitHoldUntil = performance.now() + EXIT_HOLD_MS;
      window.setTimeout(syncLock, EXIT_HOLD_MS + 20);
    }
    if (changed) updateObserverState();
    else syncLock();
  };
  window.addEventListener('scroll', refreshNoSnap, { passive: true });
  window.addEventListener('resize', refreshNoSnap, { passive: true });
  refreshNoSnap();

  window.addEventListener('hashchange', () => { window.setTimeout(realign, 50); });
  let restTimer = 0;
  window.addEventListener('scroll', () => {
    window.clearTimeout(restTimer);
    restTimer = window.setTimeout(realign, 150);
  }, { passive: true });
  window.addEventListener('pageshow', () => { window.setTimeout(realign, 0); });
  // focus moved outside the current section: jump to the section it is in (even a text field)
  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (!el?.closest || stopElement(index)?.contains(el)) return;
    let target = sections.findIndex((section) => section.contains(el));
    if (target < 0 && footer?.contains(el)) target = getStops().length - 1;
    if (target < 0) return;
    window.setTimeout(() => { if (engineIdle()) jumpTo(target); }, 0);
  });
  // leaving a text field closes the keyboard and iOS scrolls back: return to the field's own
  // section once that has settled (the nearest stop mid-way can be the next section)
  let settleTimer = 0;
  let maxTimer = 0;
  let holdUntil = 0;
  const releaseKeyboard = () => {
    clearTimeout(settleTimer);
    clearTimeout(maxTimer);
    const target = keyboardSection;
    if (target < 0) return;
    // a press or real text selection under way (a tap on text also fires selectstart, with
    // nothing selected): return once it has ended (up to 5s)
    const selected = selecting && !window.getSelection()?.isCollapsed;
    if ((selected || mouseDown) && performance.now() < holdUntil) {
      settleTimer = window.setTimeout(releaseKeyboard, 200);
      return;
    }
    keyboardSection = -1;
    // still typing (focus moved to another field, e.g. first → last name): keyboard stays open
    if (typingField(document.activeElement)) return;
    // not overOverlay: a touch on the form's own scroll area mustn't keep it off its stop
    if (!animating && !inRunway && !navOpen() && noSnapVisible.size === 0) jumpTo(target);
  };
  // waits until the screen has stopped resizing and scrolling for a moment, at most 1.2s
  const settleLater = (ms = 200) => {
    clearTimeout(settleTimer);
    settleTimer = window.setTimeout(releaseKeyboard, ms);
  };
  const onKeyboardMove = () => { if (keyboardSection >= 0) settleLater(); };
  window.visualViewport?.addEventListener('resize', onKeyboardMove);
  window.visualViewport?.addEventListener('scroll', onKeyboardMove);
  window.addEventListener('scroll', onKeyboardMove, { passive: true });
  // a swipe or link moves the page on purpose: drop the hold
  document.addEventListener('snap:start', () => {
    if (keyboardSection < 0) return;
    keyboardSection = -1;
    clearTimeout(settleTimer);
    clearTimeout(maxTimer);
  });
  document.addEventListener('focusout', (e) => {
    if (!typingField(e.target)) return;
    const section = sections.findIndex((s) => s.contains(e.target));
    // a field outside the sections (e.g. the footer): settle on the nearest stop as before
    if (section < 0) {
      window.setTimeout(realign, 300);
      return;
    }
    keyboardSection = section;
    holdUntil = performance.now() + 5000;
    settleLater(400);
    clearTimeout(maxTimer);
    maxTimer = window.setTimeout(releaseKeyboard, 1200);
  });

  // small public API: move one stop, or to a section (or its index)
  const stopIndex = (target) => {
    if (typeof target === 'number') return target;
    const i = sections.indexOf(target);
    return i >= 0 ? i : getStops().length - 1;
  };
  window.snap = {
    next: () => goTo(index + 1, false, { step: true }),
    prev: () => goTo(index - 1, false, { step: true }),
    goTo: (target) => goTo(stopIndex(target)),
    get current() { return stopElement(index); },
  };

  // Engine is live: give scrolling back and replay a gesture made while GSAP was loading.
  // `snap-active` tells gesture-stepping blocks the engine is driving.
  syncLock();
  document.documentElement.classList.add('snap-active');
  const queuedDirection = guard?.release();
  if (queuedDirection && !window.location.hash) handleDirection(queuedDirection);
}
