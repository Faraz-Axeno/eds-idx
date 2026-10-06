import { createPicture, moveInstrumentation } from '../../scripts/scripts.js';

const OPTION_CLASSES = [];
const MIN_MARQUEE_ITEMS = 4;
// heading -> copy swap, same timing as the source (1.4s cubic-bezier transition)
const STEP_MS = 1400;
// wheel events closer than this belong to one gesture (matches scripts/delayed.js)
const GESTURE_GAP_MS = 150;
const SWIPE_PX = 30;

function stripInstrumentation(el) {
  [el, ...el.querySelectorAll('*')].forEach((node) => {
    [...node.attributes]
      .filter(({ name }) => name.startsWith('data-aue-') || name.startsWith('data-richtext-'))
      .forEach(({ name }) => node.removeAttribute(name));
  });
}

/**
 * Source tile width: a nominal width in vh, stretched so a whole number of
 * gaps fits the strip (Swiper slidesPerView = viewport / nominal width).
 */
function sizeTiles(block) {
  const styles = getComputedStyle(block);
  const nominal = (parseFloat(styles.getPropertyValue('--mg-masonry-tile-vh')) * window.innerHeight) / 100;
  const gap = parseFloat(styles.getPropertyValue('--mg-masonry-gap')) || 0;
  const width = block.clientWidth;
  if (!(nominal > 0 && width > 0)) return;
  const perView = width / nominal;
  block.style.setProperty('--mg-masonry-tile', `${(width - gap * (perView - 1)) / perView}px`);
}

/**
 * Splits the section's intro content into greeting (eyebrow + logo), heading and copy
 * layers, so the heading and the copy can swap places inside the panel.
 * @returns {Element|null} the section when the split is possible
 */
function buildStage(block) {
  const section = block.closest('.section');
  const intro = section?.querySelector(':scope > .default-content-wrapper');
  if (!intro) return null;
  if (intro.querySelector(':scope > .mg-masonry-grid-stage')) return section;
  const heading = intro.querySelector(':scope > h1, :scope > h2, :scope > h3');
  if (!heading) return null;

  const children = [...intro.children];
  const at = children.indexOf(heading);
  const make = (name, nodes) => {
    const div = document.createElement('div');
    div.className = `mg-masonry-grid-${name}`;
    div.append(...nodes);
    return div;
  };
  const greeting = make('greeting', children.slice(0, at));
  const stage = make('stage', [
    make('heading', [heading]),
    make('text', children.slice(at + 1)),
  ]);
  intro.replaceChildren(greeting, stage);
  return section;
}

/**
 * Two-step panel like the source: the first scroll down inside the panel swaps the
 * heading for the copy, the next one leaves the panel. Scrolling up reverses it.
 */
