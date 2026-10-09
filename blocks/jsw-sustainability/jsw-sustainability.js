/*
 * jsw-sustainability: full-viewport collage with a pinned, scroll-scrubbed GSAP timeline.
 * Rows: centre engine picture, centre text (headline + paragraph), then one row per card.
 * Everything starts together at the top of the scroll: the engine shrinks and fades out,
 * the text fades in, and the cards fly out of the exact centre to their CSS positions.
 * Scrolling back reverses it. Without GSAP, with reduced motion or in the Universal
 * Editor the finished collage is shown.
 */
import { loadScript } from '../../scripts/aem.js';

const GSAP_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';
const SCROLL_TRIGGER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js';

async function animate(block) {
  await loadScript(GSAP_SRC);
  await loadScript(SCROLL_TRIGGER_SRC);
  const { gsap, ScrollTrigger } = window;
  if (!gsap || !ScrollTrigger) throw new Error('GSAP unavailable');
  gsap.registerPlugin(ScrollTrigger);

  const engine = block.querySelector('.center-engine');
  const centerText = block.querySelector('.center-text-container');
  const collageCards = block.querySelectorAll('.collage-card');

  // final perimeter positions from CSS, as percentages of the block so they hold on resize
  // (a plain from() would re-record its end values on every ScrollTrigger refresh, when the
  // cards already sit in the centre, and then never move)
  const finals = [...collageCards].map((card) => ({
    top: `${(card.offsetTop / block.clientHeight) * 100}%`,
    left: `${(card.offsetLeft / block.clientWidth) * 100}%`,
  }));

  block.dataset.animated = 'true';
  gsap.set(centerText, { opacity: 0 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: block,
      pin: true,
      scrub: 1,
      start: 'top top',
      end: '+=2500',
    },
  });

  // all three start at 0, so they play together on the scrub
  tl.to(engine, {
    scale: 0.5,
    opacity: 0,
    ease: 'power1.inOut',
  }, 0);

  tl.to(centerText, {
    opacity: 1,
    ease: 'power1.inOut',
  }, 0);

  // cards fly FROM the exact centre to their CSS perimeter positions
  tl.fromTo(collageCards, {
    top: '50%',
    left: '50%',
    xPercent: -50,
    yPercent: -50,
    scale: 0.1,
    opacity: 0,
  }, {
    top: (i) => finals[i].top,
    left: (i) => finals[i].left,
    xPercent: 0,
    yPercent: 0,
    scale: 1,
    opacity: 1,
    stagger: 0.02,
    ease: 'power2.out',
  }, 0);
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  // this page manages its own scrolling: opt out of the site's panel snapping / wheel steps
  document.body.dataset.nativeScroll = 'true';

  const rows = [...block.children];
  const textRow = rows.find((r) => r.querySelector('h1, h2, h3'));
  const imageRows = rows.filter((r) => r !== textRow && r.querySelector('picture'));
  const [engineRow, ...cardRows] = imageRows;

  const engine = document.createElement('div');
  engine.className = 'center-engine';
  if (engineRow) {
    engineRow.className = 'center-engine-card';
    const img = engineRow.querySelector('img');
    if (img) {
      img.loading = 'eager';
      img.fetchPriority = 'high';
    }
    engine.append(engineRow);
  }

  const centerText = document.createElement('div');
  centerText.className = 'center-text-container';
  if (textRow) {
    textRow.className = 'center-text';
    textRow.querySelector('h1, h2, h3')?.classList.add('center-text-title');
    centerText.append(textRow);
  }

  cardRows.forEach((row, i) => {
    row.className = 'collage-card';
    row.dataset.slot = i < 6 ? i + 1 : 'extra';
    row.querySelector('img')?.setAttribute('loading', 'eager');
  });

  // z-order: text (1) < cards (2) < engine (3)
  block.replaceChildren(centerText, ...cardRows, engine);

  const editing = Boolean(block.closest('[data-aue-resource]'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (editing || reduced) {
    block.dataset.animated = 'static';
    block.classList.toggle('jsw-sustainability-editing', editing);
    return;
  }
  // the cards must be laid out at their CSS positions before GSAP reads them
  requestAnimationFrame(() => {
    animate(block).catch(() => { block.dataset.animated = 'static'; });
  });
}
