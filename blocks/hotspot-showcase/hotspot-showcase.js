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
// at most this many powertrains (Showcase Items, the client's limit): further items are ignored
const MAX_ITEMS = 3;
// the editor filter of a block that has all of them (_hotspot-showcase.json: allows nothing)
const FULL_FILTER = 'hotspot-showcase-full';
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
 * a hotspot bullet with new coordinates (x, y in the authoring system: % of the image from its
 * bottom-left corner), its title and description kept as written
 */
function withCoordinates(line, x, y) {
  const parts = line.split('|').map((part) => part.trim());
  // as parseHotspots: the coordinates come first, unless the bullet is just a title
  const rest = parts.length > 1 || /^[\d\s.,%]*$/.test(parts[0]) ? parts.slice(1) : parts;
  return [`${x}, ${y}`, ...rest].join(' | ');
}

/**
 * saves a powertrain's Hotspots field (its bullets, as rich text) to AEM: the item's own node,
 * named by its editor resource, through AEM's content-saving (Sling POST) endpoint with the
 * signed-in author's session and AEM's CSRF token
 */
async function saveHotspots(row, lines) {
  const path = (row.dataset.aueResource || '').replace(/^urn:aemconnection:/, '');
  if (!path.startsWith('/content/')) throw new Error(`no AEM path for ${row.dataset.aueResource}`);
  const list = document.createElement('ul');
  lines.forEach((line) => {
    const li = document.createElement('li');
    li.textContent = line;
    list.append(li);
  });
  const tokenResponse = await fetch('/libs/granite/csrf/token.json', { credentials: 'same-origin' });
  const { token } = await tokenResponse.json();
  const body = new FormData();
  body.append('hotspots', list.outerHTML);
  body.append('_charset_', 'utf-8');
  const response = await fetch(path, {
    method: 'POST', body, credentials: 'same-origin', headers: { 'CSRF-Token': token },
  });
  if (!response.ok) throw new Error(`saving ${path} failed: ${response.status}`);
}

/**
 * Universal Editor, preview mode: a + can be dragged over its image; on drop its new position
 * replaces that bullet's coordinates in the powertrain's Hotspots field (saved to AEM) and the
 * canvas reloads so the editor shows the new value. A plain click still opens the tooltip.
 */
