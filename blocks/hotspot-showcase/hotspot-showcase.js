/*
 * hotspot-showcase: white card, copy + thumbnail tray on the left, showcase image with
 * hotspots on the right.
 * Rows: a heading row, then one row per powertrain with
 *   media       — thumbnail picture, then showcase picture
 *   title       — the powertrain's name (plain text; shown as its h3)
 *   description — rich text below it
 *   (older content: one text cell with the h3 and the description instead of these two)
 *   hotspots — list items "x, y | TITLE | description" (position over the showcase image,
 *              from its bottom-left corner; at most MAX_HOTSPOTS, see parseHotspots)
 * Thumbnails are tabs: selecting one swaps the showcase image, counter and copy.
 * A hotspot opens a frosted tooltip; clicking outside or Escape closes it.
 * Entrance ("white curtain"): the previous section holds still while this white card slides
 * up over it; once the card fills the screen its content fades in.
 * The selected showcase image is marked data-zoom-source: a following parallax collage flies
 * it from here into its centre card on scroll.
 */

import { unwrapEditorRichtext } from '../../scripts/scripts.js';

// at most this many + points per powertrain (the client's limit): further bullets are ignored
const MAX_HOTSPOTS = 4;
let instance = 0;

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

/**
 * an authored coordinate as a number from 0 to 100: "40" and "40%" both give 40 (the % is
 * added back where it is used); missing or not a number gives 0
 */
function normalizeCoordinate(value) {
  const n = parseFloat(String(value ?? '').replace(/%/g, '').trim());
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0;
}

/**
 * the + points, one bullet each: "x, y | TITLE | description". x and y are percentages of the
 * showcase image from its bottom-left corner, like the first quadrant of a graph (x to the
 * right, y upwards); the + button's top-left corner sits on that point. A missing x or y is 0;
 * only the first MAX_HOTSPOTS bullets are used (none is fine). Returned y is from the top, as
 * the stylesheet places it.
 */
function parseHotspots(cell) {
  if (!cell) return [];
  return [...cell.querySelectorAll('li')].slice(0, MAX_HOTSPOTS).map((li) => {
    const parts = li.textContent.split('|').map((part) => part.trim());
    // the coordinates come first; a bullet without any "|" is either just them or just a title
    const coords = parts.length > 1 || /^[\d\s.,%]*$/.test(parts[0]) ? parts.shift() : '';
    const [x, y] = coords.split(',');
    const [title = '', ...text] = parts;
    return {
      x: normalizeCoordinate(x),
      y: 100 - normalizeCoordinate(y),
      title,
      text: text.join(' | '),
    };
  });
}

/**
 * "white curtain" entrance: while this section slides up, the previous section's content is
 * moved down by the distance scrolled, so it stays put and the white card covers it (only the
 * content moves: section boxes, which the navigation theme and the wheel stops read, do not);
 * the card's content is veiled until the card has filled the screen, then fades in
 */
