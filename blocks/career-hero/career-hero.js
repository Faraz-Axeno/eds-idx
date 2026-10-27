/*
 * career-hero: the JSW careers page's first section ("Phase 5 / Hero"): a photo behind the
 * whole section, the JSW navigation, the heading with a SCROLL label beside it, and under them
 * three stat cards (subtitle, figure, description) side by side. The section is a screen tall
 * less the cards' top edge, which shows at the foot of the screen; the rest of the cards comes
 * into view by scrolling the page as usual (no scroll effects).
 * Rows (model, _career-hero.json), told apart by what they are, not by their place:
 *   background image (+ alt) — the one-cell row with a picture
 *   heading, scroll label    — one-cell text rows (in the editor named by data-aue-prop),
 *                              else in that order
 *   Stat Cards (items)       — subtitle | stat value | description: the first MAX_CARDS shown
 */

import { loadJswNav } from '../../scripts/jsw-pill-nav.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

// the stat cards shown: those after them are left out of the page (the editor shows them
// dimmed, so they can be edited or removed)
const MAX_CARDS = 3;

// the most characters each text shows on the page, as the model's limits (_career-hero.json):
// a longer text, if saved anyway, is cut there with "…" (its whole wording as a tooltip); the
// editor shows every text whole
const TEXT_LIMITS = {
  heading: 25,
  scrollLabel: 12,
  subtitle: 32,
  statValue: 8,
  description: 80,
};

const MOUSE_ICON = '<svg viewBox="0 0 10 14" aria-hidden="true" focusable="false"><rect x="0.6" y="0.6" width="8.8" height="12.8" rx="4.4" fill="none" stroke="currentColor" stroke-width="1.1"/><path d="M5 3.4v2.4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>';

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

const cellsOf = (row) => [...(row?.children || [])];

/** an element of another tag, with the authored element's content and editor instrumentation */
function retag(node, tag, className) {
  const out = el(tag, className);
  if (!node) return out;
  moveInstrumentation(node, out);
  out.append(...[...node.childNodes].map((n) => (node.tagName === 'DIV' ? n.cloneNode(true) : n)));
  if (node.tagName !== 'DIV') node.replaceWith(out);
  return out;
}

/** a one-field cell's text element: its paragraph, else the cell itself */
const textOf = (cell) => cell?.querySelector('[data-aue-prop]') || cell?.querySelector('p') || cell;

/** an element's text cut to its limit with "…" (not in the editor), its whole text a tooltip */
function cap(node, limit, editing) {
  const text = node.textContent.trim();
  if (editing || text.length <= limit) return;
  node.title = text;
  node.textContent = `${text.slice(0, limit).trimEnd()}…`;
}

/**
 * the block's rows by what they are: the picture row, the text rows (heading, scroll label)
 * and the Stat Card items (several cells, or marked as items by the editor)
 */
function sortRows(rows) {
  const cards = [];
  const texts = [];
  let picture = null;
  rows.forEach((row) => {
    const cells = cellsOf(row);
    if (row.dataset.aueModel?.endsWith('-stat') || cells.length > 1) cards.push(row);
    else if (row.querySelector('picture')) picture = picture || row.querySelector('picture');
    else if (cells[0]?.textContent.trim() || cells[0]?.querySelector('[data-aue-prop]')) {
      texts.push(cells[0]);
    }
  });
  // in the editor each field is named; else the heading is the longer text, the label the other
  const named = (name) => texts.find((c) => c.querySelector(`[data-aue-prop="${name}"]`));
  const length = (cell) => cell.textContent.trim().length;
  const longest = [...texts].sort((a, b) => length(b) - length(a));
  const headingCell = named('heading')
    || longest.find((c) => !c.querySelector('[data-aue-prop="scrollLabel"]')) || null;
  const scrollCell = named('scrollLabel') || texts.find((c) => c !== headingCell) || null;
  return {
    picture, headingCell, scrollCell, cards,
  };
}

function buildCard(row, editing) {
  const [subtitleCell, valueCell, descriptionCell] = cellsOf(row);
  const card = el('li', 'career-hero-card');
  moveInstrumentation(row, card);
  const subtitle = retag(textOf(subtitleCell), 'p', 'career-hero-card-subtitle');
  const value = retag(textOf(valueCell), 'p', 'career-hero-card-value');
  const description = retag(textOf(descriptionCell), 'p', 'career-hero-card-description');
  cap(subtitle, TEXT_LIMITS.subtitle, editing);
  cap(value, TEXT_LIMITS.statValue, editing);
  cap(description, TEXT_LIMITS.description, editing);
  const foot = el('div', 'career-hero-card-foot');
  foot.append(value, description);
  card.append(subtitle, foot);
  return card;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const editing = Boolean(block.closest('[data-aue-resource]'));
  const {
    picture, headingCell, scrollCell, cards,
  } = sortRows([...block.children]);

  const media = el('div', 'career-hero-media');
  if (picture) {
    picture.querySelector('img')?.setAttribute('loading', 'eager');
    media.append(picture);
  }

  // the top: a screen tall less the cards' top edge, the heading and scroll label at its foot
  const top = el('div', 'career-hero-top');
  const heading = retag(textOf(headingCell), 'h1', 'career-hero-heading');
  if (!heading.textContent.trim()) heading.textContent = 'THE WORLD NEEDS PIONEERS';
  cap(heading, TEXT_LIMITS.heading, editing);
  const scroll = el('p', 'career-hero-scroll', { 'aria-hidden': 'true' });
  scroll.innerHTML = MOUSE_ICON;
  const scrollLabel = retag(textOf(scrollCell), 'span', 'career-hero-scroll-label');
  if (!scrollLabel.textContent.trim()) scrollLabel.textContent = 'SCROLL';
  cap(scrollLabel, TEXT_LIMITS.scrollLabel, editing);
  scroll.append(scrollLabel);
  top.append(heading, scroll);

  // the cards: the first MAX_CARDS; in the editor the others too, dimmed
  const list = el('ul', 'career-hero-cards');
  cards.forEach((row, i) => {
    if (i >= MAX_CARDS && !editing) return;
    const card = buildCard(row, editing);
    if (i >= MAX_CARDS) {
      card.classList.add('is-over-limit');
      const note = el('p', 'career-hero-card-limit');
      note.textContent = `Not shown on the page: only the first ${MAX_CARDS} cards are.`;
      card.append(note);
    }
    list.append(card);
  });

  const inner = el('div', 'career-hero-inner');
  inner.append(top, list);
  block.replaceChildren(media, inner);
  if (editing) block.classList.add('career-hero-editing');
  // the JSW navigation over the photo, once read from /jsw-phase-3
  loadJswNav().then((nav) => block.prepend(nav));
}