function makeDraggable(btn, {
  figure, row, hotCell, index, isPreview,
}) {
  let drag = null;
  let dragged = false;
  btn.addEventListener('pointerdown', (e) => {
    if (!isPreview() || e.button !== 0) return;
    const box = btn.getBoundingClientRect();
    // where on the + it was taken: it is centred on its coordinates
    drag = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      dx: e.clientX - (box.left + box.width / 2),
      dy: e.clientY - (box.top + box.height / 2),
      moved: false,
    };
    dragged = false;
  });
  btn.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 4) return;
    if (!drag.moved) {
      drag.moved = true;
      btn.setPointerCapture(e.pointerId);
    }
    const area = figure.getBoundingClientRect();
    const left = Math.min(100, Math.max(0, ((e.clientX - drag.dx - area.left) / area.width) * 100));
    const top = Math.min(100, Math.max(0, ((e.clientY - drag.dy - area.top) / area.height) * 100));
    btn.style.setProperty('--hotspot-x', `${left}%`);
    btn.style.setProperty('--hotspot-y', `${top}%`);
    drag.left = left;
    drag.top = top;
  });
  const end = async (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { moved, left, top } = drag;
    drag = null;
    if (!moved || left === undefined) return;
    dragged = true;
    const items = [...(hotCell?.querySelectorAll('li') || [])].map((li) => li.textContent.trim());
    if (!items[index] && items[index] !== '') return;
    // the authoring system: x from the left, y up from the bottom, one decimal
    const round = (n) => Math.round(n * 10) / 10;
    items[index] = withCoordinates(items[index], round(left), round(100 - top));
    btn.classList.add('hotspot-showcase-spot-saving');
    try {
      await saveHotspots(row, items);
      window.location.reload();
    } catch (error) {
      btn.classList.remove('hotspot-showcase-spot-saving');
      // eslint-disable-next-line no-console
      console.error(error);
      // eslint-disable-next-line no-alert
      window.alert('The new hotspot position could not be saved. Please enter it in the Hotspots field.');
    }
  };
  btn.addEventListener('pointerup', end);
  btn.addEventListener('pointercancel', (e) => {
    if (drag && e.pointerId === drag.id) drag = null;
  });
  // the click that ends a drag does not open the tooltip
  btn.addEventListener('click', (e) => {
    if (!dragged) return;
    dragged = false;
    e.stopImmediatePropagation();
  }, { capture: true });
}

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
  // and in its preview mode (aue:ui-preview / aue:ui-edit) the + points can be dragged
  let previewing = false;
  if (editing) {
    document.addEventListener('aue:ui-preview', () => {
      previewing = true;
      block.classList.add('hotspot-showcase-previewing');
    });
    document.addEventListener('aue:ui-edit', () => {
      previewing = false;
      block.classList.remove('hotspot-showcase-previewing');
    });
  }
  const rows = [...block.children];
  // a powertrain just added in the editor has no images or text yet, but is shown (and editable)
  const allItemRows = rows.filter((r) => r.dataset.aueModel === ITEM_MODEL
    || r.children.length > 1);
  const headRow = rows.find((r) => !allItemRows.includes(r));
  // at most MAX_ITEMS powertrains (the client's limit); in the editor the others stay in the
  // block, hidden, so they can still be picked in the content tree (and removed)
  const itemRows = allItemRows.slice(0, MAX_ITEMS);
  const extraRows = allItemRows.slice(MAX_ITEMS);

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
    // in the editor every powertrain's image is ready the moment it is picked
    if (img && editing) img.loading = 'eager';
    parseHotspots(hotCell).forEach((spot, index) => {
      const btn = el('button', 'hotspot-showcase-spot', {
        type: 'button',
        'aria-label': spot.title ? `Show details: ${spot.title}` : 'Show details',
        'aria-expanded': 'false',
        'aria-controls': tooltip.id,
      });
      btn.style.setProperty('--hotspot-x', `${spot.x}%`);
      btn.style.setProperty('--hotspot-y', `${spot.y}%`);
      // in the editor's preview mode a + can be dragged to its place (saved to its field)
      if (editing) {
        makeDraggable(btn, {
          figure, row, hotCell, index, isPreview: () => previewing,
        });
      }
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (openSpot === btn) closeTooltip();
        else openTooltip(btn, spot);
      });
      figure.append(btn);
    });
    // published: the thumbnail and the text move to the tray and the copy column; in the
    // editor they stay in this row (so the content tree lists them under this powertrain), and
    // the tray and the column show copies; each authored field is then an invisible box laid
    // over what shows it (placeFields), so picking it in the content tree outlines it there
    const thumbShown = editing && thumbPicture ? displayCopy(thumbPicture) : thumbPicture;
    const tab = el('button', 'hotspot-showcase-thumb', {
      type: 'button', role: 'tab', id: `${id}-tab-${i}`, 'aria-controls': row.id, 'aria-label': title,
    });
    const fields = []; // [authored field, what shows it (see placeFields), clickable on the canvas]
    if (editing) {
      if (mediaCell) fields.push([mediaCell, 'thumbnail', true]);
      if (split) {
        fields.push([titleCell, 'title', true]);
        fields.push([descriptionCell, 'description', true]);
      } else if (textCell) fields.push([textCell, 'text', true]);
      // the hotspots field sits over the image, letting clicks through to the image and the +
      if (hotCell) fields.push([hotCell, 'image', false]);
      fields.forEach(([cell, , clickable]) => {
        cell.classList.add('hotspot-showcase-field');
        cell.classList.toggle('hotspot-showcase-field-passive', !clickable);
      });
    } else if (hotCell) hotCell.classList.add('hotspot-showcase-hotspot-source');
    if (!editing) mediaCell?.remove();
    row.prepend(figure);
    stage.append(row);

    // published, the authored text cells leave the row; in the editor they stay there
    authored.forEach((cell) => {
      if (!editing && cell !== text) cell.remove();
    });
    if (text) {
      text.classList.add('hotspot-showcase-text');
      text.querySelector('h2, h3, h4')?.classList.add('hotspot-showcase-item-title');
      texts.append(text);
    }

    if (thumbShown) {
      thumbShown.querySelector('img')?.setAttribute('alt', '');
      tab.append(thumbShown);
    }
    thumbs.append(tab);
    return {
      row, text, tab, figure, fields,
    };
  });

  let current = 0;
  /**
   * Universal Editor: lays each powertrain's authored fields over what shows them (the title
   * and description in the copy column, the thumbnail in the tray, the hotspots over the
   * image), in the row's own coordinates
   */
  const placeFields = () => {
    // only the powertrain shown has its text and image on screen: every powertrain's text and
    // hotspots fields sit over those (the slots the editor will show them in once picked, as
    // it measures a field before saying which one it picked), its thumbnail over its own
    const shown = items[current];
    // a powertrain's image keeps its size while hidden (its row is only moved out of view):
    // its hotspots field goes where the image sits once shown, in the place of the shown row
    const rest = shown?.row.getBoundingClientRect();
    const atRest = (item, box) => {
      const base = item.row.getBoundingClientRect();
      const dx = rest.left - base.left;
      const dy = rest.top - base.top;
      return {
        left: box.left + dx, top: box.top + dy, right: box.right + dx, bottom: box.bottom + dy,
      };
    };
    const target = (item, kind) => ({
      thumbnail: [item.tab],
      title: [shown?.text?.querySelector('h3')],
      description: [...(shown?.text?.querySelectorAll('p') || [])],
      text: [shown?.text],
      image: [item.figure],
    })[kind].filter(Boolean).map((node) => {
      const box = node.getBoundingClientRect();
      if (!box.width || !box.height) return null;
      return kind === 'image' ? atRest(item, box) : box;
    }).filter(Boolean);
    items.forEach((item) => {
      const base = item.row.getBoundingClientRect();
      item.fields.forEach(([cell, kind]) => {
        const boxes = target(item, kind);
        const left = Math.min(...boxes.map((box) => box.left));
        const top = Math.min(...boxes.map((box) => box.top));
        const right = Math.max(...boxes.map((box) => box.right));
        const bottom = Math.max(...boxes.map((box) => box.bottom));
        Object.assign(cell.style, boxes.length ? {
          left: `${left - base.left}px`,
          top: `${top - base.top}px`,
          width: `${right - left}px`,
          height: `${bottom - top}px`,
        } : {
          left: '0', top: '0', width: '0', height: '0',
        });
      });
    });
  };

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
    if (editing) placeFields();
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
  if (editing) {
    block.classList.add('hotspot-showcase-editing');
    // a selected field is scrolled into view by the editor: the hidden powertrains wait below
    // or above the image area, and the editor would scroll the clipped image area (or the card)
    // to them, sliding the shown powertrain out of sight; they never scroll
    [block, stage].forEach((box) => box.addEventListener('scroll', () => {
      box.scrollTop = 0;
      box.scrollLeft = 0;
    }));
    // with MAX_ITEMS powertrains the block takes no more: its filter becomes one that allows
    // nothing (component-filters), so the editor offers no "+" (add) or duplicate for it; the
    // editor redecorates the block after every change, so removing one brings them back
    if (allItemRows.length >= MAX_ITEMS) block.dataset.aueFilter = FULL_FILTER;
    // the authored fields follow what shows them as the layout settles or changes
    const relayout = () => requestAnimationFrame(placeFields);
    new ResizeObserver(relayout).observe(block);
    [copy, thumbs, stage].forEach((part) => new ResizeObserver(relayout).observe(part));
    block.querySelectorAll('img').forEach((img) => img.addEventListener('load', relayout));
    // the selected thumbnail lifts a little (a short transition)
    items.forEach(({ tab }) => tab.addEventListener('transitionend', relayout));
    window.addEventListener('resize', relayout);
    // items beyond the limit: not shown, but still in the content tree
    if (extraRows.length) {
      const extra = el('div', 'hotspot-showcase-extra');
      extra.hidden = true;
      extra.append(...extraRows);
      block.append(extra);
    }
    // picking a powertrain, or one of its fields, in the content tree or on the canvas shows
    // that powertrain: only the selected one is visible in the carousel, so otherwise its image
    // would be outlined but hidden (Universal Editor's aue:ui-select event)
    document.addEventListener('aue:ui-select', (e) => {
      const { resource, selected } = e.detail || {};
      if (!selected || !resource || !block.isConnected) return;
      const index = items.findIndex(({ row }) => row.dataset.aueResource === resource);
      if (index >= 0 && index !== current) select(index);
    });
  } else if (section && window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    curtain(section, block);
  }
  if (items.length) select(0);
}
