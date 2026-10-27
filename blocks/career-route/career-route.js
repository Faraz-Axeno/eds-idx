/*
 * career-route: the JSW careers page's "route in" section ("Phase 5 / Route In"): an office photo
 * behind the whole section, the heading at its top left, and at its foot four frosted-glass step
 * cards side by side (number, title, description). A static section: no scroll effects.
 * Rows (model, _career-route.json), told apart by what they are, not by their place:
 *   background image (+ alt) — the one-cell row with a picture
 *   heading                  — the one-cell text row
 *   Route Steps (items)      — step number | step title (stepHeading) | step description: the
 *                              first MAX_STEPS go into the page
 */

import { moveInstrumentation } from '../../scripts/scripts.js';

// the route steps on the page: only the first MAX_STEPS are put into it (the editor also shows
// the others, dimmed, so authors can find and remove them)
const MAX_STEPS = 4;

// the most characters each text shows on the page, as the model's limits (_career-route.json):
// a longer text, if saved anyway, is cut there with "…" (its whole wording as a tooltip); the
// editor shows every text whole
const TEXT_LIMITS = {
  heading: 38,
  stepNumber: 3,
  stepTitle: 30,
  stepDescription: 105,
};

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

/** a one-field cell's text element: its named field, its paragraph, else the cell itself */
const textOf = (cell) => cell?.querySelector('[data-aue-prop]') || cell?.querySelector('p') || cell;

/** an element's text cut to its limit with "…" (not in the editor), its whole text a tooltip */
function cap(node, limit, editing) {
  const text = node.textContent.trim();
  if (editing || text.length <= limit) return;
  node.title = text;
  node.textContent = `${text.slice(0, limit).trimEnd()}…`;
}

/** the block's rows by what they are: the picture row, the heading row, the Route Step items */
function sortRows(rows) {
  const steps = [];
  const texts = [];
  let picture = null;
  rows.forEach((row) => {
    const cells = cellsOf(row);
    if (row.dataset.aueModel?.endsWith('-step') || cells.length > 1) steps.push(row);
    else if (row.querySelector('picture')) picture = picture || row.querySelector('picture');
    else if (cells[0]?.textContent.trim() || cells[0]?.querySelector('[data-aue-prop]')) {
      texts.push(cells[0]);
    }
  });
  const headingCell = texts.find((c) => c.querySelector('[data-aue-prop="heading"]')) || texts[0] || null;
  return { picture, headingCell, steps };
}

function buildStep(row, editing) {
  const [numberCell, titleCell, descriptionCell] = cellsOf(row);
  const step = el('li', 'career-route-step');
  moveInstrumentation(row, step);
  const number = retag(textOf(numberCell), 'p', 'career-route-step-number');
  const title = retag(textOf(titleCell), 'h3', 'career-route-step-title');
  const description = retag(textOf(descriptionCell), 'p', 'career-route-step-description');
  cap(number, TEXT_LIMITS.stepNumber, editing);
  cap(title, TEXT_LIMITS.stepTitle, editing);
  cap(description, TEXT_LIMITS.stepDescription, editing);
  const text = el('div', 'career-route-step-text');
  text.append(title, description);
  step.append(number, text);
  return step;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const editing = Boolean(block.closest('[data-aue-resource]'));
  const { picture, headingCell, steps } = sortRows([...block.children]);

  // the photo behind everything
  const media = el('div', 'career-route-media');
  if (picture) media.append(picture);

  const heading = retag(textOf(headingCell), 'h2', 'career-route-heading');
  cap(heading, TEXT_LIMITS.heading, editing);

  // the first MAX_STEPS steps; in the editor the others too, dimmed
  const list = el('ol', 'career-route-steps');
  (editing ? steps : steps.slice(0, MAX_STEPS)).forEach((row, i) => {
    const step = buildStep(row, editing);
    if (i >= MAX_STEPS) {
      step.classList.add('is-over-limit');
      const note = el('p', 'career-route-step-limit');
      note.textContent = `Not shown on the page: only the first ${MAX_STEPS} steps are.`;
      step.append(note);
    }
    list.append(step);
  });

  const inner = el('div', 'career-route-inner');
  inner.append(heading, list);
  block.replaceChildren(media, inner);
  if (editing) block.classList.add('career-route-editing');
}
