/* eslint-disable */
/* global WebImporter */
/**
 * Parser for mg-section-nav. Base: section-nav (custom). Source: https://www.mgselect.co.in/
 * Generated: 2026-10-05
 *
 * Block contract (blocks/mg-section-nav/mg-section-nav.js + _mg-section-nav.json, xwalk):
 *   No authored content - the JS builds one segment per main > .section at runtime.
 *   Model has a single optional, non-rendered `label` field -> emit one row with an empty cell
 *   (empty cells carry no field hint) so the block still exists in the imported content.
 *
 * Source (validated against migration-work/block-context/mg-section-nav/source.html):
 *   div.scroller > .mg-select__pagination > span.mg-select__pagination-indicator (x6, runtime dots only)
 */
export default function parse(element, { document }) {
  // The pagination dots are runtime chrome, not content - nothing to extract.
  const cells = [['']];
  const block = WebImporter.Blocks.createBlock(document, { name: 'mg-section-nav', cells });
  element.replaceWith(block);
}