function enableSteps(section) {
  const root = document.documentElement;
  let lockUntil = 0;
  let lastWheel = 0;
  let consuming = false;

  const step = () => section.dataset.masonryStep;
  const setStep = (value) => {
    section.dataset.masonryStep = value;
    lockUntil = performance.now() + STEP_MS;
  };
  const atPanel = () => Math.abs(section.getBoundingClientRect().top) < 2
    && !root.classList.contains('gsap-scrolling')
    && !document.querySelector('header .header.is-open');
  // the step a move in this direction leads to, or null when the page should scroll
  const target = (down) => {
    if (!atPanel()) return null;
    if (down && step() === 'heading') return 'text';
    if (!down && step() === 'text') return 'heading';
    return null;
  };

  setStep('heading');
  lockUntil = 0;

  window.addEventListener('wheel', (e) => {
    if (e.defaultPrevented || e.ctrlKey || !e.deltaY) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    const now = performance.now();
    const gap = now - lastWheel;
    lastWheel = now;
    // swallow the rest of the gesture (and its inertia) that triggered a step
    if (now < lockUntil || (consuming && gap < GESTURE_GAP_MS)) {
      e.preventDefault();
      return;
    }
    consuming = false;
    // the tail of a gesture that already moved the page must not also step
    if (gap < GESTURE_GAP_MS) return;
    const next = target(e.deltaY > 0);
    if (!next) return;
    e.preventDefault();
    consuming = true;
    setStep(next);
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest?.('input, textarea, select, [contenteditable]')) return;
    const down = ['ArrowDown', 'PageDown', ' '].includes(e.key) && !e.shiftKey;
    const up = ['ArrowUp', 'PageUp'].includes(e.key) || (e.key === ' ' && e.shiftKey);
    if (!down && !up) return;
    if (performance.now() < lockUntil && atPanel()) {
      e.preventDefault();
      return;
    }
    const next = target(down);
    if (!next) return;
    e.preventDefault();
    setStep(next);
  });

  let touchY = null;
  let holding = false; // this swipe swaps the layers: keep the page still until the finger lifts
  section.addEventListener('touchstart', (e) => {
    touchY = e.touches.length === 1 ? e.touches[0].clientY : null;
    holding = false;
  }, { passive: true });
  section.addEventListener('touchmove', (e) => {
    if (holding || (performance.now() < lockUntil && atPanel())) {
      e.preventDefault();
      return;
    }
    if (touchY === null) return;
    const dy = touchY - e.touches[0].clientY;
    if (!dy) return;
    const next = target(dy > 0);
    if (!next) return;
    e.preventDefault();
    if (Math.abs(dy) > SWIPE_PX) {
      setStep(next);
      holding = true;
    }
  }, { passive: false });

  // entry reveal once; back to the heading whenever the panel is left upwards
  new IntersectionObserver((entries) => {
    entries.forEach(({ isIntersecting, intersectionRatio, boundingClientRect }) => {
      if (isIntersecting && intersectionRatio >= 0.4) section.dataset.masonryEntered = 'true';
      if (!isIntersecting && boundingClientRect.top > 0) {
        section.dataset.masonryStep = 'heading';
        lockUntil = 0;
      }
    });
  }, { threshold: [0, 0.4] }).observe(section);
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const active = [...block.classList].filter((c) => OPTION_CLASSES.includes(c));
  block.dataset.options = active.join(' ');

  const list = document.createElement('ul');
  list.className = 'mg-masonry-grid-items';

  // Accept one row per image or one row with N image cells: flatten every picture in order.
  const rows = [...block.querySelectorAll(':scope > div')];
  let index = 0;
  rows.forEach((row) => {
    const cells = [...row.querySelectorAll(':scope > div')];
    const sources = cells.length ? cells : [row];
    sources.forEach((cell) => {
      cell.querySelectorAll('picture').forEach((picture) => {
        const img = picture.querySelector('img');
        if (!img) return;
        const li = document.createElement('li');
        li.className = 'mg-masonry-grid-item';
        // Keep UE instrumentation: row-level for item rows, cell-level for multi-cell rows.
        moveInstrumentation(cells.length > 1 ? cell : row, li);

        // each image renders at its own ratio inside the equal-width tile (object-fit: contain)
        const optimized = createPicture(img.src, img.alt, false, [
          { media: '(width >= 900px)', width: '800' },
          { width: '600' },
        ]);
        moveInstrumentation(img, optimized.querySelector('img'));
        li.append(optimized);
        list.append(li);
        index += 1;
      });
    });
  });

  block.dataset.count = index;
  block.style.setProperty('--mg-masonry-count', index);
  block.replaceChildren(list);

  // Continuous strip like the source: duplicate the set once so the loop is seamless.
  if (index >= MIN_MARQUEE_ITEMS) {
    [...list.children].forEach((item) => {
      const clone = item.cloneNode(true);
      stripInstrumentation(clone);
      clone.dataset.clone = 'true';
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('img').forEach((img) => { img.alt = ''; });
      list.append(clone);
    });
    block.dataset.marquee = 'true';
  }

  const section = buildStage(block);
  // the panel is 100svh tall, so it resizes with both viewport dimensions
  new ResizeObserver(() => sizeTiles(block)).observe(section || block);
  if (!section) return;
  // Universal Editor: keep everything visible and static so every field can be edited
  if (block.closest('[data-aue-resource]')) {
    section.dataset.masonryStep = 'static';
    return;
  }
  if (section.dataset.masonryStep) return;
  enableSteps(section);
}
