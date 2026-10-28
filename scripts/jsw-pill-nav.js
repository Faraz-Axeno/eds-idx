/*
 * The JSW pill navigation (as on /jsw-phase-3, "NEV / Hero") for blocks that bring their own:
 * logo mark + JSW MOTORS wordmark, a list of links, then the white button.
 * Styles: styles/jsw-pill-nav.css (imported by those blocks' stylesheets).
 * loadJswNav() builds it from the navigation authored once on /jsw-nav (its jsw-nav block), else
 * from the one on /jsw-phase-3.
 */

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

// the JSW mark: an oval ring crossed by a leaf and, just below it, a band
const LOGO_MARK = '<svg viewBox="59.4 33.4 40.2 26" focusable="false" fill="currentColor">'
  + '<ellipse cx="79.4" cy="46.9" rx="18.7" ry="12.4" transform="rotate(-3 79.4 46.9)" fill="none" stroke="currentColor" stroke-width="2.2"/>'
  + '<path d="M68.4 50.4C70.2 46.6 74.8 44.2 80.5 42.2C86.5 39.8 92 36.6 97.6 33.2C93.4 37.6 88.6 42 83 45.2C78 48 73 50 68.4 50.4Z"/>'
  + '<path d="M60.3 58.4C64.5 55.4 69 53 73.5 51C81 47.6 88.5 43.4 95.6 39C96 39.8 96.5 40.8 96.9 41.8C89.5 46.6 82 50.8 74.5 54.4C69.5 56.6 64.5 58.2 60.3 58.4Z"/>'
  + '</svg>';

/** a plain link: the site's button decoration (scripts.js decorateButtons) taken off */
function plain(a) {
  a.classList.remove('button', 'primary', 'secondary', 'accent');
  a.closest('p')?.classList.remove('button-container', 'button-wrapper');
  return a;
}

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
  nav.className = 'jsw-pill-nav';
  nav.setAttribute('aria-label', 'Main');
  const inner = document.createElement('div');
  inner.className = 'jsw-pill-nav-inner';
  nav.append(inner);

  // the logo: home is the page the links point to (e.g. /jsw-phase-3), else the site root
  const name = brand?.textContent.trim() || 'JSW MOTORS';
  const firstLink = links.find((a) => a?.getAttribute('href'));
  let homePath = '/';
  try {
    if (firstLink) homePath = new URL(firstLink.href, window.location.href).pathname || '/';
  } catch (e) { /* keep the root */ }
  const home = document.createElement('a');
  home.className = 'jsw-pill-nav-brand';
  home.href = homePath;
  home.setAttribute('aria-label', `${name} home`);
  const mark = document.createElement('span');
  mark.className = 'jsw-pill-nav-mark';
  mark.setAttribute('aria-hidden', 'true');
  mark.innerHTML = LOGO_MARK;
  const label = document.createElement('span');
  label.className = 'jsw-pill-nav-brand-text';
  if (name.toUpperCase() === 'JSW MOTORS') {
    label.classList.add('jsw-pill-nav-wordmark');
    label.innerHTML = WORDMARK;
  } else label.textContent = name;
  home.append(mark, label);
  const brandWrap = brand || document.createElement('p');
  brandWrap.replaceChildren(home);
  brandWrap.classList.add('jsw-pill-nav-brand-wrap');
  inner.append(brandWrap);

  const list = document.createElement('ul');
  list.className = 'jsw-pill-nav-links';
  links.filter(Boolean).forEach((a) => {
    const li = document.createElement('li');
    li.append(plain(a));
    list.append(li);
  });
  if (list.children.length) inner.append(list);

  if (cta) {
    const wrap = document.createElement('p');
    wrap.className = 'jsw-pill-nav-cta-wrap';
    plain(cta).classList.add('jsw-pill-nav-cta');
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

// the links shown in the pill (the jsw-nav block's Nav Links): more do not fit beside the logo
// and the button; the editor shows the others dimmed (blocks/jsw-nav)
export const MAX_NAV_LINKS = 2;

// the most characters the pill has room for (the model's limits, _jsw-nav.json): a longer text,
// if saved anyway, is cut there with "…" (its whole wording as a tooltip)
export const NAV_TEXT_LIMITS = { linkText: 11, ctaText: 17 };

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

/** an authored link holding only its address (a link field without a text) */
const isBareLink = (a) => {
  const text = a.textContent.trim();
  return !text || text === a.getAttribute('href') || /^(\/|#|https?:|mailto:|tel:)/.test(text);
};

/**
 * the parts of a jsw-nav block, from its rows as authored (_jsw-nav.json): its fields, the logo
 * text (brand), the logo link (homeLink) and the button (cta + text), then its Nav Links (link +
 * text). The Nav Links are told by their type (the editor's model, or the type cell of imported
 * content, dropped here); published pages mark none: there the fields are the first three rows.
 * @param {Element} block the jsw-nav block
 * @returns {{brand: Element, home: Element, cta: Element, links: {row: Element, link: Element}[]}}
 */
export function readNavBlock(block) {
  const rows = [...block.children].map((row) => {
    const first = row.firstElementChild;
    const typed = Boolean(first && !first.querySelector('a, picture')
      && first.textContent.trim() === 'jsw-nav-link' && row.children.length > 1);
    if (typed) first.remove();
    return { row, link: typed || row.dataset.aueModel === 'jsw-nav-link' };
  });
  const marked = rows.some(({ link }) => link);
  const fieldRows = marked ? rows.filter(({ link }) => !link) : rows.slice(0, 3);
  const linkRows = marked ? rows.filter(({ link }) => link) : rows.slice(3);

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
  const links = linkRows.map(({ row }) => ({ row, link: row.querySelector('a') }))
    .filter(({ link }) => link);
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
export async function loadJswNav() {
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
    const logo = nav.querySelector('.jsw-pill-nav-brand');
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
