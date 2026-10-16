/*
 * parallax-collage: a sticky text layer pinned in the centre while an image layer scrolls
 * over it naturally: screen 1 (centre engine + 4 cards), a gap, then screen 2 (4 cards).
 * CSS position: sticky and the browser's own scrolling do the motion; a small scroll handler
 * first holds the images while the engine shrinks to the top.
 * Rows: 1) heading + subtitle, 2..n) image | modifier naming its place in the design:
 *   center-engine; screen 1: card-charger, card-bridge, card-room, card-spring;
 *   screen 2: card-phone, card-jetour, card-chassis, card-stage
 *   (short names such as "charger" or "empty-room" work too).
 */

import { loadScript } from '../../scripts/aem.js';
import { unwrapEditorRichtext } from '../../scripts/scripts.js';

// same GSAP build as scripts/delayed.js, so the library is only downloaded once
const GSAP_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js';
const SCROLL_TRIGGER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js';
// Fold 1 (desktop, Figma "NEV" first frame): the engine starts zoomed in and pushed right,
// then zooms out into its centre card over the first FOLD_VH of scrolling
// (not in the phone layout, which portrait tablets up to 1199px wide also use)
const FOLD_MEDIA = [
  '(min-width: 768px) and (orientation: landscape) and (prefers-reduced-motion: no-preference)',
  '(min-width: 1200px) and (prefers-reduced-motion: no-preference)',
].join(', ');
const FOLD_VH = 100;
// small-viewport height where the browser has it (as in the CSS), the classic vh elsewhere
const VH_UNIT = window.CSS?.supports?.('height', '1svh') ? 'svh' : 'vh';
const FOLD_START_SCALE = 2.5;
// Fold 1 artwork: the engine card's own photo, cut out of its black background exactly as the
// card shows it (same framing and crop), so the zoomed-out engine lands on the card's engine
const FOLD_IMAGE = new URL('./engine-fold1.webp', import.meta.url).href;
// the engine's outline inside that image (fractions of the card)
const FOLD_ENGINE = {
  left: 0.089, top: 0.2545, right: 1, bottom: 0.9288,
};
// zoomed in, the whole engine sits on the right as in the Figma 1280 x 720 frame: about
// 606 x 582, from y 114 (below the navbar) to y 696, running out at the right edge;
// on narrower screens it never takes more than the right half
const FOLD_FRAME_HEIGHT = 582 / 720;
const FOLD_FRAME_BOTTOM = 696 / 720;
const FOLD_FRAME_MAX_WIDTH = 0.5;
// the Figma frame's background: white, fading to light grey towards the bottom right
const FOLD_BACKGROUND = 'radial-gradient(ellipse 75% 85% at 100% 100%, #cfcfcf 0%, #e4e4e4 40%, #f6f6f6 70%, #fff 100%)';

/**
 * full-screen Fold 1 layer: light background + the engine, in a copy of the engine card
 * whose black background and corners only form as it zooms out into the card's place
 */
function buildFoldLayer() {
  const layer = document.createElement('div');
  layer.className = 'parallax-collage-fold';
  layer.setAttribute('aria-hidden', 'true');
  Object.assign(layer.style, {
    // over the side images, under the engine card (the zoom wrapper, z-index 2)
    position: 'absolute', inset: '0', zIndex: '1', pointerEvents: 'none',
  });
  const background = document.createElement('div');
  Object.assign(background.style, { position: 'absolute', inset: '0', background: FOLD_BACKGROUND });
  const card = document.createElement('div');
  Object.assign(card.style, { position: 'absolute', overflow: 'hidden' });
  const img = document.createElement('img');
  img.src = FOLD_IMAGE;
  img.alt = '';
  img.decoding = 'async';
  Object.assign(img.style, { display: 'block', width: '100%', height: '100%' });
  card.append(img);
  layer.append(background, card);
  return { layer, background, card };
}

/**
 * where a flown-in cut-out sits in the card (fractions of the card): as tall as the engine in
 * the card's own photo (67.4%, bottom at 92.9%); 8.9% from the left when that makes it wider
 * than the card (it then runs off the right edge, exactly like the engine in the photo),
 * otherwise centred; very wide images are fitted to 96% of the card's width instead
 */
function landing(ratio, cardWidth, cardHeight) {
  let height = 0.674;
  let width = (height * cardHeight * ratio) / cardWidth;
  if (width > 1.05) {
    width = 0.96;
    height = (width * cardWidth) / (ratio * cardHeight);
  }
  return {
    left: width > 1 ? 0.089 : (1 - width) / 2, top: 0.9288 - height, width, height,
  };
}

