/*
 * collage: the "05 Events" frames, 1280 x 720 ("1 Engine", "2 Collage", "3 Statement"),
 * authored in the same section as the interactive-showcase block, after it. Both stay pinned
 * on the screen while the section scrolls through two screens of room, and a GSAP ScrollTrigger
 * timeline, locked to the scroll, plays:
 *   Sequence 1 - the showcase's selected engine image (its [data-zoom-source] figure) shrinks
 *     from where it sits into the centre card, the card forming around it, while the four other
 *     images slide in as two groups, the left pair from the left edge and the right pair from
 *     the right, straight along the horizontal, and assemble around it on a white card;
 *   Sequence 2 - one continuous vertical scroll, as on a page: the assembled cluster of five
 *     images moves up together as one fixed group and off the screen, and the heading and text,
 *     right beneath it, scroll up with it from below the screen into the centre.
 * Scrolling back plays it backwards. Wheel scrolling glides one sequence per gesture
 * (data-scroll-stops, scripts/delayed.js).
 * In Universal Editor, with reduced motion, or without GSAP, nothing moves: the collage and
 * the statement show one under the other.
 * Rows (model, _collage.json, as parallax-collage), told apart by what they are:
 *   heading and subtitle - the row with a heading (else the first text row without a picture)
 *   Collage Images (items) - image | its place in the design: center-engine, top-left,
 *                            top-right, bottom-left, bottom-right (one image a place)
 */

import { loadScript } from '../../scripts/aem.js';
import { moveInstrumentation, unwrapEditorRichtext } from '../../scripts/scripts.js';

// the file types the block's media accept, by the asset's extension (published images keep
// their file's: media_….jpg): an asset of another type is not shown, a console warning instead
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png']; // general images: backgrounds, photos

/** an asset's file extension, from its URL's path ('' when it has none) */
function extensionOf(url) {
  try {
    const name = new URL(url, window.location.href).pathname.split('/').pop();
    return name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  } catch (e) {
    return '';
  }
}

/**
 * whether an asset's file type is accepted for its field; if not, a warning (it is not shown)
 * @param {string} url the asset
 * @param {string[]} allowed the field's extensions (IMAGE_EXTENSIONS…)
 * @param {string} field the field, for the warning (e.g. 'background image')
 * @param {string} block the block, for the warning
 */
function acceptedType(url, allowed, field, block) {
  const ext = extensionOf(url);
  if (allowed.includes(ext)) return true;
  // eslint-disable-next-line no-console
  console.warn(`${block}: the ${field} ${url} is not shown: its file type (${ext ? `.${ext}` : 'none'}) is not .${allowed.join(', .')}`);
  return false;
}

/** a picture whose image is of an accepted file type for its field, else null (not shown) */
function acceptedPicture(picture, allowed, field, block) {
  const src = picture?.querySelector('img')?.getAttribute('src');
  if (!picture || !src) return picture || null;
  return acceptedType(src, allowed, field, block) ? picture : null;
}

const BLOCK = 'collage';

// the most characters each text shows on the page (room in the "3 Statement" frame's 734px
// column): a longer text, if saved anyway, is cut there with "…" (its whole wording as a
// tooltip); the editor shows every text whole
const TEXT_LIMITS = {
  heading: 60,
  text: 300,
};

// the same GSAP build as scripts/delayed.js and parallax-collage, downloaded once
const GSAP_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js';
const SCROLL_TRIGGER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js';

