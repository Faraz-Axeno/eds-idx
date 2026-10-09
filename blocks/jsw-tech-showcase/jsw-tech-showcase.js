/*
 * jsw-tech-showcase: white card, copy + thumbnail tray on the left, showcase image with
 * hotspots on the right.
 * Rows: a heading row, then one row per powertrain with
 *   media    — thumbnail picture, then showcase picture
 *   text     — title (h3) + description
 *   hotspots — list items "x%, y% | TITLE | description" (position over the showcase image)
 * Thumbnails are tabs: selecting one swaps the showcase image, counter and copy.
 * A hotspot opens a frosted tooltip; clicking outside or Escape closes it.
 */

const HOTSPOT = /^\s*(\d+(?:\.\d+)?)\s*%?\s*,\s*(\d+(?:\.\d+)?)\s*%?\s*\|\s*([^|]+?)\s*\|\s*([\s\S]+)$/;
let instance = 0;

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

function parseHotspots(cell) {
  if (!cell) return [];
  return [...cell.querySelectorAll('li')].map((li) => li.textContent.match(HOTSPOT)).filter(Boolean)
    .map(([, x, y, title, text]) => ({
      x: Math.min(100, +x), y: Math.min(100, +y), title: title.trim(), text: text.trim(),
    }));
}

/** the figure takes the image's own ratio so hotspot percentages stay on the artwork */
function trackRatio(figure, img) {
  const apply = () => {
    if (img.naturalWidth && img.naturalHeight) {
      figure.style.setProperty('--jsw-ratio', (img.naturalWidth / img.naturalHeight).toFixed(4));
    }
  };
  if (img.complete) apply();
  img.addEventListener('load', apply);
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  instance += 1;
  const id = `jsw-tech-${instance}`;
  const section = block.closest('.section');
  if (section) {
    section.dataset.jswTheme = 'light';
    if (!section.id && !document.getElementById('nev-tech')) section.id = 'nev-tech';
  }

  const rows = [...block.children];
  const itemRows = rows.filter((r) => r.querySelector('picture'));
  const headRow = rows.find((r) => !itemRows.includes(r));

  const copy = el('div', 'jsw-tech-copy');
  if (headRow) {
    headRow.className = 'jsw-tech-heading';
    headRow.querySelector('h1, h2, h3')?.classList.add('jsw-tech-title');
    copy.append(headRow);
  }
  const detail = el('div', 'jsw-tech-detail');
  const counter = el('p', 'jsw-tech-counter');
  const texts = el('div', 'jsw-tech-texts', { 'aria-live': 'polite' });
  const thumbs = el('div', 'jsw-tech-thumbs', { role: 'tablist', 'aria-label': 'Powertrains' });
  detail.append(counter, texts, thumbs);
  copy.append(detail);

  const stage = el('div', 'jsw-tech-stage');
  const tooltip = el('div', 'jsw-tech-tooltip', { id: `${id}-tooltip`, role: 'dialog', 'aria-modal': 'false' });
  tooltip.hidden = true;
  const tipTitle = el('p', 'jsw-tech-tooltip-title', { id: `${id}-tooltip-title` });
  const tipText = el('p', 'jsw-tech-tooltip-text');
  const tipClose = el('button', 'jsw-tech-tooltip-close', { type: 'button', 'aria-label': 'Close details' });
  tooltip.setAttribute('aria-labelledby', tipTitle.id);
  tooltip.append(tipTitle, tipText, tipClose);

  let openSpot = null;
  const closeTooltip = (refocus = false) => {
    if (!openSpot) return;
    const spot = openSpot;
    openSpot = null;
    spot.setAttribute('aria-expanded', 'false');
    tooltip.hidden = true;
    if (refocus) spot.focus();
  };
  const openTooltip = (spot, data) => {
    closeTooltip();
    openSpot = spot;
    spot.setAttribute('aria-expanded', 'true');
    tipTitle.textContent = data.title;
    tipText.textContent = data.text;
    spot.closest('.jsw-tech-figure').append(tooltip);
    tooltip.style.setProperty('--jsw-x', `${data.x}%`);
    tooltip.style.setProperty('--jsw-y', `${data.y}%`);
    tooltip.dataset.side = data.x > 55 ? 'left' : 'right';
    tooltip.dataset.align = data.y > 70 ? 'bottom' : 'top';
    tooltip.hidden = false;
  };

  const items = itemRows.map((row, i) => {
    const cells = [...row.children];
    const mediaCell = cells.find((c) => c.querySelector('picture'));
    const pictures = [...mediaCell.querySelectorAll('picture')];
    const thumbPicture = pictures[0];
    const imagePicture = pictures[1] || pictures[0].cloneNode(true);
    const hotCell = cells.find((c) => c !== mediaCell && c.querySelector('li'));
    const textCell = cells.find((c) => c !== mediaCell && c !== hotCell);
    const title = textCell?.querySelector('h2, h3, h4')?.textContent.trim() || `Powertrain ${i + 1}`;

    // the item row becomes its panel (keeps the editor's item instrumentation)
    row.className = 'jsw-tech-panel';
    row.id = `${id}-panel-${i}`;
    row.setAttribute('role', 'tabpanel');
    row.setAttribute('aria-labelledby', `${id}-tab-${i}`);
    const figure = el('div', 'jsw-tech-figure');
    figure.append(imagePicture);
    const img = imagePicture.querySelector('img');
    if (img) trackRatio(figure, img);
    parseHotspots(hotCell).forEach((spot) => {
      const btn = el('button', 'jsw-hotspot', {
        type: 'button',
        'aria-label': `Show details: ${spot.title}`,
        'aria-expanded': 'false',
        'aria-controls': tooltip.id,
      });
      btn.style.setProperty('--jsw-x', `${spot.x}%`);
      btn.style.setProperty('--jsw-y', `${spot.y}%`);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (openSpot === btn) closeTooltip();
        else openTooltip(btn, spot);
      });
      figure.append(btn);
    });
    if (hotCell) hotCell.classList.add('jsw-tech-hotspot-source');
    mediaCell.remove();
    row.prepend(figure);
    stage.append(row);

    if (textCell) {
      textCell.classList.add('jsw-tech-text');
      textCell.querySelector('h2, h3, h4')?.classList.add('jsw-tech-item-title');
      texts.append(textCell);
    }

    const tab = el('button', 'jsw-tech-thumb', {
      type: 'button', role: 'tab', id: `${id}-tab-${i}`, 'aria-controls': row.id, 'aria-label': title,
    });
    thumbPicture.querySelector('img')?.setAttribute('alt', '');
    tab.append(thumbPicture);
    thumbs.append(tab);
    return { row, textCell, tab };
  });

  let current = 0;
  const select = (index, focus = false) => {
    current = (index + items.length) % items.length;
    closeTooltip();
    items.forEach(({ row, textCell, tab }, i) => {
      const active = i === current;
      row.classList.toggle('is-active', active);
      row.inert = !active;
      if (textCell) textCell.hidden = !active;
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
  document.addEventListener('click', (e) => {
    if (openSpot && !tooltip.contains(e.target)) closeTooltip();
  });
  block.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openSpot) closeTooltip(true);
  });

  block.replaceChildren(copy, stage);
  if (block.closest('[data-aue-resource]')) block.classList.add('jsw-tech-editing');
  if (items.length) select(0);
}
