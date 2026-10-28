/*
 * The parts of the JSW footer (blocks/jsw-footer, jsw-footer-column, jsw-footer-social), shared:
 * the footer is one section of its page (/jsw-footer) holding a jsw-footer block (logo,
 * copyright, button, privacy policy, background, layout), a jsw-footer-column block for each
 * navigation column (its heading, then its Footer Links) and a jsw-footer-social block (its
 * heading, CONNECT, then its Social Icons). So in Universal Editor each column holds its own links
 * and the social block its own icons, as in the content: adding to a column adds a Footer Link
 * inside it.
 */

import { moveInstrumentation } from './scripts.js';

// the most links a column shows on the page, and the most social icons: authors may add more,
// the page shows the first MAX_ITEMS only (.slice: the others are never put into it); the editor
// keeps the others too, but shows them only while editing (dimmed, so they can be found and
// removed), never in its Preview mode (jsw-footer.css)
export const MAX_ITEMS = 4;

// the most characters each text shows on the page, as the models' limits: a longer text, if saved
// anyway, is cut there with "…" (its whole wording as a tooltip); the editor shows every text whole
export const TEXT_LIMITS = {
  columnHeading: 20,
  linkText: 24,
  connectHeading: 20,
  networkName: 30,
};

export function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

/** an element's text cut to its limit with "…" (not in the editor), its whole text a tooltip */
export function cap(node, limit, editing) {
  const text = node.textContent.trim();
  if (editing || text.length <= limit) return;
  node.title = text;
  node.textContent = `${text.slice(0, limit).trimEnd()}…`;
}

/** a link without the site's button decoration (scripts.js decorateButtons) */
export function plain(a) {
  a.classList.remove('button', 'primary', 'secondary', 'accent');
  a.closest('p')?.classList.remove('button-container', 'button-wrapper');
  return a;
}

/** links off the site open in a new tab */
export function external(a) {
  try {
    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin && /^https?:$/.test(url.protocol)) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
  } catch (e) { /* keep it as it is */ }
  return a;
}

/** in the editor, an empty item's place: something to select (never on the page) */
export function placeholder(text) {
  const span = el('span', 'jsw-footer-placeholder');
  span.textContent = text;
  return span;
}

/** the text element of a row: its named field, else its first paragraph with a text */
export function textOf(row) {
  return row?.querySelector('[data-aue-prop]:not(a)')
    || [...(row?.querySelectorAll('p') || [])].find((p) => !p.querySelector('a, picture') && p.textContent.trim())
    || null;
}

/** a heading from a heading row's text (its editor instrumentation kept), else a placeholder */
export function buildHeading(row, limit, editing, emptyText) {
  const node = textOf(row);
  const heading = el('h2', 'jsw-footer-heading');
  if (node) {
    moveInstrumentation(node, heading);
    heading.append(...node.childNodes);
  }
  cap(heading, limit, editing);
  if (!heading.textContent.trim() && editing) heading.append(placeholder(emptyText));
  return heading;
}

/** an item not filled in yet (just added in the editor) */
export const isEmptyLink = (row) => !row.querySelector('a[href]')?.getAttribute('href')?.trim();
export const isEmptySocial = (row) => !row.querySelector('picture, a[href]');

/**
 * the item rows to build: on the page the first MAX_ITEMS filled-in ones; in the editor every
 * one, empty ones too, so each can be selected, moved and deleted
 */
export function rowsToBuild(rows, editing, isEmpty) {
  return editing ? rows : rows.filter((r) => !isEmpty(r)).slice(0, MAX_ITEMS);
}

/** in the editor, the filled-in items after the first MAX_ITEMS marked; empty ones not counted */
export function markOverLimit(built, editing, what) {
  if (!editing) return built;
  built.filter((item) => !item.classList.contains('is-empty')).slice(MAX_ITEMS).forEach((item) => {
    item.classList.add('is-over-limit');
    item.title = `Not shown on the page: only the first ${MAX_ITEMS} ${what} are.`;
  });
  return built;
}