const ENGINE = 'center-engine';
const PLACES = [ENGINE, 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
// the place names authors pick from ("Place in the design", _collage.json), for the editor note
const PLACE_NAMES = ['Centre engine', 'Top left', 'Top right', 'Bottom left', 'Bottom right'];
// the most images the block holds: one per place in the design. Universal Editor filters cannot
// count, so once the block has MAX_IMAGES images it gets a filter that allows none
// (_collage.json: collage-full) and the editor offers no "Add" for another; below that it gets
// its own filter back (as interactive-showcase does)
const MAX_IMAGES = PLACES.length;
const ITEM_MODEL = 'collage-item';
const FILTERS = { open: 'collage', full: 'collage-full' };
// short names, and parallax-collage's first-screen places (content copied from it), work too
const ALIASES = {
  engine: ENGINE,
  center: ENGINE,
  centre: ENGINE,
  'centre-engine': ENGINE,
  'card-charger': 'top-left',
  'card-room': 'top-right',
  'card-bridge': 'bottom-left',
  'card-spring': 'bottom-right',
};

// the Figma frame the places are measured in (collage.css)
const FRAME = { width: 1280, height: 720 };
// the centre card in it ("2 Collage": 280 x 360 at 500, 180)
const CARD = {
  left: 500, top: 180, width: 280, height: 360,
};
// on screens narrower than the frame's shape (phones, upright tablets) the collage, 808 design
// px across (236 to 1044), keeps this much of the card's width
const NARROW_FRAME_WIDTH = 860;
// screens of scroll room: one per sequence (collage.css gives the room the same height)
const SEQUENCES = 2;
// Sequence 1: the side images slide in as two groups, each keeping its two images exactly as
// they sit together: the left pair (top-left, bottom-left) from the card's left edge, the right
// pair (top-right, bottom-right) from its right edge, straight along the horizontal (no y)
const SIDES = {
  'top-left': -1,
  'bottom-left': -1,
  'top-right': 1,
  'bottom-right': 1,
};
// each group's inner edge, from the frame's centre (640): the left pair ends at 488, the right
// pair starts at 792; a group starts this far (design px) beyond the card's edge
const GROUP_INNER_EDGE = FRAME.width / 2 - 488;
const GROUP_CLEARANCE = 40;
const GROUP_SLIDE_TIME = 0.65;
// the right pair: the engine flies in from the right (the showcase's image sits there), so the
// pair starts this much further right and eases in gently (slow, then faster, then slow),
// keeping to the right of the shrinking engine until both are in place: it glides in from the
// card's right edge, never from behind the engine
const RIGHT_GROUP_EXTRA = 300;
const GROUP_EASE = { [-1]: 'power2.out', 1: 'power2.inOut' };
// Sequence 2, one continuous vertical scroll, as if the cluster and the statement were on one
// page: both move up the same distance at the same pace over the whole sequence, the statement
// following right beneath the cluster. The cluster (its bottom edge at 540 in the frame) ends
// this far (design px) above the card's top, off the screen; the statement starts below the
// card's bottom edge (at least this far, px), off the screen too, and ends in the centre
const CLUSTER_BOTTOM = CARD.top + CARD.height;
const CLUSTER_CLEARANCE = 40;
const STATEMENT_CLEARANCE = 20;
// the share of the centre card's width (or height) the showcase's engine takes in it
const LANDING_FIT = 0.94;

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

const cellsOf = (row) => [...(row?.children || [])];

/** an element's text cut to its limit with "…" (not in the editor), its whole text a tooltip */
function cap(node, limit, editing) {
  const text = node?.textContent.trim();
  if (!text || editing || text.length <= limit) return;
  node.title = text;
  node.textContent = `${text.slice(0, limit).trimEnd()}…`;
}

const toClass = (s) => s.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
const clamp01 = (n) => Math.min(1, Math.max(0, n));
const smooth = (t) => t * t * (3 - 2 * t);
const inOut = (t) => (t < 0.5 ? 2 * t * t : 1 - ((2 - 2 * t) ** 2) / 2);

/** an image row's place in the design, from its place cell */
function placeOf(cell) {
  return (cell?.textContent || '').split(/[\s,]+/).map(toClass).filter(Boolean)
    .map((n) => ALIASES[n] || n)
    .find((n) => PLACES.includes(n));
}

/**
 * the block's rows by what they are: the heading and subtitle row, and the Collage Image items
 * (a picture, or marked as items by the editor); the rest (an item just added, no picture yet)
 */
function sortRows(rows) {
  const textRow = rows.find((r) => r.querySelector('h1, h2, h3'))
    || rows.find((r) => !r.querySelector('picture') && r.textContent.trim()) || null;
  const imageRows = rows.filter((r) => r !== textRow && r.querySelector('picture'));
  const others = rows.filter((r) => r !== textRow && !imageRows.includes(r));
  return { textRow, imageRows, others };
}

/**
 * the card's design-pixel scale (the frame fitted to the card, as the showcase's own frames),
 * as --collage-u on the card, kept up to date
 * @param {Element} card the card
 * @param {Element} block the block (static: the card is two frames tall)
 */
function trackScale(card, block) {
  const measure = () => {
    const w = card.clientWidth;
    // nothing moving, the card holds both frames, one under the other (collage.css)
    const h = card.clientHeight / (block.classList.contains('static') ? 2 : 1);
    if (!w || !h) return;
    const narrow = w / h < (FRAME.width / FRAME.height) * 0.8;
    const u = narrow ? Math.min(w / NARROW_FRAME_WIDTH, h / FRAME.height)
      : Math.min(w / FRAME.width, h / FRAME.height);
    card.style.setProperty('--collage-u', u.toFixed(5));
  };
  measure();
  if (window.ResizeObserver) new ResizeObserver(measure).observe(card);
  else window.addEventListener('resize', measure);
}

/**
 * the showcase's selected engine image, read afresh (the visitor may switch tabs at any time):
 * its figure (the showcase marks it data-zoom-source), image, file, colour treatment (the
 * Rotax engine's) and shape; null when there is none
 * @param {Element} showcase the interactive-showcase block
 */
function selectedImage(showcase) {
  const figure = showcase?.querySelector('[data-zoom-source]');
  const img = figure?.querySelector('img');
  if (!img) return null;
  const box = figure.getBoundingClientRect();
  let ratio = 1;
  if (box.width && box.height) ratio = box.width / box.height;
  else if (img.naturalWidth && img.naturalHeight) ratio = img.naturalWidth / img.naturalHeight;
  const tone = getComputedStyle(img).filter;
  return {
    figure,
    img,
    src: img.currentSrc || img.src,
    tone: tone === 'none' ? '' : tone,
    ratio,
  };
}

/**
 * where the selected engine sits in the centre card (the flight lands it there, the card then
 * shows it there): fitted to LANDING_FIT of the card's width (or height), centred
 * @param {number} ratio the image's width / height
 * @param {number} width the card's width (px of the screen, or of the frame)
 * @param {number} height the card's height
 */
function landing(ratio, width, height) {
  let w = width * LANDING_FIT;
  let h = w / ratio;
  if (h > height * LANDING_FIT) {
    h = height * LANDING_FIT;
    w = h * ratio;
  }
  return {
    left: (width - w) / 2, top: (height - h) / 2, width: w, height: h,
  };
}

/**
 * the centre card shows the showcase's selected engine, not a picture of its own: the same
 * image, colour treatment and place the flight lands it in, so one hands over to the other
 * unseen, both ways; kept in step as the visitor switches tabs. The card's own (authored)
 * picture shows only where the showcase has no selected image
 * @param {Element} engine the centre card
 * @param {Element} showcase the interactive-showcase block in the same section
 * @returns {Function} brings the card in step with the showcase again
 */
function inheritSelection(engine, showcase) {
  const landed = el('img', 'landed', { alt: '' });
  landed.decoding = 'async';
  engine.append(landed);
  const sync = () => {
    const selected = selectedImage(showcase);
    engine.classList.toggle('inherits', Boolean(selected));
    if (!selected) return;
    if (landed.dataset.src !== selected.src) {
      landed.dataset.src = selected.src;
      landed.src = selected.src;
    }
    landed.alt = selected.img.getAttribute('alt') || '';
    landed.style.filter = selected.tone;
    // in the frame's own px: the card is CARD.width x CARD.height there
    const spot = landing(selected.ratio, CARD.width, CARD.height);
    Object.assign(landed.style, {
      left: `${spot.left}px`, top: `${spot.top}px`, width: `${spot.width}px`, height: `${spot.height}px`,
    });
  };
  sync();
  // a tab picked in the showcase moves its data-zoom-source to the new image
  new MutationObserver(sync).observe(showcase, {
    subtree: true, attributes: true, attributeFilter: ['data-zoom-source'],
  });
  window.addEventListener('resize', sync);
  return sync;
}

/**
 * Sequence 1's flight: a copy of the showcase's selected image, laid in the centre card's box
 * and moved / scaled from where the image sits in the showcase into it. Driven from the
 * timeline's progress (0 to 1), measured afresh each time, so whichever tab is selected flies
 * @param {Element} card the collage's card
 * @param {Element} showcase the interactive-showcase block in the same section, if any
 * @returns {Function} the flight at a progress (0 to 1)
 */
function flight(card, showcase) {
  const box = el('div', 'flight', { 'aria-hidden': 'true' });
  const img = el('img', '', { alt: '' });
  img.decoding = 'async';
  box.append(img);
  card.append(box);
  let hidden = null; // the showcase figure hidden while its copy flies

  const restore = () => {
    hidden?.style.removeProperty('visibility');
    hidden = null;
  };

  return (p) => {
    const selected = selectedImage(showcase);
    if (!selected || p <= 0 || p >= 1) {
      box.style.visibility = 'hidden';
      restore();
      return;
    }
    const { figure } = selected;
    if (img.dataset.src !== selected.src) {
      img.dataset.src = selected.src;
      img.src = selected.src;
    }
    // with the colour treatment the showcase gives it (the Rotax engine's)
    img.style.filter = selected.tone;
    const u = parseFloat(card.style.getPropertyValue('--collage-u')) || 1;
    const c = card.getBoundingClientRect();
    const from = figure.getBoundingClientRect();
    if (!from.width || !from.height) return;
    // the centre card's box in the card
    const w = CARD.width * u;
    const h = CARD.height * u;
    const left = c.width / 2 + (CARD.left - FRAME.width / 2) * u;
    const top = c.height / 2 + (CARD.top - FRAME.height / 2) * u;
    // the cut-out landed in it, where the centre card shows it (inheritSelection)
    const spot = landing(selected.ratio, w, h);
    const iw = spot.width;
    const ih = spot.height;
    const ix = spot.left;
    const iy = spot.top;
    // at the start the cut-out lies exactly on the showcase's image
    const s0 = from.width / iw;
    const x0 = from.left - c.left - left - ix * s0;
    const y0 = from.top - c.top - top - iy * s0;
    const e = inOut(clamp01((p - 0.05) / 0.95));
    const s = s0 + (1 - s0) * e;
    // the black card, its corners formed, around it in the second half
    const form = smooth(clamp01((p - 0.5) / 0.4));
    Object.assign(box.style, {
      visibility: 'visible',
      left: `${left}px`,
      top: `${top}px`,
      width: `${w}px`,
      height: `${h}px`,
      transform: `translate3d(${(x0 * (1 - e)).toFixed(1)}px, ${(y0 * (1 - e)).toFixed(1)}px, 0) scale(${s.toFixed(4)})`,
      backgroundColor: `rgb(0 0 0 / ${(form * 100).toFixed(1)}%)`,
      borderRadius: `${((16 * u * form) / s).toFixed(2)}px`,
    });
    Object.assign(img.style, {
      left: `${ix}px`, top: `${iy}px`, width: `${iw}px`, height: `${ih}px`,
    });
    if (hidden !== figure) {
      restore();
      hidden = figure;
      figure.style.visibility = 'hidden';
    }
  };
}

/**
 * how far (design px of the frame) each side group slides in from in Sequence 1: from just
 * beyond the card's edge (the groups mirror each other, so one distance serves both sides)
 * @param {Element} card the collage's card
 */
function groupSlide(card) {
  const u = parseFloat(card.style.getPropertyValue('--collage-u')) || 1;
  // half the card's width in the frame's own px (the frame is centred in the card)
  return card.clientWidth / (2 * u) - GROUP_INNER_EDGE + GROUP_CLEARANCE;
}

/**
 * how far (px of the screen) Sequence 2 scrolls the cluster and the statement up, both by the
 * same distance: enough for the cluster to leave the card above (its bottom edge
 * CLUSTER_CLEARANCE design px over the card's top) and for the statement to start below it
 * (its top edge STATEMENT_CLEARANCE px under the card's bottom), on any screen
 * @param {Element} card the collage's card
 * @param {Element} statement the heading and text
 */
function secondScroll(card, statement) {
  const u = parseFloat(card.style.getPropertyValue('--collage-u')) || 1;
  // the cluster's bottom edge in the card (the frame is centred in it)
  const clusterBottom = card.clientHeight / 2 + (CLUSTER_BOTTOM - FRAME.height / 2) * u;
  // the statement's top edge in the card where it settles (offsets leave GSAP's transform out)
  const textTop = Math.min(...[...statement.children].map((child) => child.offsetTop));
  return Math.max(
    clusterBottom + CLUSTER_CLEARANCE * u,
    card.clientHeight - (Number.isFinite(textTop) ? textTop : 0) + STATEMENT_CLEARANCE,
  );
}

/**
 * the two sequences, on a timeline locked to the scroll through the block's room
 * @param {Object} parts the block's parts (block, stage, veil, paper, statement, items,
 *   showcase) and fly, the flight at a progress
 */
async function playSequences({
  block, stage, veil, paper, statement, items, showcase, fly,
}) {
  await loadScript(GSAP_SRC);
  await loadScript(SCROLL_TRIGGER_SRC);
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  const others = PLACES.slice(1).map((place) => items[place]).filter(Boolean);
  const engine = items[ENGINE];
  const screen = () => stage.clientHeight || window.innerHeight;
  // one wheel gesture plays one sequence: stops at the end of each (scripts/delayed.js)
  const stops = () => {
    block.dataset.scrollStops = Array.from({ length: SEQUENCES }, (_, i) => Math.round((i + 1) * screen())).join(',');
  };
  stops();
  ScrollTrigger.addEventListener('refreshInit', stops);

  const timeline = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: block,
      start: 'top top',
      end: () => `+=${SEQUENCES * screen()}`,
      scrub: true,
      invalidateOnRefresh: true,
    },
    onUpdate() {
      fly(this.time());
    },
  });
  // the timeline runs 0 to 2: Sequence 1, then Sequence 2
  timeline.set({}, {}, SEQUENCES);
  // Sequence 1: the light card comes over the showcase (its engine flying on), then turns
  // white as the collage assembles
  if (showcase) {
    timeline.fromTo(veil, { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0);
    timeline.fromTo(paper, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.35);
    // gone once covered, so its grey never shows at the white card's rounded corners
    timeline.to(veil, { opacity: 0, duration: 0.1 }, 0.8);
  }
  // the two side groups: one tween each, the same x for both images of a group (no y, no
  // fade), so each pair glides in as one solid block along the horizontal; the right pair from
  // further out, clear of the engine flying in on that side
  [-1, 1].forEach((side) => {
    const group = others.filter((item) => [...item.classList].some((c) => SIDES[c] === side));
    if (!group.length) return;
    const extra = side > 0 && showcase ? RIGHT_GROUP_EXTRA : 0;
    timeline.fromTo(group, {
      x: () => side * (groupSlide(stage.querySelector('.card')) + extra), y: 0,
    }, {
      x: 0, y: 0, duration: GROUP_SLIDE_TIME, ease: showcase ? GROUP_EASE[side] : 'power2.out',
    }, 0.35);
  });
  if (engine) {
    // with a showcase its image lands in the card, which then shows its own photo; on its own
    // the card grows into place
    if (showcase) timeline.fromTo(engine, { opacity: 0 }, { opacity: 1, duration: 0.12 }, 0.88);
    else {
      timeline.fromTo(engine, { scale: 1.6, opacity: 0 }, {
        scale: 1, opacity: 1, duration: 0.8, ease: 'power2.out',
      }, 0.1);
    }
  }
  // Sequence 2, one continuous vertical scroll: the assembled cluster (all five images, one
  // fixed group, the same y for each) moves up and off the screen while the statement, starting
  // below the screen, follows right beneath it into the centre. The same distance, pace and
  // timing for both (the statement's tween at the cluster's own position, "<"), locked to the
  // scroll like a page, no fade, no pause; it ends with the room
  const card = stage.querySelector('.card');
  const distance = () => secondScroll(card, statement);
  const u = () => parseFloat(card.style.getPropertyValue('--collage-u')) || 1;
  const cluster = [engine, ...others].filter(Boolean);
  if (cluster.length) {
    // the images sit in the scaled frame: the same screen distance in its design px
    timeline.to(cluster, { y: () => -distance() / u(), duration: 1, ease: 'none' }, 1);
  }
  timeline.fromTo(statement, { y: distance, opacity: 1 }, {
    y: 0, duration: 1, ease: 'none',
  }, cluster.length ? '<' : 1);
  fly(timeline.time());
  block.classList.add('ready');
  // re-measure once everything above has settled (fonts, images)
  ScrollTrigger.refresh();
  if (document.readyState !== 'complete') {
    window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  }
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  // Universal Editor: rich-text fields read as when published
  unwrapEditorRichtext(block);
  const editing = Boolean(block.closest('[data-aue-resource]'));
  const rows = [...block.children];
  const { textRow, imageRows, others } = sortRows(rows);
  // the editor: at MAX_IMAGES images, the filter that allows none (no "Add" for a sixth)
  const imageCount = rows.filter((r) => r.dataset.aueModel === ITEM_MODEL).length;
  if (editing && block.dataset.aueFilter) {
    block.dataset.aueFilter = imageCount >= MAX_IMAGES ? FILTERS.full : FILTERS.open;
  }

  // in the editor, images without a picture or a place yet (just added) stay in the page,
  // hidden, so they can still be picked in the content tree and completed
  const unplaced = el('div', 'unplaced');
  unplaced.hidden = true;
  if (editing) others.forEach((row) => unplaced.append(row));

  const stage = el('div', 'stage');
  const card = el('div', 'card');
  const veil = el('div', 'veil'); // Frame 1's light card, over the showcase
  const paper = el('div', 'paper'); // Frame 2's white card
  const frame = el('div', 'frame'); // the 1280 x 720 Figma frame, scaled to the card
  const statement = el('div', 'statement');
  if (textRow) {
    // the heading and text themselves (out of their cell), so the 36px gap is between them;
    // the field's editor instrumentation (on the row or its cell) moves with them
    const cells = cellsOf(textRow);
    const cell = cells.length === 1 ? cells[0] : textRow;
    moveInstrumentation(textRow, statement);
    if (cell !== textRow) moveInstrumentation(cell, statement);
    statement.append(...cell.childNodes);
    const heading = statement.querySelector('h1, h2, h3');
    heading?.classList.add('title');
    cap(heading, TEXT_LIMITS.heading, editing);
    statement.querySelectorAll('p').forEach((p) => cap(p, TEXT_LIMITS.text, editing));
  }
  const items = {};
  imageRows.forEach((row) => {
    const cells = cellsOf(row);
    const imageCell = cells.find((c) => c.querySelector('picture'));
    const place = placeOf(cells.find((c) => c !== imageCell));
    const picture = acceptedPicture(imageCell.querySelector('picture'), IMAGE_EXTENSIONS, `${place || 'collage'} image`, BLOCK);
    // an image without a place (or a second one for a place, or not of an accepted file type)
    // has no slot in the design
    if (!place || items[place] || !picture) {
      if (editing) unplaced.append(row);
      return;
    }
    const item = el('figure', `item ${place}`);
    item.append(picture);
    // the row's editor instrumentation on the rendered image
    moveInstrumentation(row, item);
    items[place] = item;
  });
  PLACES.forEach((place) => items[place] && frame.append(items[place]));
  card.append(veil, paper, frame, statement);
  stage.append(card);
  const room = el('div', 'room');
  block.replaceChildren(stage, room);
  if (unplaced.childElementCount) block.append(unplaced);
  // the editor: images the page leaves out, said where the author sees them
  const hidden = unplaced.childElementCount;
  if (editing && (imageCount > MAX_IMAGES || hidden)) {
    const note = el('p', 'limit-note');
    note.textContent = imageCount > MAX_IMAGES
      ? `This collage has ${imageCount} images; it shows ${MAX_IMAGES}, one per place. Remove the extra ones in the content tree.`
      : `${hidden} image${hidden === 1 ? ' is' : 's are'} not shown: each needs a picture and a place of its own (${PLACE_NAMES.join(', ')}).`;
    stage.prepend(note);
  }

  const section = block.closest('.section');
  const showcase = section?.querySelector('.interactive-showcase');
  const still = () => {
    block.classList.add('static');
    section?.classList.remove('collage-pinned');
  };
  block.classList.toggle('editing', editing);
  if (editing || !window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    still();
    trackScale(card, block);
    // with reduced motion too the centre card shows the showcase's selected engine; the editor
    // shows the card's own picture, the field authors edit there
    if (!editing && showcase && items[ENGINE]) inheritSelection(items[ENGINE], showcase);
    return;
  }

  // the centre card shows the showcase's selected engine (whichever tab the visitor picked)
  const syncCentre = showcase && items[ENGINE] ? inheritSelection(items[ENGINE], showcase) : null;

  // pinned: the showcase (when in this section) and the collage hold on the screen while the
  // section scrolls through the room (collage.css); hidden until the timeline sets its start
  block.classList.add('animated');
  if (showcase) section.classList.add('collage-pinned');
  trackScale(card, block);
  const flyTo = flight(card, showcase);
  // each step of the scroll: the centre card in step with the showcase, then the flight
  const fly = (p) => {
    syncCentre?.();
    flyTo(p);
  };
  playSequences({
    block, stage, veil, paper, statement, items, showcase, fly,
  }).catch(() => {
    // GSAP unavailable: nothing moves, both frames show
    block.classList.remove('animated');
    still();
    trackScale(card, block);
  });
}
