/*
 * jsw-nav: the JSW navigation, authored once on its own page (/jsw-nav) and shown on every JSW
 * page that brings the pill navigation (scripts/jsw-pill-nav.js, loadJswNav: it reads this
 * block from that page). Here, on its own page, it shows that navigation as it will look.
 * Rows (model, _jsw-nav.json; read by readNavBlock):
 *   logo text | logo link | button link + text
 *   then its Nav Links (link + text): the first MAX_NAV_LINKS in the pill, the others only in
 *   the editor, dimmed (so authors can find and remove them); texts longer than the pill has
 *   room for (NAV_TEXT_LIMITS) cut with "…"
 */

import { moveInstrumentation } from '../../scripts/scripts.js';
import buildPillNav, {
  readNavBlock, capNavText, MAX_NAV_LINKS, NAV_TEXT_LIMITS,
} from '../../scripts/jsw-pill-nav.js';

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const editing = Boolean(block.closest('[data-aue-resource]'));
  const {
    brand, home, cta, links,
  } = readNavBlock(block);
  const shown = editing ? links : links.slice(0, MAX_NAV_LINKS);
  // the texts cut to the pill's room, as on the pages (the editor shows them whole)
  if (!editing) {
    shown.forEach(({ link }) => capNavText(link, NAV_TEXT_LIMITS.linkText));
    capNavText(cta, NAV_TEXT_LIMITS.ctaText);
  }
  const nav = buildPillNav({ brand, links: shown.map(({ link }) => link), cta });
  const logo = nav.querySelector('.jsw-pill-nav-brand');
  if (home && logo) logo.setAttribute('href', home.getAttribute('href'));

  // each Nav Link's editor instrumentation on its place in the pill
  const items = [...nav.querySelectorAll('.jsw-pill-nav-links > li')];
  shown.forEach(({ row }, i) => {
    if (!items[i]) return;
    moveInstrumentation(row, items[i]);
    if (i >= MAX_NAV_LINKS) {
      items[i].classList.add('is-over-limit');
      items[i].title = `Not shown on the pages: only the first ${MAX_NAV_LINKS} links are.`;
    }
  });
  block.replaceChildren(nav);
  if (editing) block.classList.add('jsw-nav-editing');
}
