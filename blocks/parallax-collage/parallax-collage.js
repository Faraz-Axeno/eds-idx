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
  // wheel scrolling glides between stops like the MG pages (scripts/delayed.js, power2.inOut):
  // the start, the end of the engine hold, and the end of the block
  const rows = [...block.children];
  const textRow = rows.find((r) => r.querySelector('h1, h2, h3'));
  const imageRows = rows.filter((r) => r !== textRow && r.querySelector('picture'));

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
    if (!place) return;

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

  // The image group holds still for the first --pc-m-hold vh of scrolling while the engine
  // shrinks to the top (CSS reads --pc-m-progress), then scrolls on as usual.
  let frame = 0;
  const update = () => {
    frame = 0;
    const holdVh = parseFloat(getComputedStyle(block).getPropertyValue('--pc-m-hold')) || 0;
    const hold = (holdVh / 100) * textLayer.clientHeight;
    // not laid out yet (styles still loading): stay at the start
    if (!hold) return;
    // an eased-scroll stop where the engine has finished shrinking
    block.dataset.scrollStops = String(Math.round(hold));
    const held = Math.min(hold, Math.max(0, -block.getBoundingClientRect().top));
    imagesLayer.style.transform = `translate3d(0, ${held}px, 0)`;
    block.style.setProperty('--pc-m-progress', (held / hold).toFixed(4));
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  // also once the stylesheet has laid the block out, and on any later size change
  new ResizeObserver(schedule).observe(block);
  schedule();
}
