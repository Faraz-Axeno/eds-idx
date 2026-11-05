/*
 * The JSW pill navigation (as on /jsw-phase-3, "NEV / Hero") for blocks that bring their own:
 * logo mark + JSW MOTORS wordmark, a list of links, then the white button.
 * Styles: pill-nav.css, beside it (imported by those blocks' stylesheets).
 * loadPillNav() builds it from the navigation authored once on /jsw-nav (its jsw-nav block), else
 * from the one on /jsw-phase-3.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';

// "JSW MOTORS" as in the Figma navbar, letter by letter on its 9-unit cap grid
const WORDMARK = '<svg viewBox="2 0 166 9" focusable="false" aria-hidden="true" fill="currentColor">'
  + '<path d="M11 0H16V9H2V7.1H13.6V1.9H11Z"/>'
  + '<path d="M20 0H35V1.9H22.4V3.55H35V9H20V7.1H32.6V5.45H20Z"/>'
  + '<path d="M38 0H40.6V9H38ZM50.8 0H53.4V9H50.8ZM44.2 2H46.8L53.2 9H50.6ZM44.2 2H46.8L40.6 9H38Z"/>'
  + '<path d="M64 0H66.7V9H64ZM77.3 0H80V9H77.3ZM64 0H66.7L73.2 7.2H70.6ZM77.3 0H80L73.4 7.2H70.8Z"/>'
  + '<path d="M84 0H96.9A1 1 0 0 1 97.9 1V8A1 1 0 0 1 96.9 9H84A1 1 0 0 1 83 8V1A1 1 0 0 1 84 0ZM85.6 1.9V7.1H95.3V1.9Z"/>'
  + '<path d="M100 0H115.9V1.9H109.1V9H106.3V1.9H100Z"/>'
  + '<path d="M119 0H131.9A1 1 0 0 1 132.9 1V8A1 1 0 0 1 131.9 9H119A1 1 0 0 1 118 8V1A1 1 0 0 1 119 0ZM120.6 1.9V7.1H130.3V1.9Z"/>'
  + '<path d="M135 0H137.6V9H135ZM137.6 0H148.8A1 1 0 0 1 149.8 1V5.4H147.2V1.9H137.6ZM140 3.6H149.8V5.4H140ZM140.2 5.4H143.2L149.6 9H145.7Z"/>'
  + '<path d="M153 0H168V1.9H155.4V3.55H168V9H153V7.1H165.6V5.45H153Z"/>'
  + '</svg>';

// the JSW mark, from the Figma navbar's SVG export, in the navbar's colour (white) and solid as
// in the Figma navbar: the export's outer silhouette less its two open areas inside the ring
// gives the blade and the ring's upper arc; there the ring's lower arc is only its two edge
// lines, so the band between them is drawn from the open areas' edge (8 wide, masked to outside
// them: a 4 band); the export's sliver at the blade's tip as it is
const MARK_SILHOUETTE = 'M7.58249 40.8535C6.08827 39.5858 4.19372 37.0295 3.21725 35.299C1.79255 32.774 0.925901 29.5245 0.895913 26.6239C0.94167 25.3807 1.11749 23.8725 1.47167 22.6825C4.43467 12.7268 14.4209 6.71269 23.8514 4.20666C30.3472 2.51405 37.1066 2.07857 43.7659 2.92365C44.1851 2.97293 44.6209 2.9889 45.0376 3.04972C45.6899 3.11921 46.3563 3.32281 47.0007 3.40638C47.9621 3.53106 48.8208 3.75294 49.7573 3.98215C52.3184 4.60912 54.9404 5.46132 57.3458 6.54708C58.0449 6.86621 58.7377 7.1992 59.4233 7.54592C59.7234 7.69759 60.3475 8.05589 60.6292 8.13788C60.9227 8.10494 61.2033 7.81234 61.4701 7.64478C63.1628 6.55873 64.8088 5.40174 66.4041 4.17694C67.3247 3.48005 68.2242 2.65285 69.2378 2.0994C70.212 1.56752 70.0045 2.86356 69.7957 3.36482C69.5169 4.03446 69.2067 4.63529 68.8668 5.27062C68.0599 6.76199 67.1962 8.22183 66.2774 9.64695C66.0783 9.9554 65.321 11.009 65.2193 11.2658C65.2794 11.3997 66.4237 12.2983 66.6546 12.5294C66.6749 12.6337 66.71 12.7048 66.6694 12.7827C66.5561 12.7894 66.5362 12.7816 66.4233 12.7572L66.4027 12.7424C66.087 12.5146 65.1918 11.608 64.934 11.5766C64.7071 11.718 63.001 14.1679 62.6983 14.529C63.0122 14.8783 63.4386 15.1846 63.7981 15.4993C64.2958 15.9426 64.7737 16.4079 65.2298 16.8939C67.241 19.0147 68.8606 21.9832 69.2089 24.9337C69.4 26.5539 69.2983 28.4751 68.8273 30.0178C66.4197 38.7308 56.9896 43.3408 48.9008 45.4284C47.9994 45.6604 47.0112 45.8143 46.1 46.0387C45.6425 46.1516 45.0872 46.1553 44.6205 46.2508C42.9412 46.5828 41.3626 46.695 39.6583 46.7681C37.3408 46.8713 35.0192 46.8506 32.7038 46.7058C31.3892 46.6269 30.0548 46.3562 28.7523 46.1708C28.4834 46.1324 28.2133 46.1028 27.9462 46.0524C25.9747 45.6691 24.0288 45.1641 22.1198 44.5397C21.4387 44.3153 20.8384 44.1448 20.183 43.8161C18.8936 44.3087 17.5365 44.7203 16.2112 45.1105C15.5936 45.2923 15.1361 45.4805 14.4911 45.6C14.8981 45.7111 15.2287 45.9254 15.6051 46.102C16.082 46.3261 16.5538 46.5643 17.0373 46.7735C18.9331 47.5989 20.8796 48.3026 22.8649 48.8803C23.9913 49.1989 25.1499 49.4917 26.2994 49.6981C26.9477 49.8143 27.5985 50.013 28.2535 50.1093C31.2446 50.5668 34.1802 50.8832 37.2123 50.7952C38.3942 50.7609 39.6134 50.809 40.7986 50.7406C42.5832 50.6331 44.3668 50.3131 46.1402 50.0999C46.778 50.0231 47.4575 49.8063 48.0906 49.6919C48.4599 49.6123 48.8469 49.5634 49.2114 49.4783C52.9733 48.5958 56.6066 47.2343 60.0224 45.4273C68.4027 40.9053 75.3972 32.1596 72.6221 22.1895C72.4701 21.6427 72.2221 21.1326 72.0907 20.5891C72.1186 20.5442 72.1106 20.559 72.1595 20.5273L72.2236 20.5881C72.3336 20.5449 72.1845 20.5627 72.3401 20.4172C72.8607 21.5107 73.2336 23.1273 73.3827 24.3079C74.9885 37.0204 63.0745 46.0101 52.0929 49.0562C51.2762 49.2829 50.6199 49.4823 49.7996 49.6818C48.0979 50.1133 46.3741 50.4528 44.6357 50.699C44.1615 50.7645 43.654 50.7858 43.1711 50.838C37.0034 51.5529 30.7582 51.1724 24.7229 49.7147C21.2933 48.8825 17.2306 47.5395 14.1639 45.76C13.8821 45.8251 13.6091 45.9268 13.3296 46.0068L11.14 46.6186C8.47999 47.3433 5.72573 47.9648 3.02094 48.5086C2.17154 48.6794 -0.350424 49.3172 1.12606 47.5037C1.72321 46.7703 2.46327 46.0253 3.12097 45.3415C4.03234 44.3833 4.95294 43.4338 5.88262 42.4934C6.22934 42.1422 7.21311 41.0552 7.58249 40.8535Z';
const MARK_OPEN = 'M10.7988 37.2981C11.3538 36.5238 12.1784 35.4477 13.1745 35.3264C16.3719 34.937 19.5502 34.1394 22.6807 33.388C23.3557 33.226 24.1901 32.972 24.876 32.7758C26.9931 32.1597 29.0856 31.4621 31.149 30.6845C37.0483 28.5003 43.0748 25.6205 48.1898 21.9204C49.1238 21.2511 50.0451 20.5642 50.953 19.8599C51.1738 19.6896 51.8826 19.1519 52.0238 18.9731C51.7559 19.0639 50.8056 19.692 50.4295 19.9046C50.1106 20.1528 49.6704 20.3516 49.3124 20.5603C48.3343 21.1309 47.3533 21.6539 46.3429 22.1633C41.3941 24.6449 36.2222 26.6544 30.8962 28.1653C29.8799 28.4603 28.8511 28.7079 27.8288 28.9777C27.3763 29.0972 26.9318 29.2487 26.4782 29.3632C26.1554 29.4447 25.825 29.4915 25.5018 29.5717C25.0703 29.6786 24.6448 29.8151 24.2105 29.9096C23.8289 29.9926 23.4438 30.0499 23.0636 30.1415C22.2622 30.3345 18.2464 31.2462 17.6418 31.1748C17.4734 31.1549 17.3233 31.1015 17.2212 30.9592C17.1477 30.8569 17.1171 30.7563 17.1432 30.6313C17.2064 30.3288 17.4344 30.0387 17.6251 29.8047C18.6285 28.5734 19.7374 27.4321 20.8367 26.2873C22.3885 24.672 23.9522 23.0682 25.5277 21.4761C25.9141 21.086 26.2954 20.6909 26.6714 20.2909C27.017 19.9195 27.4757 19.362 27.8834 19.0897C29.6765 18.9527 31.4633 18.7414 33.239 18.4565C33.9676 18.3326 34.6927 18.168 35.4169 18.0261C40.69 17.0045 45.8452 15.449 50.8031 13.3835C52.0712 12.8685 53.3179 12.3032 54.5407 11.6889C54.8281 11.5439 55.2285 11.3753 55.487 11.2067L55.5091 11.158C55.3751 11.0026 53.0135 10.0804 52.7336 9.9815C50.81 9.29484 48.8454 8.72872 46.8512 8.28644C46.3596 8.18085 45.8224 8.11815 45.321 8.02613C44.3009 7.83902 43.2011 7.62856 42.1687 7.55287C40.0796 7.39971 37.9609 7.21712 35.8638 7.29321C32.176 7.44203 28.5316 7.84557 24.9627 8.82472C23.3053 9.27946 21.2253 9.88405 19.6514 10.579C13.5216 13.2855 6.68369 18.2042 5.88577 25.3904C5.37362 30.0027 7.55013 34.1515 10.7988 37.2981Z'
  + 'M55.4917 22.8307C55.0034 23.4676 53.5927 24.6466 52.9707 25.3014L52.8925 25.1896C52.7575 25.2076 52.1892 25.6956 52.1505 25.8427C52.1924 25.9106 52.1943 25.9041 52.2685 25.9373C52.0495 26.0879 51.7537 26.3793 51.543 26.5667C51.135 26.9336 50.718 27.291 50.293 27.6385C48.7068 28.9289 47.0727 30.1591 45.3938 31.3265C39.987 35.0307 34.2357 38.2056 28.22 40.8072C26.0694 41.735 23.8628 42.5929 21.6526 43.3639C21.4235 43.4439 21.1936 43.5352 20.967 43.6224C21.6953 43.8034 22.3661 44.0369 23.0731 44.2841C23.5567 44.4351 24.0756 44.5317 24.5548 44.6975C25.1154 44.8912 25.6611 44.9773 26.2328 45.1087C28.1066 45.5424 30.0039 45.8671 31.9153 46.0814C32.3336 46.1245 32.8011 46.135 33.2281 46.1629C34.3075 46.2436 35.389 46.2932 36.4712 46.3124C39.2865 46.35 42.0989 46.127 44.8732 45.6463C51.8087 44.5122 58.8916 42.0358 64.0316 37.0548C66.0714 35.0938 67.539 32.6147 68.2775 29.8831C69.7363 24.4675 67.3475 19.4788 63.2793 15.9141C62.972 15.6448 62.5959 15.3742 62.3168 15.0841L62.2867 15.0523C62.0735 15.4265 61.2938 16.3522 60.9966 16.715C59.9472 18.0169 58.8568 19.2853 57.7274 20.5183C57.2575 21.0328 56.3913 21.8632 55.9949 22.346C55.9655 22.2715 55.9471 22.2373 55.9616 22.1546L55.933 22.1437C55.8305 22.2299 55.7259 22.324 55.6426 22.4283C55.4396 22.6825 55.1959 22.8636 54.9758 23.1041C55.2075 22.9454 55.2607 22.8333 55.4917 22.8307Z';
const MARK_SLIVER = 'M66.6532 12.5293C68.6927 14.4192 70.2916 16.2876 71.5825 18.7695C71.7498 19.0911 71.9213 19.4188 72.0672 19.7506C72.1661 19.9757 72.2301 20.1945 72.3387 20.4171C72.1831 20.5626 72.3322 20.5448 72.2222 20.5879L72.1581 20.5272C72.1092 20.5589 72.1172 20.5441 72.0893 20.589C71.8421 20.1434 71.6658 19.6745 71.4431 19.2223C70.2145 16.724 68.4512 14.6262 66.4219 12.7571C66.5348 12.7815 66.5547 12.7893 66.668 12.7826C66.7086 12.7046 66.6735 12.6336 66.6532 12.5293Z';
const LOGO_MARK = '<svg viewBox="0.17 1.47 73.86 50.21" focusable="false" aria-hidden="true" fill="currentColor">'
  + '<mask id="nav-mark-ring" maskUnits="userSpaceOnUse" x="-5" y="-5" width="90" height="70">'
  + `<rect x="-5" y="-5" width="90" height="70" fill="#fff"/><path d="${MARK_OPEN}" fill="#000"/></mask>`
  + `<path d="${MARK_SILHOUETTE}${MARK_OPEN}" fill-rule="evenodd"/>`
  + `<path d="${MARK_OPEN}" fill="none" stroke="currentColor" stroke-width="8" stroke-linejoin="round" mask="url(#nav-mark-ring)"/>`
  + `<path d="${MARK_SLIVER}" fill="none" stroke="currentColor"/>`
  + '</svg>';

/** a plain link: the site's button decoration (scripts.js decorateButtons) taken off */
function plain(a) {
  a.classList.remove('button', 'primary', 'secondary', 'accent');
  a.closest('p')?.classList.remove('button-container', 'button-wrapper');
  return a;
}