function placeCutout(img, spot) {
  Object.assign(img.style, {
    left: `${spot.left * 100}%`,
    top: `${spot.top * 100}%`,
    width: `${spot.width * 100}%`,
    height: `${spot.height * 100}%`,
  });
}

function cutout() {
  const img = document.createElement('img');
  img.alt = '';
  img.decoding = 'async';
  Object.assign(img.style, {
    position: 'absolute', display: 'block', maxWidth: 'none', transform: 'none', borderRadius: '0',
  });
  return img;
}

/**
 * Fly-in (after a section with a [data-zoom-source] image, e.g. hotspot-showcase):
 * scrolling from that section to this one flies its selected image from where it sits into
 * the centre card. A fixed copy travels between the two (the source image hides meanwhile),
 * the black card, corners and shadow form around it as it lands, the text and side images
 * fade in, and on arrival the card, now showing that same cut-out, takes over unnoticed.
 * It all plays within the source section's screen: that section holds still while this block,
 * already in its final place, fades in over it as a white screen, so nothing scrolls by.
 * Scrolling back flies it back. Every screen size has the flight (phones and tablets too); with
 * reduced motion there is none, but the card shows the same selected cut-out.
 */
function flyIn({
  section, engine, fadeIns, sourceSection,
}) {
  const media = window.matchMedia('(prefers-reduced-motion: no-preference)');
  const picture = engine.querySelector('picture');
  // only the contents move (the source's card, this block's wrapper): section boxes, which the
  // navigation theme and the wheel stops read, stay where they are
  const held = sourceSection.firstElementChild;
  const cover = engine.closest('.parallax-collage')?.parentElement;
  const release = () => {
    held?.style.removeProperty('transform');
    ['transform', 'opacity'].forEach((p) => cover?.style.removeProperty(p));
    section.style.removeProperty('background-color');
  };
  const landed = cutout();
  const flight = document.createElement('div');
  flight.className = 'parallax-collage-flight';
  flight.setAttribute('aria-hidden', 'true');
  Object.assign(flight.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    zIndex: '900', // over both sections, under the fixed navigation
    overflow: 'hidden',
    pointerEvents: 'none',
    transformOrigin: '0 0',
    visibility: 'hidden',
  });
  const flown = cutout();
  flight.append(flown);
  document.body.append(flight);
  let shown = null; // the figure currently hidden while its copy flies

  const showSource = (figure) => {
    if (shown && shown !== figure) shown.style.removeProperty('visibility');
    shown = figure;
  };
  const reset = () => {
    flight.style.visibility = 'hidden';
    if (shown) shown.style.removeProperty('visibility');
    shown = null;
    release();
    landed.remove();
    picture?.style.removeProperty('display');
    ['opacity', 'background-color'].forEach((p) => engine.style.removeProperty(p));
    fadeIns.forEach((el) => el.style.removeProperty('opacity'));
  };

  let frame = 0;
  const update = () => {
    frame = 0;
    const figure = sourceSection.querySelector('[data-zoom-source]');
    const img = figure?.querySelector('img');
    // reduced motion: no flight, the card just shows the selected image
    const still = !media.matches;
    if (!img || !section.offsetHeight) {
      reset();
      return;
    }
    // the card shows the selected image, as a cut-out on black (the visitor may switch tabs)
    const src = img.currentSrc || img.src;
    if (landed.dataset.src !== src) {
      landed.dataset.src = src;
      landed.src = src;
      flown.src = src;
      // with the colour treatment the source section gives it (e.g. the Rotax engine's)
      const tone = getComputedStyle(img).filter;
      landed.style.filter = tone === 'none' ? '' : tone;
      flown.style.filter = landed.style.filter;
    }
    if (picture) picture.style.display = 'none';
    if (!landed.isConnected) engine.append(landed);
    engine.style.backgroundColor = '#000';

    if (still) {
      flight.style.visibility = 'hidden';
      showSource(null);
      release();
      engine.style.removeProperty('opacity');
      fadeIns.forEach((el) => el.style.removeProperty('opacity'));
      // placed in the card as on desktop (fractions of the card, so its scaling does not matter)
      const box = figure.getBoundingClientRect();
      const card = engine.getBoundingClientRect();
      if (box.width && box.height && card.width) {
        placeCutout(landed, landing(box.width / box.height, card.width, card.height));
      }
      return;
    }

    // 0 while the source section is at its stop, 1 once this section's top reaches the screen
    // top. Measured against the source section's own height, and with a couple of pixels'
    // tolerance at both ends: on real phones the screen (fractional heights, the browser's
    // toolbars) never quite matches the sections, and at rest a flight just begun would cover
    // the source section, its thumbnails included
    const h = sourceSection.offsetHeight || window.innerHeight;
    const { top } = section.getBoundingClientRect();
    let p = Math.min(1, Math.max(0, 1 - top / h));
    if (top >= h - 2) p = 0;
    else if (top <= 2) p = 1;
    const arrived = p >= 0.999;
    // in between: the source section holds still and the white screen (this block in its final
    // place, on a see-through section) fades in over it; set before measuring both ends
    if (p <= 0 || arrived) release();
    else {
      const shift = Math.max(0, -sourceSection.getBoundingClientRect().top);
      held.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
      cover.style.transform = `translate3d(0, ${(-top).toFixed(1)}px, 0)`;
      cover.style.opacity = Math.min(1, p / 0.35).toFixed(3);
      section.style.backgroundColor = 'transparent';
    }

    const from = figure.getBoundingClientRect();
    const to = engine.getBoundingClientRect();
    const spot = landing(from.width / from.height, to.width, to.height);
    placeCutout(landed, spot);
    placeCutout(flown, spot);
    engine.style.opacity = arrived ? '' : '0';
    fadeIns.forEach((el) => {
      if (arrived) el.style.removeProperty('opacity');
      else el.style.opacity = Math.max(0, (p - 0.65) / 0.35).toFixed(3);
    });
    if (p <= 0 || arrived) {
      flight.style.visibility = 'hidden';
      showSource(null);
      return;
    }
    // the copy: a card-sized box whose cut-out starts exactly on the source image
    figure.style.visibility = 'hidden';
    showSource(figure);
    const s0 = from.width / (spot.width * to.width);
    const e = 1 - (1 - p) ** 2; // power2.out, as Fold 1
    const scale = s0 + (1 - s0) * e;
    const x = (from.left - spot.left * to.width * s0) * (1 - e) + to.left * e;
    const y = (from.top - spot.top * to.height * s0) * (1 - e) + to.top * e;
    // the black card forms around it in the second half
    const t = Math.min(1, Math.max(0, (p - 0.45) / 0.5));
    const form = t * t * (3 - 2 * t);
    Object.assign(flight.style, {
      visibility: 'visible',
      width: `${to.width}px`,
      height: `${to.height}px`,
      transform: `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`,
      backgroundColor: `rgb(0 0 0 / ${(form * 100).toFixed(1)}%)`,
      borderRadius: `${(20 * form).toFixed(1)}px`,
      boxShadow: `0 20px 40px rgb(0 0 0 / ${(15 * form).toFixed(1)}%)`,
    });
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  // older Safari has no change events on media queries: the resize listener covers it there
  media.addEventListener?.('change', schedule);
  // a tab switch in the source section changes the image
  new MutationObserver(schedule).observe(sourceSection, {
    subtree: true, attributes: true, attributeFilter: ['data-zoom-source'],
  });
  new ResizeObserver(schedule).observe(section);
  update();
}

