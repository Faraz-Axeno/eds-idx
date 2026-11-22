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

// step lock: --pl-move in the CSS plus a little
const STEP_MS = 1300;
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

/**
 * The site's own scroll (scripts/delayed.js) when the snap engine doesn't run: the section
 * pins the block for one screen of scroll per pillar and stops a wheel glide at each, and the
 * pillar showing follows the scroll both ways.
 * @param {Element} block the cards block
 * @param {number} count pillars
 * @param {function(number): void} show shows a pillar
 * @param {function(): number} current the pillar showing
 * @returns {function(number): void} scrolls to a pillar
 */
function scrollRunway(block, count, show, current) {
  const section = block.closest('.section');
  const pin = block.parentElement;
  section.classList.add('pl-runway');
  section.style.setProperty('--pl-count', count);
  const screen = () => pin.clientHeight || window.innerHeight;
  const setStops = () => {
    section.dataset.scrollStops = Array.from({ length: count - 1 }, (_, i) => Math.round((i + 1) * screen())).join(',');
  };
  let frame = 0;
  const update = () => {
    frame = 0;
    const step = Math.round(-section.getBoundingClientRect().top / screen());
    const to = Math.max(0, Math.min(count - 1, step));
    if (to !== current()) show(to);
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  setStops();
  window.addEventListener('resize', () => {
    setStops();
    schedule();
  });
  window.addEventListener('scroll', schedule, { passive: true });
  update();
  return (i) => window.scrollTo({
    top: section.getBoundingClientRect().top + window.scrollY + i * screen(),
    behavior: 'smooth',
  });
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
  // scroll-linked (the site's own scroll), a mark scrolls to its pillar
  let goToStep = null;
  marks.forEach((mark, i) => mark.addEventListener('click', () => (goToStep ? goToStep(i) : show(i))));

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
      busyUntil = performance.now() + STEP_MS;
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
    goToStep = scrollRunway(block, cards.length, show, () => active);
  };
  if (document.readyState === 'complete') window.setTimeout(useSiteScroll, 500);
  else window.addEventListener('load', () => window.setTimeout(useSiteScroll, 500), { once: true });
}