/** an authored link holding only its address (a link field without a text) */
const isBareLink = (a) => {
  const text = a.textContent.trim();
  return !text || text === a.getAttribute('href') || /^(\/|#|https?:|mailto:|tel:)/.test(text);
};

/** a navigation link to show: authored with both its target and its text */
const isNavLink = (a) => Boolean(a?.getAttribute('href')) && !isBareLink(a);

/**
 * builds the pill navigation from authored parts, moved in with their editor instrumentation:
 * @param {Object} parts
 * @param {Element} [parts.brand] the logo text (JSW MOTORS is drawn as the wordmark)
 * @param {Element[]} [parts.links] the links, left to right
 * @param {Element} [parts.cta] the button link
 * @returns {Element} the <nav>
 */
export default function buildPillNav({ brand, links = [], cta } = {}) {
  const nav = document.createElement('nav');
  nav.className = 'pill-nav';
  nav.setAttribute('aria-label', 'Main');
  const inner = document.createElement('div');
  inner.className = 'nav-bar';
  nav.append(inner);

  // the logo: home is the page the links point to (e.g. /jsw-phase-3), else the site root
  const name = brand?.textContent.trim() || 'JSW MOTORS';
  const firstLink = links.find((a) => a?.getAttribute('href'));
  let homePath = '/';
  try {
    if (firstLink) homePath = new URL(firstLink.href, window.location.href).pathname || '/';
  } catch (e) { /* keep the root */ }
  const home = document.createElement('a');
  home.className = 'nav-home';
  home.href = homePath;
  home.setAttribute('aria-label', `${name} home`);
  const mark = document.createElement('span');
  mark.className = 'nav-mark';
  mark.setAttribute('aria-hidden', 'true');
  mark.innerHTML = LOGO_MARK;
  const label = document.createElement('span');
  label.className = 'nav-brand-text';
  if (name.toUpperCase() === 'JSW MOTORS') {
    label.classList.add('nav-wordmark');
    label.innerHTML = WORDMARK;
  } else label.textContent = name;
  home.append(mark, label);
  const brandWrap = brand || document.createElement('p');
  brandWrap.replaceChildren(home);
  brandWrap.classList.add('nav-logo');
  inner.append(brandWrap);

  // the links authored with both their target and text, the empty ones left out
  const list = document.createElement('ul');
  list.className = 'nav-list';
  links.filter(isNavLink).forEach((a) => {
    const li = document.createElement('li');
    li.className = 'nav-item';
    // Universal Editor: a link field's instrumentation, where it is on the paragraph around the
    // link, on its item (on the link itself it moves in with it)
    const holder = a.parentElement;
    if (holder?.tagName === 'P' && holder.dataset.aueProp && !a.dataset.aueProp) {
      moveInstrumentation(holder, li);
    }
    plain(a).classList.add('nav-link');
    li.append(a);
    list.append(li);
  });
  if (list.children.length) inner.append(list);

  if (cta) {
    const wrap = document.createElement('p');
    wrap.className = 'nav-cta-wrap';
    plain(cta).classList.add('nav-cta');
    wrap.append(cta);
    inner.append(wrap);
  }
  return nav;
}

// the page whose hero navigation is the JSW navigation of every JSW page (authored there once)
const NAV_SOURCE_PAGE = '/jsw-phase-3';

// shown when that page cannot be read
const FALLBACK_NAV = '<p>JSW MOTORS</p><ul><li><a href="#nev-tech">NEV TECH</a></li>'
  + '<li><a href="#newsroom">NEWSROOM</a></li></ul><p><a href="#register-interest">REGISTER INTEREST</a></p>';

/** the source page's address here: on the AEM author pages live at /content/{site}/….html */
function sourcePage() {
  const root = window.location.pathname.match(/^\/content\/[^/]+(?=\/)/)?.[0];
  return root ? { page: `${root}${NAV_SOURCE_PAGE}.html`, plain: `${root}${NAV_SOURCE_PAGE}.plain.html` }
    : { page: NAV_SOURCE_PAGE, plain: `${NAV_SOURCE_PAGE}.plain.html` };
}

// the JSW navigation page: its jsw-nav block is the navigation of every JSW page that brings the
// pill navigation (authored there once); while it is not there, the Phase 3 hero's (above)
const NAV_PAGE = '/jsw-nav';

// the links shown in the pill: the jsw-nav block's Link 1-4 (each optional; then any Nav Link
// items saved before); the editor shows any more dimmed (blocks/jsw-nav)
export const MAX_NAV_LINKS = 4;

// the most characters the pill has room for (the model's limits, _jsw-nav.json): a longer text,
// if saved anyway, is cut there with "…" (its whole wording as a tooltip)
export const NAV_TEXT_LIMITS = { linkText: 12, ctaText: 17 };

/** an element's text cut to its limit with "…", its whole text a tooltip */
export function capNavText(node, limit) {
  const text = node?.textContent.trim();
  if (!text || text.length <= limit) return;
  node.title = text;
  node.textContent = `${text.slice(0, limit).trimEnd()}…`;
}

/** a page's addresses, this one's first: AEM author /content/{site}/…, preview /content/…, root */
function pageCandidates(path) {
  const { pathname } = window.location;
  const siteRoot = pathname.match(/^\/content\/[^/]+(?=\/)/)?.[0];
  const candidates = pathname.startsWith('/content/')
    ? [siteRoot && `${siteRoot}${path}`, `/content${path}`, path]
    : [path, `/content${path}`];
  return [...new Set(candidates.filter(Boolean))];
}

/**
 * the parts of a jsw-nav block, from its rows as authored (_jsw-nav.json): its fields, the logo
 * text (brand), the logo link (homeLink) and the button (cta + text), then its links: the Link
 * 1-4 group (one row, each link with its text, the empty ones not rendered) and any Nav Link
 * items saved before (a row each; told by their type: the editor's model, or the type cell of
 * imported content, dropped here). Published pages mark none: there the fields are the first
 * three rows and every link after them is a navigation link, in order.
 * @param {Element} block the jsw-nav block
 * @returns {{brand: Element, home: Element, cta: Element,
 *   links: {row: Element, link: Element, item: boolean}[]}} item: its row a Nav Link item
 */
export function readNavBlock(block) {
  const rows = [...block.children].map((row) => {
    const first = row.firstElementChild;
    const typed = Boolean(first && !first.querySelector('a, picture')
      && first.textContent.trim() === 'jsw-nav-link' && row.children.length > 1);
    if (typed) first.remove();
    return { row, link: typed || row.dataset.aueModel === 'jsw-nav-link' };
  });
  // the field rows: the first three that are not Nav Link items; the rest hold the links
  const fieldRows = rows.filter(({ link }) => !link).slice(0, 3);
  const linkRows = rows.filter((r) => !fieldRows.includes(r));

  let brand = null;
  let home = null;
  let cta = null;
  fieldRows.forEach(({ row }) => {
    const a = row.querySelector('a');
    if (!a) {
      if (!brand && row.textContent.trim()) brand = row.querySelector('[data-aue-prop], p') || row.firstElementChild;
    } else if (isBareLink(a) && !home) home = a;
    else if (!cta) cta = a;
    else if (!home) home = a;
  });
  // every link of those rows authored with its target and text, in order
  const links = linkRows.flatMap(({ row, link: item }) => [...row.querySelectorAll('a')]
    .map((a) => ({ row, link: a, item })))
    .filter(({ link }) => isNavLink(link));
  return {
    brand, home, cta, links,
  };
}

/** the navigation page's jsw-nav block, as authored (null when it is not there) */
async function fetchNavBlock() {
  // eslint-disable-next-line no-restricted-syntax
  for (const url of pageCandidates(NAV_PAGE)) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const resp = await fetch(`${url}.plain.html`);
      if (resp.ok) {
        // eslint-disable-next-line no-await-in-loop
        const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
        const block = doc.querySelector('.jsw-nav');
        if (block) return block;
      }
    } catch (e) { /* the next address */ }
  }
  return null;
}