function curtain(section, block) {
  let prev = section.previousElementSibling;
  while (prev && !prev.classList.contains('section')) prev = prev.previousElementSibling;
  const held = prev?.firstElementChild;
  let frame = 0;
  const update = () => {
    frame = 0;
    if (held) {
      const r = prev.getBoundingClientRect();
      const shift = Math.min(r.height, Math.max(0, -r.top));
      held.style.transform = shift ? `translate3d(0, ${shift.toFixed(1)}px, 0)` : '';
    }
    // not laid out yet (section still loading): decide once it is
    if (!section.offsetHeight) return;
    const { top } = section.getBoundingClientRect();
    // revealed once the card is in place; veiled again when it slides back down
    if (top <= 2) block.classList.add('hotspot-showcase-revealed');
    else if (top > window.innerHeight * 0.5) block.classList.remove('hotspot-showcase-revealed');
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  block.classList.add('hotspot-showcase-curtain');
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  new ResizeObserver(schedule).observe(section);
  update();
}

/** the figure takes the image's own ratio so hotspot percentages stay on the artwork */
function trackRatio(figure, img) {
  const apply = () => {
    if (img.naturalWidth && img.naturalHeight) {
      figure.style.setProperty('--figure-ratio', (img.naturalWidth / img.naturalHeight).toFixed(4));
    }
  };
  if (img.complete) apply();
  img.addEventListener('load', apply);
}

/**
 * browsers without CSS container units (cqw / cqh): the stage's own width and height as
 * --cq-w / --cq-h, which the CSS uses in their place (@supports not container-type)
 */
function containerUnits(container) {
  if (window.CSS?.supports?.('container-type', 'size')) return;
  const measure = () => {
    container.style.setProperty('--cq-w', `${container.clientWidth}px`);
    container.style.setProperty('--cq-h', `${container.clientHeight}px`);
  };
  if (window.ResizeObserver) new ResizeObserver(measure).observe(container);
  else window.addEventListener('resize', measure);
}

// Universal Editor model of one powertrain (block/item); published rows carry no model, so
// there a powertrain is any row with several cells (media | text | hotspots), the heading a
// single-cell row
const ITEM_MODEL = 'hotspot-showcase-item';

/**
 * a display copy of an authored part, without the editor's instrumentation (and ids): in
 * Universal Editor a powertrain's text and thumbnail stay in its own row, hidden, so the
 * content tree lists them under that powertrain, while the copy column and the tray show copies
 */
function displayCopy(part) {
  const copy = part.cloneNode(true);
  [copy, ...copy.querySelectorAll('*')].forEach((node) => {
    [...node.attributes].filter(({ name }) => /^data-(aue|richtext)-/.test(name) || name === 'id')
      .forEach(({ name }) => node.removeAttribute(name));
  });
  return copy;
}

/**
 * a powertrain's text for the copy column from its Title (plain text, made its heading) and
 * Description (rich text) fields; the description's own nodes when published, copies in the
 * editor (where both fields stay in the row)
 */
function textFrom(titleCell, descriptionCell, editing) {
  const text = document.createElement('div');
  const name = titleCell?.textContent.trim();
  if (name) {
    const heading = document.createElement('h3');
    heading.textContent = name;
    text.append(heading);
  }
  const description = descriptionCell && (editing ? displayCopy(descriptionCell) : descriptionCell);
  if (description) {
    const nodes = [...description.childNodes].filter((n) => n.nodeType !== Node.COMMENT_NODE);
    // a description typed without paragraphs still gets one
    if (nodes.some((n) => n.nodeType === Node.ELEMENT_NODE)) text.append(...nodes);
    else if (description.textContent.trim()) {
      const p = document.createElement('p');
      p.textContent = description.textContent.trim();
      text.append(p);
    }
  }
  return text;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  // Universal Editor: rich-text fields read as when published
  unwrapEditorRichtext(block);
  instance += 1;
  const id = `hotspot-showcase-${instance}`;
  const section = block.closest('.section');
  if (section) {
    section.dataset.jswTheme = 'light';
    if (!section.id && !document.getElementById('nev-tech')) section.id = 'nev-tech';
  }

  // Universal Editor: its markup is instrumented
  const editing = Boolean(block.closest('[data-aue-resource]'));
  const rows = [...block.children];
  // a powertrain just added in the editor has no images or text yet, but is shown (and editable)
  const itemRows = rows.filter((r) => r.dataset.aueModel === ITEM_MODEL || r.children.length > 1);
  const headRow = rows.find((r) => !itemRows.includes(r));

  const copy = el('div', 'hotspot-showcase-copy');
  if (headRow) {
    headRow.className = 'hotspot-showcase-heading';
    headRow.querySelector('h1, h2, h3')?.classList.add('hotspot-showcase-title');
    copy.append(headRow);
  }
  const detail = el('div', 'hotspot-showcase-detail');
  const counter = el('p', 'hotspot-showcase-counter');
  const texts = el('div', 'hotspot-showcase-texts', { 'aria-live': 'polite' });
  const thumbs = el('div', 'hotspot-showcase-thumbs', { role: 'tablist', 'aria-label': 'Powertrains' });
  detail.append(counter, texts, thumbs);
  copy.append(detail);

  const stage = el('div', 'hotspot-showcase-stage');
  containerUnits(stage);
  const tooltip = el('div', 'hotspot-showcase-tooltip', { id: `${id}-tooltip`, role: 'dialog', 'aria-modal': 'false' });
  tooltip.hidden = true;
  const tipTitle = el('p', 'hotspot-showcase-tooltip-title', { id: `${id}-tooltip-title` });
  const tipText = el('p', 'hotspot-showcase-tooltip-text');
  const tipClose = el('button', 'hotspot-showcase-tooltip-close', { type: 'button', 'aria-label': 'Close details' });
  tooltip.setAttribute('aria-labelledby', tipTitle.id);
  tooltip.append(tipTitle, tipText, tipClose);

  let openSpot = null;
  /**
   * the tooltip opens to the left of its hotspot and down, the hotspot in its top corner (as
   * in the design); where that would cut it off at the card's or the screen's edge it opens
   * to the right / up instead. Where neither side fits (narrow screens) it opens just below
   * (or above) the hotspot, centred on it and nudged in, the hotspot keeping its own box.
   */
  const placeTooltip = () => {
    const area = stage.getBoundingClientRect();
    const gap = 8;
    const left = Math.max(area.left, 0) + gap;
    const right = Math.min(area.right, document.documentElement.clientWidth) - gap;
    const bottom = Math.min(area.bottom, window.innerHeight) - gap;
    const set = (side, align) => {
      tooltip.dataset.side = side;
      tooltip.dataset.align = align;
      return tooltip.getBoundingClientRect();
    };
    tooltip.style.removeProperty('--tooltip-sx');
    let box = set('left', 'top');
    if (box.left < left) box = set('right', 'top');
    const apart = box.left < left || box.right > right;
    if (apart) box = set('center', 'below');
    if (box.bottom > bottom) box = set(tooltip.dataset.side, apart ? 'above' : 'bottom');
    if (box.right > right) tooltip.style.setProperty('--tooltip-sx', `${right - box.right}px`);
    else if (box.left < left) tooltip.style.setProperty('--tooltip-sx', `${left - box.left}px`);
    openSpot?.classList.toggle('hotspot-showcase-spot-apart', apart);
  };

  const closeTooltip = (refocus = false) => {
    if (!openSpot) return;
    const spot = openSpot;
    openSpot = null;
    spot.setAttribute('aria-expanded', 'false');
    spot.classList.remove('hotspot-showcase-spot-apart');
    tooltip.hidden = true;
    if (refocus) spot.focus();
  };
  const openTooltip = (spot, data) => {
    closeTooltip();
    openSpot = spot;
    spot.setAttribute('aria-expanded', 'true');
    tipTitle.textContent = data.title;
    tipText.textContent = data.text;
    spot.closest('.hotspot-showcase-figure').append(tooltip);
    tooltip.style.setProperty('--hotspot-x', `${data.x}%`);
    tooltip.style.setProperty('--hotspot-y', `${data.y}%`);
    tooltip.hidden = false;
    placeTooltip();
  };

  const items = itemRows.map((row, i) => {
    // cells in model order: media | title | description | hotspots; content written before the
    // title and description were split has media | text (title + description) | hotspots
    const cells = [...row.children];
    const split = cells.length > 3;
    const mediaCell = split ? cells[0] : cells.find((c) => c.querySelector('picture')) || cells[0];
    const hotCell = split ? cells[3] : cells.find((c) => c !== mediaCell && c.querySelector('li'))
      || (cells.length > 2 ? cells[2] : null);
    const [titleCell, descriptionCell] = split ? [cells[1], cells[2]] : [];
    const textCell = split ? null : cells.find((c) => c !== mediaCell && c !== hotCell);
    // the copy column's text: the powertrain's name as its heading, then the description
    const authored = split ? [titleCell, descriptionCell] : [textCell].filter(Boolean);
    let text = textCell && (editing ? displayCopy(textCell) : textCell);
    if (split) text = textFrom(titleCell, descriptionCell, editing);
    const pictures = [...(mediaCell?.querySelectorAll('picture') || [])];
    // in the editor each image names its field; published, the thumbnail comes first
    const fieldPicture = (name) => mediaCell?.querySelector(`[data-aue-prop="${name}"]`)?.closest('picture');
    const thumbPicture = fieldPicture('media_thumbnail') || pictures[0];
    const imagePicture = fieldPicture('media_image')
      || pictures.find((p) => p !== thumbPicture) || thumbPicture?.cloneNode(true);
    const title = text?.querySelector('h2, h3, h4')?.textContent.trim() || `Powertrain ${i + 1}`;

    // the item row becomes its panel (keeps the editor's item instrumentation)
    row.className = 'hotspot-showcase-panel';
    row.id = `${id}-panel-${i}`;
    row.setAttribute('role', 'tabpanel');
    row.setAttribute('aria-labelledby', `${id}-tab-${i}`);
    const figure = el('div', 'hotspot-showcase-figure');
    if (imagePicture) figure.append(imagePicture);
    const img = imagePicture?.querySelector('img');
    if (img) trackRatio(figure, img);
    parseHotspots(hotCell).forEach((spot) => {
      const btn = el('button', 'hotspot-showcase-spot', {
        type: 'button',
        'aria-label': spot.title ? `Show details: ${spot.title}` : 'Show details',
        'aria-expanded': 'false',
        'aria-controls': tooltip.id,
      });
      btn.style.setProperty('--hotspot-x', `${spot.x}%`);
      btn.style.setProperty('--hotspot-y', `${spot.y}%`);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (openSpot === btn) closeTooltip();
        else openTooltip(btn, spot);
      });
      figure.append(btn);
    });
    if (hotCell) hotCell.classList.add('hotspot-showcase-hotspot-source');
    // published: the thumbnail and the text move to the tray and the copy column; in the
    // editor they stay in this row, hidden (the media cell with the thumbnail, the text cell),
    // and the tray and the column show copies
    const thumbShown = editing && thumbPicture ? displayCopy(thumbPicture) : thumbPicture;
    if (editing && mediaCell) mediaCell.hidden = true;
    else mediaCell?.remove();
    row.prepend(figure);
    stage.append(row);

    // published, the authored text cells leave the row; in the editor they stay there, hidden
    authored.forEach((cell) => {
      if (editing) cell.hidden = true;
      else if (cell !== text) cell.remove();
    });
    if (text) {
      text.classList.add('hotspot-showcase-text');
      text.querySelector('h2, h3, h4')?.classList.add('hotspot-showcase-item-title');
      texts.append(text);
    }

    const tab = el('button', 'hotspot-showcase-thumb', {
      type: 'button', role: 'tab', id: `${id}-tab-${i}`, 'aria-controls': row.id, 'aria-label': title,
    });
    if (thumbShown) {
      thumbShown.querySelector('img')?.setAttribute('alt', '');
      tab.append(thumbShown);
    }
    thumbs.append(tab);
    return { row, text, tab };
  });

  let current = 0;
  /**
   * the images move like a vertical carousel (hotspot-showcase.css): picking a thumbnail to
   * the right pushes the current image up and out while the new one rises from the bottom;
   * one to the left pushes it down while the new one comes in from the top
   */
  const slideImages = (from, to) => {
    if (from === to) return;
    const dir = to > from ? 1 : -1;
    const incoming = items[to].row;
    incoming.style.transition = 'none';
    incoming.style.transform = `translateY(${dir * 100}%)`;
    incoming.getBoundingClientRect();
    ['transition', 'transform'].forEach((p) => incoming.style.removeProperty(p));
    items[from].row.style.transform = `translateY(${-dir * 100}%)`;
  };

  const select = (index, focus = false) => {
    const from = current;
    current = (index + items.length) % items.length;
    closeTooltip();
    if (items[from] && items[current]) slideImages(from, current);
    items.forEach(({ row, text, tab }, i) => {
      const active = i === current;
      row.classList.toggle('is-active', active);
      // the selected image flies on into the next section's card (parallax-collage)
      row.querySelector('.hotspot-showcase-figure')?.toggleAttribute('data-zoom-source', active);
      row.inert = !active;
      if (text) text.hidden = !active;
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.tabIndex = active ? 0 : -1;
    });
    counter.textContent = `${current + 1}/${items.length}`;
    if (focus) items[current].tab.focus();
  };

  items.forEach(({ tab }, i) => {
    tab.addEventListener('click', () => select(i));
    tab.addEventListener('keydown', (e) => {
      const step = {
        ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1,
      }[e.key];
      if (step) {
        e.preventDefault();
        select(current + step, true);
      }
    });
  });

  tipClose.addEventListener('click', () => closeTooltip(true));
  window.addEventListener('resize', () => {
    if (openSpot) placeTooltip();
  });
  document.addEventListener('click', (e) => {
    if (openSpot && !tooltip.contains(e.target)) closeTooltip();
  });
  block.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openSpot) closeTooltip(true);
  });

  block.replaceChildren(copy, stage);
  if (editing) block.classList.add('hotspot-showcase-editing');
  else if (section && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    curtain(section, block);
  }
  if (items.length) select(0);
}
