/*
 * jsw-footer-social: the social links of the JSW footer (scripts/jsw-footer-parts.js): their
 * heading (CONNECT), then the Social Icons, the first MAX_ITEMS shown on the page; as icons in
 * tiles or (the Phase 3 layout) as their networks' names, jsw-footer.css.
 * Rows (model, _jsw-footer-social.json): social heading, then the Social Icons (icon image +
 * network name | icon link). Laid out with the rest of the footer by jsw-footer.css.
 */

import { fillSocial, splitRows } from '../../scripts/jsw-footer-parts.js';

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const editing = Boolean(block.closest('[data-aue-resource]'));
  const { fieldRow, itemRows } = splitRows(block, 'jsw-footer-social-icon');
  fillSocial(block, fieldRow, itemRows, editing);
}