/** no editor instrumentation on what belongs to another page */
function stripInstrumentation(root) {
  [root, ...root.querySelectorAll('*')].forEach((node) => [...node.attributes]
    .filter(({ name }) => name.startsWith('data-aue-') || name.startsWith('data-richtext-'))
    .forEach(({ name }) => node.removeAttribute(name)));
}

/**
 * the JSW navigation: as authored on /jsw-nav (its jsw-nav block); while that page is not there,
 * as on /jsw-phase-3 (the navigation fields of its immersive-hero block: logo text, links,
 * button), links to a section of that page (#nev-tech) made to open it there; the fallback if
 * neither can be read.
 * @returns {Promise<Element>} the <nav>
 */
export async function loadPillNav() {
  const navBlock = await fetchNavBlock();
  if (navBlock) {
    stripInstrumentation(navBlock);
    const {
      brand, home, cta, links,
    } = readNavBlock(navBlock);
    const shown = links.slice(0, MAX_NAV_LINKS).map(({ link }) => link);
    shown.forEach((a) => capNavText(a, NAV_TEXT_LIMITS.linkText));
    capNavText(cta, NAV_TEXT_LIMITS.ctaText);
    const nav = buildPillNav({ brand, links: shown, cta });
    const logo = nav.querySelector('.nav-home');
    if (home && logo) logo.setAttribute('href', home.getAttribute('href'));
    return nav;
  }

  const { page, plain: plainUrl } = sourcePage();
  const cell = document.createElement('div');
  try {
    const resp = await fetch(plainUrl);
    if (!resp.ok) throw new Error(resp.status);
    const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
    const navCell = [...doc.querySelectorAll('.immersive-hero > div > div')]
      .find((c) => c.querySelector('ul a'));
    if (!navCell) throw new Error('no navigation');
    cell.append(...navCell.childNodes);
  } catch (e) {
    cell.innerHTML = FALLBACK_NAV;
  }
  // it belongs to the other page: no editor instrumentation of it here
  stripInstrumentation(cell);
  cell.querySelectorAll('a[href^="#"]').forEach((a) => a.setAttribute('href', `${page}${a.getAttribute('href')}`));

  const list = cell.querySelector('ul');
  const cta = [...cell.querySelectorAll('a')].find((a) => !list?.contains(a)) || null;
  const brand = [...cell.querySelectorAll('p')].find((p) => !p.querySelector('a') && p.textContent.trim()) || null;
  return buildPillNav({ brand, links: [...(list?.querySelectorAll('a') || [])], cta });
}
