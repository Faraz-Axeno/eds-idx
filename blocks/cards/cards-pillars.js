// Cards "Pillars" style (About Us): one pillar per scroll step

import { attachToSnap, createGestureStepper } from '../../scripts/utils/gesture-stepper.js';
import { loadCSS } from '../../scripts/aem.js';
import { loadPillNav } from '../jsw-nav/pill-nav.js';

// the JSW page around the pillars: the Adobe Fonts kit with New Science, the JSW navigation
const FONT_KIT = 'https://use.typekit.net/qil0qom.css';

function loadFontKit() {
  if (document.querySelector(`link[href="${FONT_KIT}"]`)) return;
  const preconnect = document.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = 'https://use.typekit.net';
  preconnect.crossOrigin = '';
  const kit = document.createElement('link');
  kit.rel = 'stylesheet';
  kit.href = FONT_KIT;
  document.head.append(preconnect, kit);
}

// step lock: --pl-move in the CSS plus a little (the layout sets its own, e.g. Pillar Horizontal)
const STEP_MS = 1300;
const stepMs = (block) => {
  const move = parseFloat(getComputedStyle(block).getPropertyValue('--pl-move'));
  return Number.isFinite(move) ? move * 1000 + 100 : STEP_MS;
};
// pillars authors may add
const CARDS_MAX = 6;
const IMAGE_TYPES = ['jpg', 'jpeg', 'png'];

/**
 * Builds an alert shown to authors on the canvas.
 * @param {string} text
 * @returns {HTMLParagraphElement}
 */
function note(text) {
  const p = document.createElement('p');
  p.className = 'pl-note';
  p.setAttribute('role', 'alert');
  p.textContent = text;
  return p;
}

/**
 * Whether a card's media cell holds a JPG or PNG image. A video or other
 * asset arrives as a link instead of a picture. Image URLs without an
 * extension (renditions, Dynamic Media) are let through.
 * @param {Element} li the card
 * @returns {boolean}
 */
function hasValidImage(li) {
  if (li.children.length < 2) return true;
  const cell = li.firstElementChild;
  const img = cell.querySelector('picture img');
  if (!img) return !cell.textContent.trim() && !cell.querySelector('a, video');
  const file = new URL(img.src, window.location.href).pathname.split('/').pop();
  const ext = file.includes('.') ? file.split('.').pop().toLowerCase() : '';
  return !ext || IMAGE_TYPES.includes(ext);
}

/**
 * Classes the label, heading and description of a card.
 * @param {Element} li the card
 */
function classCard(li) {
  const body = li.querySelector('.card-body');
  if (!body) return;
  let seenHeading = false;
  body.querySelectorAll('p, h1, h2, h3, h4, h5, h6').forEach((el) => {
    if (el.tagName !== 'P') {
      if (!seenHeading) el.classList.add('pl-title');
      seenHeading = true;
      return;
    }
    // before the heading: label; after it: description
    el.classList.add(seenHeading ? 'pl-desc' : 'pl-label');
  });
}

// wheel events further apart than this start a new gesture; a swipe this long (px) counts
const GESTURE_GAP_MS = 200;
const HOLD_QUIET_MS = 400;
const SWIPE = 24;

/**
 * a section's top on the screen where the page's layout puts it, leaving out a shift on the
 * section itself (the Timeline style above slides it, cards-timeline.js --tl-reveal-y, so it
 * looks in place while the page is still on its way)
 * @param {Element} section
 * @returns {number}
 */
function layoutTop(section) {
  const shift = new DOMMatrixReadOnly(getComputedStyle(section).transform).m42;
  return section.getBoundingClientRect().top - shift;
}

/**
 * the page's section stops (section tops and the page's end), as scripts/delayed.js glides to
 * @returns {number[]}
 */
function sectionStops() {
  const maxY = document.documentElement.scrollHeight - window.innerHeight;
  const stops = new Set([0, maxY]);
  document.querySelectorAll('main > .section').forEach((section) => {
    if (section.offsetHeight < 2) return;
    stops.add(Math.min(Math.round(layoutTop(section) + window.scrollY), maxY));
  });
  return [...stops].sort((a, b) => a - b);
}

/**
 * The site's own scroll (scripts/delayed.js) when the snap engine doesn't run. Only a gesture
 * over the image steps the pillars, one per gesture, while the section sits on the screen;
 * anywhere else, at the first / last pillar, or upward once the section was reached from the
 * section below, the gesture moves the page on to the previous / next section instead.
 * @param {Element} block the cards block
 * @param {number} count pillars
 * @param {function(number): void} show shows a pillar
 * @param {function(): number} current the pillar showing
 */