/** a Footer Link: its link in a list item (the item's editor instrumentation on it) */
export function buildLink(row, editing) {
  const item = el('li', 'jsw-footer-link');
  moveInstrumentation(row, item);
  const a = row.querySelector('a');
  if (a && !isEmptyLink(row)) {
    external(plain(a));
    a.removeAttribute('class');
    cap(a, TEXT_LIMITS.linkText, editing);
    item.append(a);
  } else if (editing) {
    item.classList.add('is-empty');
    item.append(placeholder('New link'));
  }
  return item;
}

/**
 * a Social Icon: its link holding the icon and the network's name (the layouts show one or the
 * other, jsw-footer.css), the item's editor instrumentation on its list item
 */
export function buildSocialIcon(row, editing) {
  const item = el('li', 'jsw-footer-social-item');
  moveInstrumentation(row, item);
  const picture = row.querySelector('picture');
  const img = picture?.querySelector('img');
  const name = img?.getAttribute('alt')?.trim() || '';
  const authored = row.querySelector('a');
  const a = authored ? external(plain(authored)) : el('a');
  a.className = 'jsw-footer-social-link';
  if (isEmptySocial(row)) {
    item.classList.add('is-empty');
    a.replaceChildren(placeholder('New icon'));
    item.append(a);
    return item;
  }
  if (name) a.setAttribute('aria-label', name);
  // the link reads as the network's name: the icon is decoration
  if (img) img.alt = '';
  const label = el('span', 'jsw-footer-social-name', { 'aria-hidden': 'true' });
  label.textContent = name;
  cap(label, TEXT_LIMITS.networkName, editing);
  a.replaceChildren(...(picture ? [picture] : []), label);
  item.append(a);
  return item;
}

/**
 * a column: its heading, then its links' list, from the heading row and the link rows
 * @param {Element} block the column's element (its rows replaced)
 * @param {Element} headingRow the row holding the column heading
 * @param {Element[]} linkRows the Footer Links' rows
 * @param {boolean} editing in the editor
 */
export function fillColumn(block, headingRow, linkRows, editing) {
  const heading = buildHeading(headingRow, TEXT_LIMITS.columnHeading, editing, 'Column heading');
  const list = el('ul', 'jsw-footer-links');
  const built = rowsToBuild(linkRows, editing, isEmptyLink).map((r) => buildLink(r, editing));
  list.append(...markOverLimit(built, editing, 'links'));
  block.replaceChildren(...(heading.textContent.trim() ? [heading] : []), list);
}

/**
 * the social links: their heading (CONNECT), then their list, from the heading row and the
 * Social Icon rows
 */
export function fillSocial(block, headingRow, iconRows, editing) {
  const heading = buildHeading(headingRow, TEXT_LIMITS.connectHeading, editing, 'Social heading');
  const list = el('ul', 'jsw-footer-social-list');
  const built = rowsToBuild(iconRows, editing, isEmptySocial)
    .map((r) => buildSocialIcon(r, editing));
  list.append(...markOverLimit(built, editing, 'social icons'));
  block.replaceChildren(...(heading.textContent.trim() ? [heading] : []), list);
}

/**
 * a block's field row and item rows: the items are told by their model (the editor), else
 * (imported and published content) they are the rows after the field row
 * @param {Element} block the block
 * @param {string} itemModel the items' model id
 * @returns {{fieldRow: Element, itemRows: Element[]}}
 */
export function splitRows(block, itemModel) {
  const rows = [...block.children];
  const isItem = (row) => row.dataset.aueModel === itemModel;
  if (!rows.some(isItem)) {
    // the field row holds a text only: a first row with a link or picture is an item
    if (rows[0]?.querySelector('a, picture')) return { fieldRow: null, itemRows: rows };
    return { fieldRow: rows[0] || null, itemRows: rows.slice(1) };
  }
  return { fieldRow: rows.find((r) => !isItem(r)) || null, itemRows: rows.filter(isItem) };
}