const ENGINE = 'center-engine';
const SCREENS = {
  [ENGINE]: 1,
  'card-charger': 1,
  'card-bridge': 1,
  'card-room': 1,
  'card-spring': 1,
  'card-phone': 2,
  'card-jetour': 2,
  'card-chassis': 2,
  'card-stage': 2,
};
const ALIASES = {
  engine: ENGINE,
  center: ENGINE,
  charger: 'card-charger',
  bridge: 'card-bridge',
  room: 'card-room',
  'empty-room': 'card-room',
  'card-empty-room': 'card-room',
  spring: 'card-spring',
  phone: 'card-phone',
  jetour: 'card-jetour',
  chassis: 'card-chassis',
  stage: 'card-stage',
};

const toClass = (s) => s.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');

/** the named place of an image row, from its modifier cell */
function placeOf(cell) {
  const names = (cell?.textContent || '').split(/[\s,]+/).map(toClass).filter(Boolean)
    .map((n) => ALIASES[n] || n);
  return names.find((n) => SCREENS[n]);
}

function div(className) {
  const el = document.createElement('div');
  el.className = className;
  return el;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  // Universal Editor: rich-text fields read as when published
  unwrapEditorRichtext(block);
  // wheel scrolling glides between stops like the MG pages (scripts/delayed.js, power2.inOut):
  // the start, the end of the engine hold, and the end of the block
  // a light panel: on /jsw-phase-3 the fixed navigation and scroll indicator follow it
  block.closest('.section')?.setAttribute('data-jsw-theme', 'light');
  const rows = [...block.children];
  const textRow = rows.find((r) => r.querySelector('h1, h2, h3'));
  const imageRows = rows.filter((r) => r !== textRow && r.querySelector('picture'));
  const editing = Boolean(block.closest('[data-aue-resource]'));
  // in the editor, screen-height sizes are capped (parallax-collage.css)
  block.classList.toggle('parallax-collage-editing', editing);
  // and the canvas, which grows to fit the page, always reads as portrait: a wide one keeps the
  // desktop layout (parallax-collage.css), as the same width would on a landscape screen
  if (editing) {
    const wide = () => block.classList.toggle('parallax-collage-wide-editor', window.innerWidth >= 768);
    wide();
    window.addEventListener('resize', wide);
  }
  // in the editor, images without a picture or a place yet (e.g. just added) stay in the page,
  // hidden, so they can still be picked in the content tree and completed
  const unplaced = div('parallax-collage-unplaced');
  unplaced.hidden = true;
  if (editing) {
    rows.filter((r) => r !== textRow && !imageRows.includes(r)).forEach((r) => unplaced.append(r));
  }

  // sticky text layer
  const textLayer = div('sticky-text-layer');
  if (textRow) {
    textRow.className = 'content';
    textRow.querySelector('h1, h2, h3')?.classList.add('parallax-collage-title');
    textLayer.append(textRow);
  }

  // scrolling image layer: screen 1, gap, screen 2
  const imagesLayer = div('scrolling-images-layer');
  const screens = { 1: div('screen-1'), 2: div('screen-2') };
  imagesLayer.append(screens[1], screens[2]);

  imageRows.forEach((row) => {
    const cells = [...row.children];
    const imageCell = cells.find((c) => c.querySelector('picture'));
    const place = placeOf(cells.find((c) => c !== imageCell));
    // images without a named place have no slot in the design and are not rendered
    if (!place) {
      if (editing) unplaced.append(row);
      return;
    }

    const item = document.createElement('figure');
    item.className = `parallax-collage-item ${place}`;
    const picture = imageCell.querySelector('picture');
    const img = picture.querySelector('img');
    if (img) img.loading = SCREENS[place] === 1 ? 'eager' : 'lazy';
    item.append(picture);
    // keep the row's editor instrumentation on the rendered item
    [...row.attributes].filter(({ name }) => name.startsWith('data-aue-'))
      .forEach(({ name, value }) => item.setAttribute(name, value));
    screens[SCREENS[place]].append(item);
  });

  block.replaceChildren(textLayer, imagesLayer);
  if (unplaced.childElementCount) block.append(unplaced);

  // Fold 1 animates a wrapper around the engine, never the engine itself: the engine's own
  // transform belongs to the stylesheet (it drives the later shrink-to-top).
  const engine = screens[1].querySelector(`.${ENGINE}`);
  let zoom = null;
  if (engine && !editing) {
    zoom = div('parallax-collage-zoom');
    Object.assign(zoom.style, {
      position: 'absolute', inset: '0', zIndex: '2', pointerEvents: 'none',
    });
    engine.replaceWith(zoom);
    zoom.append(engine);
  }
  // shown only once the engine has zoomed out (Fold 1 shows the engine alone)
  const fadeIns = [textRow, ...screens[1].querySelectorAll(`.parallax-collage-item:not(.${ENGINE})`)]
    .filter(Boolean);
  let foldActive = false; // true while the Fold 1 timeline is set up (desktop)

  // The image group holds still while Fold 1 plays (desktop) and then for --pc-m-hold vh while
  // the engine shrinks to the top (CSS reads --pc-m-progress), then scrolls on as usual.
  let frame = 0;
  const update = () => {
    frame = 0;
    const holdVh = parseFloat(getComputedStyle(block).getPropertyValue('--pc-m-hold')) || 0;
    const screen = textLayer.clientHeight;
    const hold = (holdVh / 100) * screen;
    // not laid out yet (styles still loading): stay at the start
    if (!hold) return;
    const fold = foldActive ? (FOLD_VH / 100) * screen : 0;
    // extra scroll room for Fold 1, inside the image layer like the hold's own room
    if (fold) imagesLayer.style.paddingBottom = `calc(${holdVh + FOLD_VH} * 1${VH_UNIT})`;
    else imagesLayer.style.removeProperty('padding-bottom');
    // eased-scroll stops: engine settled in the centre, engine shrunk to the top
    block.dataset.scrollStops = [fold, fold + hold].filter(Boolean).map(Math.round).join(',');
    // the block's own place, without the fly-in's temporary shift of its wrapper
    const { transform } = getComputedStyle(block.parentElement);
    const shift = transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42;
    const held = Math.min(fold + hold, Math.max(0, shift - block.getBoundingClientRect().top));
    imagesLayer.style.transform = `translate3d(0, ${held}px, 0)`;
    const progress = Math.min(1, Math.max(0, (held - fold) / hold));
    block.style.setProperty('--pc-m-progress', progress.toFixed(4));
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  // also once the stylesheet has laid the block out, and on any later size change
  new ResizeObserver(schedule).observe(block);
  schedule();

  if (!zoom) return;
  // after a section that marks a zoom source (hotspot-showcase on /jsw-phase-3), its selected
  // image flies from there into the card instead of Fold 1
  const section = block.closest('.section');
  let sourceSection = section?.previousElementSibling;
  while (sourceSection && !sourceSection.classList.contains('section')) {
    sourceSection = sourceSection.previousElementSibling;
  }
  if (sourceSection?.querySelector('[data-zoom-source]')) {
    flyIn({
      section, engine, fadeIns, sourceSection,
    });
    return;
  }
  // Fold 1 waits for GSAP: until then the engine and the fading items stay hidden on desktop
  // so the normal card never flashes before the zoomed-in start state
  const foldMedia = window.matchMedia(FOLD_MEDIA);
  const hideUntilReady = foldMedia.matches;
  let fold = null; // the Fold 1 layer, present only while Fold 1 is set up (desktop)
  const addFoldLayer = () => {
    if (!fold) {
      fold = buildFoldLayer();
      screens[1].append(fold.layer);
    }
    return fold;
  };
  const removeFoldLayer = () => {
    fold?.layer.remove();
    fold = null;
  };
  if (hideUntilReady) {
    // show the Figma Fold 1 frame straight away; the card underneath waits for GSAP
    addFoldLayer();
    zoom.style.visibility = 'hidden';
    fadeIns.forEach((el) => { el.style.opacity = '0'; });
  }
  const showEngine = () => zoom.style.removeProperty('visibility');
  // without Fold 1 (phones, reduced motion, GSAP unavailable) everything shows at once
  const reveal = () => {
    removeFoldLayer();
    showEngine();
    fadeIns.forEach((el) => el.style.removeProperty('opacity'));
  };

  // the timeline measures the engine (size, centre): wait until the section is laid out,
  // otherwise a cached, instantly-loaded GSAP measures 0 and zooms from the top-left corner
  const laidOut = () => textLayer.clientHeight > 0 && engine.offsetWidth > 0;
  const layoutReady = new Promise((resolve) => {
    if (laidOut()) {
      resolve();
      return;
    }
    const observer = new ResizeObserver(() => {
      if (!laidOut()) return;
      observer.disconnect();
      resolve();
    });
    observer.observe(block);
    observer.observe(engine);
  });

  (async () => {
    await loadScript(GSAP_SRC);
    await loadScript(SCROLL_TRIGGER_SRC);
    await layoutReady;
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);

    // desktop only; leaving the media query (resize, reduced motion) reverts every inline style
    gsap.matchMedia().add(FOLD_MEDIA, () => {
      // the card's own corner radius, read before GSAP sets its start value inline
      const cardRadius = getComputedStyle(engine).borderTopLeftRadius || '20px';
      const cardStyle = getComputedStyle(engine);
      const cardShadow = cardStyle.boxShadow === 'none' ? '' : cardStyle.boxShadow;
      const { background, card } = addFoldLayer();
      // the copy sits exactly on the engine card's final box (layer and zoom wrapper both fill
      // screen 1; computed values are unaffected by the transforms GSAP adds)
      const placeCard = () => {
        const style = getComputedStyle(engine);
        const width = parseFloat(style.width);
        const height = parseFloat(style.height);
        Object.assign(card.style, {
          left: `${parseFloat(style.left) - width / 2}px`,
          top: `${parseFloat(style.top) - height / 2}px`,
          width: `${width}px`,
          height: `${height}px`,
        });
      };
      placeCard();
      ScrollTrigger.addEventListener('refreshInit', placeCard);
      // zoomed in: the whole engine, sized and placed on the screen as in the Figma frame
      const zoomedIn = () => {
        const width = card.offsetWidth;
        const height = card.offsetHeight;
        const screenWidth = screens[1].clientWidth;
        const screenHeight = textLayer.clientHeight;
        const engineWidth = (FOLD_ENGINE.right - FOLD_ENGINE.left) * width;
        const engineHeight = (FOLD_ENGINE.bottom - FOLD_ENGINE.top) * height;
        const scale = Math.min(
          (FOLD_FRAME_HEIGHT * screenHeight) / engineHeight,
          (FOLD_FRAME_MAX_WIDTH * screenWidth) / engineWidth,
        );
        return {
          scale,
          // its right side on the screen's right edge, its bottom where the frame has it
          x: screenWidth - card.offsetLeft - FOLD_ENGINE.right * width * scale,
          y: FOLD_FRAME_BOTTOM * screenHeight - card.offsetTop
            - FOLD_ENGINE.bottom * height * scale,
        };
      };
      foldActive = true;
      update(); // add the Fold 1 scroll room before ScrollTrigger measures the page
      // drop the placeholder hiding first: the timeline below sets the same start state in
      // this same frame, and leaving Fold 1 (e.g. desktop to phone) then reverts to all shown
      showEngine();
      fadeIns.forEach((el) => el.style.removeProperty('opacity'));
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: block,
          start: 'top top',
          end: () => `+=${(FOLD_VH / 100) * textLayer.clientHeight}`,
          scrub: true, // locked to the scroll: hands over to the CSS shrink without a gap
          invalidateOnRefresh: true,
        },
      });
      timeline
        // start: zoomed in 2.5x and pushed right by its own width, around the engine's centre
        // (offsetLeft / offsetTop are that centre: the stylesheet centres it with translate -50%)
        .fromTo(zoom, {
          x: () => engine.offsetWidth,
          scale: FOLD_START_SCALE,
          transformOrigin: () => `${engine.offsetLeft}px ${engine.offsetTop}px`,
        }, {
          x: 0, scale: 1, ease: 'power2.out', duration: 1,
        }, 0)
        .fromTo(engine, { borderRadius: '0px' }, {
          borderRadius: cardRadius,
          ease: 'power2.out',
          duration: 1,
        }, 0)
        // the Figma frame: the large engine zooms straight out onto the card's engine...
        .fromTo(card, {
          x: () => zoomedIn().x,
          y: () => zoomedIn().y,
          scale: () => zoomedIn().scale,
          transformOrigin: '0 0',
        }, {
          x: 0, y: 0, scale: 1, ease: 'power2.out', duration: 1,
        }, 0)
        // ...its light background clears to the white page...
        .fromTo(background, { opacity: 1 }, { opacity: 0, ease: 'none', duration: 0.35 }, 0.25)
        // ...while the black card, its corners and its shadow form around the engine
        .fromTo(card, {
          backgroundColor: 'rgba(0, 0, 0, 0)',
          borderRadius: '0px',
          boxShadow: cardShadow.replace(/rgba?\([^)]*\)/g, 'rgba(0, 0, 0, 0)'),
        }, {
          backgroundColor: 'rgba(0, 0, 0, 1)',
          borderRadius: cardRadius,
          boxShadow: cardShadow,
          ease: 'power1.inOut',
          duration: 0.5,
        }, 0.45)
        // landed: the copy is pixel-identical to the card, which takes over unnoticed
        .fromTo(zoom, { opacity: 0 }, { opacity: 1, ease: 'none', duration: 0.001 }, 0.998)
        .fromTo(card, { autoAlpha: 1 }, { autoAlpha: 0, ease: 'none', duration: 0.001 }, 0.998)
        // the text and the side images arrive as the engine settles
        .fromTo(fadeIns, { opacity: 0 }, { opacity: 1, ease: 'none', duration: 0.35 }, 0.65);
      return () => {
        ScrollTrigger.removeEventListener('refreshInit', placeCard);
        foldActive = false;
        removeFoldLayer();
        update();
      };
    });
    if (!foldActive) reveal();
    // re-measure once everything above the block (fonts, images, other sections) has settled
    ScrollTrigger.refresh();
    if (document.readyState !== 'complete') {
      window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
    }
  })().catch(() => {
    // GSAP unavailable: no Fold 1, everything else as usual
    foldActive = false;
    reveal();
    update();
  });
}