function imageZone(block, count, show, current) {
  const section = block.closest('.section');
  const zone = document.createElement('div');
  zone.className = 'pl-zone';
  zone.setAttribute('aria-hidden', 'true');
  block.append(zone);

  let busyUntil = 0;
  const busy = () => performance.now() < busyUntil;
  const play = (to) => {
    busyUntil = performance.now() + stepMs(block);
    show(to);
  };

  // reached from the section below (the page was further down): upward gestures pass on
  let wasBelow = false;
  let upwardPass = false;
  const settled = () => Math.abs(layoutTop(section)) <= 2;
  const track = () => {
    const top = layoutTop(section);
    if (top < -2) wasBelow = true;
    else if (top > 2) wasBelow = false;
    else upwardPass = wasBelow;
  };
  window.addEventListener('scroll', track, { passive: true });
  track();

  // a glide onto the section ends there: from the moment scripts/delayed.js eases the page in
  // until the wheel has rested for HOLD_QUIET_MS (a touchpad's momentum, or a mouse wheel
  // still turning, runs on past the glide), its wheel events are held back, so nothing reads
  // them as a new gesture (page or pillar step); if the browser scrolls on by itself meanwhile
  // (momentum it won't let be cancelled), the page is put back on the section
  const root = document.documentElement;
  let holding = false;
  let landed = false;
  let lastWheel = -Infinity;
  window.addEventListener('wheel', (e) => {
    const now = performance.now();
    const gap = now - lastWheel;
    lastWheel = now;
    const near = Math.abs(layoutTop(section)) <= window.innerHeight + 2;
    if (root.classList.contains('gsap-scrolling') && near && !settled()) {
      if (!holding) landed = false;
      holding = true;
    } else if (holding && gap > HOLD_QUIET_MS) {
      holding = false;
    }
    if (holding && settled() && !root.classList.contains('gsap-scrolling')) landed = true;
    if (holding) e.preventDefault();
  }, { capture: true, passive: false });
  window.addEventListener('scroll', () => {
    if (!holding || root.classList.contains('gsap-scrolling')) return;
    if (settled()) {
      landed = true;
      return;
    }
    if (landed) window.scrollTo({ top: layoutTop(section) + window.scrollY, behavior: 'instant' });
  }, { passive: true });

  // the pillar a gesture goes to, or null: it moves the page instead
  const stepFor = (dir) => {
    if (!settled()) return null;
    if (dir < 0 && upwardPass) return null;
    if (dir > 0) upwardPass = false;
    const to = current() + dir;
    return to >= 0 && to < count ? to : null;
  };

  // wheel: the first event of a gesture decides; the rest of it follows (stays with the
  // pillars, or with the page and scripts/delayed.js)
  let gesture = { last: -Infinity, stepped: false, passed: false };
  zone.addEventListener('wheel', (e) => {
    if (!e.deltaY || e.ctrlKey || holding) return;
    const now = performance.now();
    if (now - gesture.last > GESTURE_GAP_MS) gesture = { stepped: false, passed: false };
    gesture.last = now;
    if (gesture.passed) return;
    if (gesture.stepped || busy()) {
      e.preventDefault();
      return;
    }
    const to = stepFor(Math.sign(e.deltaY));
    if (to === null) {
      gesture.passed = true;
      return;
    }
    e.preventDefault();
    gesture.stepped = true;
    play(to);
  }, { passive: false });

  // touch: the zone has no native vertical panning (pillars.css), so a swipe that doesn't step
  // moves the page to the previous / next section itself
  const pageTo = (dir) => {
    const y = window.scrollY;
    const stops = sectionStops();
    const to = dir > 0 ? stops.find((st) => st > y + 2) ?? stops[stops.length - 1]
      : [...stops].reverse().find((st) => st < y - 2) ?? 0;
    window.scrollTo({ top: to, behavior: 'smooth' });
  };
  let start = null;
  let mode = null;
  let swiped = false;
  const swipe = (dy) => {
    if (swiped || mode !== 'v' || Math.abs(dy) < SWIPE) return;
    swiped = true;
    if (busy()) return;
    const dir = dy < 0 ? 1 : -1;
    const to = stepFor(dir);
    if (to === null) pageTo(dir);
    else play(to);
  };
  zone.addEventListener('touchstart', (e) => {
    start = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
    mode = null;
    swiped = false;
  }, { passive: true });
  zone.addEventListener('touchmove', (e) => {
    if (!start || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - start.x;
    const dy = e.touches[0].clientY - start.y;
    if (!mode) mode = Math.abs(dy) >= Math.abs(dx) ? 'v' : 'h';
    if (mode !== 'v') return;
    if (e.cancelable) e.preventDefault();
    swipe(dy);
  }, { passive: false });
  zone.addEventListener('touchend', (e) => {
    const touch = e.changedTouches[0];
    if (start && touch) swipe(touch.clientY - start.y);
    start = null;
  }, { passive: true });
}

/**
 * Decorates the Pillars style.
 * @param {Element} block the cards block
 * @param {HTMLUListElement} ul the card list
 */
export default function decoratePillars(block, ul) {
  const authoring = !!document.querySelector('[data-aue-resource]');
  loadFontKit();
  if (!authoring) {
    loadCSS(`${window.hlx.codeBasePath}/blocks/jsw-nav/pill-nav.css`);
    loadPillNav().then((nav) => block.prepend(nav)).catch(() => {});
  }
  [...ul.children].forEach((li) => {
    if (hasValidImage(li)) return;
    // Universal Editor can't restrict the asset type, so tell the author on
    // the card; on the site the card is left out
    if (authoring) {
      li.firstElementChild.className = 'card-image is-invalid';
      li.firstElementChild.prepend(note('Only JPG and PNG images are allowed. Replace this file with a .jpg or .png image.'));
    } else {
      li.remove();
    }
  });

  // Universal Editor can't cap the number of items either: warn the author,
  // and keep cards past the limit off the site
  if (authoring && ul.children.length > CARDS_MAX) {
    const extra = ul.children.length - CARDS_MAX;
    block.prepend(note(`Remove ${extra} card${extra === 1 ? '' : 's'}: Pillars takes at most ${CARDS_MAX} cards (now ${ul.children.length}).`));
  }
  if (!authoring) [...ul.children].slice(CARDS_MAX).forEach((li) => li.remove());

  const cards = [...ul.children];
  cards.forEach(classCard);

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (authoring || reduce || cards.length < 2) {
    block.classList.add('is-static');
    return;
  }

  // the corner marks around the text
  const frame = document.createElement('div');
  frame.className = 'pl-frame';
  frame.setAttribute('aria-hidden', 'true');

  // progress rail, one mark per pillar
  const rail = document.createElement('div');
  rail.className = 'pl-rail';
  const marks = cards.map((li, i) => {
    const mark = document.createElement('button');
    mark.type = 'button';
    mark.className = 'pl-mark';
    const label = li.querySelector('.pl-label')?.textContent.trim() || `Pillar ${i + 1}`;
    mark.setAttribute('aria-label', label);
    rail.append(mark);
    return mark;
  });

  // stack the images: first on top (vertical, each wipes up to the next), or last on top
  // (horizontal, each next one slides in over the current)
  const horizontal = block.classList.contains('pillar-horizontal');
  cards.forEach((li, i) => li.style.setProperty('--pl-z', horizontal ? i + 1 : cards.length - i));

  let active = 0;
  const show = (to) => {
    active = Math.max(0, Math.min(cards.length - 1, to));
    block.style.setProperty('--active', active);
    cards.forEach((li, i) => {
      li.classList.toggle('is-active', i === active);
      li.classList.toggle('is-before', i < active);
      li.classList.toggle('is-next', i === active + 1);
      li.setAttribute('aria-hidden', String(i !== active));
    });
    marks.forEach((mark, i) => {
      if (i === active) mark.setAttribute('aria-current', 'step');
      else mark.removeAttribute('aria-current');
    });
  };
  marks.forEach((mark, i) => mark.addEventListener('click', () => show(i)));

  block.classList.add('is-stepped');
  // let the snap engine treat the block as one screen, not an inner scroller
  block.dataset.snapPassthrough = '';
  block.append(frame, rail);
  show(0);

  // one scroll gesture, one pillar; plain list if the snap engine doesn't start
  let busyUntil = 0;
  const stepper = createGestureStepper({
    count: cards.length,
    current: () => active,
    play: (to) => {
      busyUntil = performance.now() + stepMs(block);
      show(to);
    },
    busy: () => performance.now() < busyUntil,
  });
  attachToSnap(block.closest('.section'), stepper, () => {
    block.classList.remove('is-stepped');
    block.classList.add('is-static');
    frame.remove();
    rail.remove();
    cards.forEach((li) => li.removeAttribute('aria-hidden'));
  });

  // no snap engine on the page (it marks the root snap-ready once started): the site's scroll
  const root = document.documentElement;
  const useSiteScroll = () => {
    if (root.classList.contains('snap-ready')) return;
    import('../../scripts/section-snap.js')
      .then((mod) => mod.unregisterBlockScroll(block.closest('.section')))
      .catch(() => {});
    imageZone(block, cards.length, show, () => active);
  };
  if (document.readyState === 'complete') window.setTimeout(useSiteScroll, 500);
  else window.addEventListener('load', () => window.setTimeout(useSiteScroll, 500), { once: true });
}
