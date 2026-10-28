/*
 * jsw-footer-column: a navigation column of the JSW footer (scripts/jsw-footer-parts.js): its
 * heading (e.g. TECHNOLOGY), then its Footer Links, the first MAX_ITEMS shown on the page.
 * Rows (model, _jsw-footer-column.json): column heading, then the Footer Links (link + text).
 * Laid out with the rest of the footer by jsw-footer.css (the footer's section).
 */

import { fillColumn, splitRows } from '../../scripts/jsw-footer-parts.js';

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const editing = Boolean(block.closest('[data-aue-resource]'));
  const { fieldRow, itemRows } = splitRows(block, 'jsw-footer-link');
  fillColumn(block, fieldRow, itemRows, editing);
}
