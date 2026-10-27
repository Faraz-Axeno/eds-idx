/*
 * jsw-footer: the JSW footer ("Desktop Footer"), authored once on its own page (/jsw-footer) and
 * shown as the footer of the JSW pages (scripts.js, loadJswFooter: in their <footer>, instead of
 * the site's). A photo (or a muted looping video)
 * behind the whole footer; at the top left the logo, the copyright line and the CTA button; at
 * the top right the navigation columns and the social icons (CONNECT); at the foot, on the
 * left, the privacy policy link.
 * Rows (model, _jsw-footer.json):
 *   the block's fields, four cells, in this order:
 *     background type | background image (+ alt) | background video
 *     logo (+ alt) | copyright text
 *     CTA button link + text | privacy policy link + text
 *     social heading (CONNECT)
 *   then its items, in authored order:
 *     Footer Column — a column heading: starts a navigation column
 *     Footer Link   — link URL + text: a link of the Footer Column before it
 *     Social Icon   — icon image (+ network name) | icon link
 * Items are told apart by their type (the editor's model, or the type cell of imported
 * content), else by what they hold: a picture (Social Icon), a link (Footer Link), a text
 * (Footer Column).
 */

import { moveInstrumentation } from '../../scripts/scripts.js';

// the most characters each text shows on the page, as the model's limits (_jsw-footer.json): a
// longer text, if saved anyway, is cut there with "…" (its whole wording as a tooltip); the
// editor shows every text whole
const TEXT_LIMITS = {
  copyright: 60,
  ctaButtonText: 24,
  privacyPolicyText: 30,
  connectHeading: 20,
  columnHeading: 20,
  linkText: 24,
};

const ITEM_TYPE = /^jsw-footer-(column|link|social)$/;
const VIDEO_TYPES = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
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
  out.append(...node.childNodes);
  return out;
}

/** an element's text cut to its limit with "…" (not in the editor), its whole text a tooltip */
function cap(node, limit, editing) {
  const text = node.textContent.trim();
  if (editing || text.length <= limit) return;
  node.title = text;
  node.textContent = `${text.slice(0, limit).trimEnd()}…`;
}

/** a link without the site's button decoration (scripts.js decorateButtons) */
function plain(a) {
  a.classList.remove('button', 'primary', 'secondary', 'accent');
  a.closest('p')?.classList.remove('button-container', 'button-wrapper');
  return a;
}

/** links off the site open in a new tab */
function external(a) {
  try {
    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin && /^https?:$/.test(url.protocol)) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
  } catch (e) { /* keep it as it is */ }
  return a;
}

/** the text elements of a cell, each paragraph (or named field) without a picture or link */
const textsOf = (cell) => [...(cell?.querySelectorAll('p, [data-aue-prop]') || [])]
  .filter((n) => !n.querySelector('picture, a') && !n.closest('a') && n.textContent.trim()
    && !(n.matches('[data-aue-prop]') && n.parentElement.closest('[data-aue-prop]')));

/** an item row's type: the editor's model, the imported type cell (then dropped), its content */
function itemType(row) {
  const model = row.dataset.aueModel?.match(ITEM_TYPE)?.[1];
  if (model) return model;
  const [first] = cellsOf(row);
  const typed = first?.textContent.trim().match(ITEM_TYPE)?.[1];
  if (typed && !first.querySelector('picture, a')) {
    first.remove();
    return typed;
  }
  return null;
}

/** the block's rows: its four field cells and its items in order */
function sortRows(rows) {
  const typed = rows.map((row) => ({ row, type: itemType(row) }));
  // imported content and the editor mark every item; published pages mark none: there the
  // block's fields are its first four rows
  const marked = typed.some(({ type }) => type);
  const fieldRows = marked ? typed.filter(({ type }) => !type) : typed.slice(0, 4);
  const itemRows = marked ? typed.filter(({ type }) => type) : typed.slice(4);
  const items = itemRows.map(({ row, type }) => {
    if (type) return { row, type };
    if (row.querySelector('picture')) return { row, type: 'social' };
    if (row.querySelector('a')) return { row, type: 'link' };
    return { row, type: 'column' };
  });
  const [media, brand, actions, connect] = fieldRows.map(({ row }) => cellsOf(row)[0] || null);
  return {
    media, brand, actions, connect, items,
  };
}

/** the background: the picture, or the video over it (the picture until it plays) */
function buildMedia(cell) {
  const media = el('div', 'jsw-footer-media');
  if (!cell) return media;
  const picture = cell.querySelector('picture');
  const mode = textsOf(cell).map((n) => n.textContent.trim().toLowerCase())
    .find((t) => t === 'image' || t === 'video') || 'image';
  const videoUrl = cell.querySelector('a')?.href;
  if (picture) media.append(picture);
  const ext = videoUrl?.split(/[?#]/)[0].split('.').pop().toLowerCase();
  if (mode !== 'video' || !videoUrl) return media;

  const video = el('video', 'jsw-footer-video', {
    loop: '', muted: '', playsinline: '', 'aria-hidden': 'true', preload: 'none',
  });
  video.muted = true;
  const img = picture?.querySelector('img');
  if (img) video.poster = img.currentSrc || img.src;
  // a video that cannot play leaves the picture
  video.addEventListener('error', () => video.remove(), true);
  media.append(video);

  // loaded and played once the footer comes near the screen (its source only then: a source
  // without an address would count as failed); still for reduced motion
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const start = () => {
    video.append(el('source', '', { src: videoUrl, ...(VIDEO_TYPES[ext] ? { type: VIDEO_TYPES[ext] } : {}) }));
    video.load();
    if (still) return;
    video.autoplay = true;
    video.play().catch(() => { /* the picture stays */ });
  };
  if (!('IntersectionObserver' in window)) {
    start();
  } else {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        start();
      }
    }, { rootMargin: '300px 0px' });
    io.observe(media);
  }
  return media;
}

/** the top left: logo, copyright line, CTA button (the first link of the actions cell) */
function buildBrand(brandCell, ctaLink, editing) {
  const brand = el('div', 'jsw-footer-brand');
  const logo = el('p', 'jsw-footer-logo');
  const picture = brandCell?.querySelector('picture');
  if (picture) logo.append(picture);
  const [copyrightNode] = textsOf(brandCell);
  const copyright = retag(copyrightNode, 'p', 'jsw-footer-copyright');
  cap(copyright, TEXT_LIMITS.copyright, editing);

  const cta = el('p', 'jsw-footer-cta');
  if (ctaLink) {
    const a = external(plain(ctaLink));
    a.className = 'jsw-footer-cta-link';
    // the "+" is the design's, after the text: one typed at its end is not doubled
    const label = el('span', 'jsw-footer-cta-text');
    label.textContent = a.textContent.trim().replace(/\s*\+$/, '');
    cap(label, TEXT_LIMITS.ctaButtonText, editing);
    const plus = el('span', 'jsw-footer-cta-plus', { 'aria-hidden': 'true' });
    plus.textContent = '+';
    a.replaceChildren(label, plus);
    cta.append(a);
  }
  brand.append(logo, copyright, cta);
  return brand;
}

/** the privacy policy link (the second link of the actions cell), at the foot */
function buildLegal(link, editing) {
  const legal = el('p', 'jsw-footer-legal');
  if (link) {
    const a = external(plain(link));
    a.className = 'jsw-footer-legal-link';
    cap(a, TEXT_LIMITS.privacyPolicyText, editing);
    legal.append(a);
  }
  return legal;
}

function buildColumn(row, editing) {
  const column = el('div', 'jsw-footer-column');
  moveInstrumentation(row, column);
  const [node] = textsOf(cellsOf(row)[0]);
  const heading = retag(node, 'h2', 'jsw-footer-heading');
  cap(heading, TEXT_LIMITS.columnHeading, editing);
  const list = el('ul', 'jsw-footer-links');
  column.append(heading, list);
  return column;
}

function buildLink(row, editing) {
  const item = el('li', 'jsw-footer-link');
  moveInstrumentation(row, item);
  const a = row.querySelector('a');
  if (a) {
    external(plain(a));
    a.removeAttribute('class');
    cap(a, TEXT_LIMITS.linkText, editing);
    item.append(a);
  }
  return item;
}

function buildSocial(row) {
  const item = el('li', 'jsw-footer-social-item');
  moveInstrumentation(row, item);
  const picture = row.querySelector('picture');
  const img = picture?.querySelector('img');
  const name = img?.getAttribute('alt')?.trim() || '';
  const authored = row.querySelector('a');
  const a = authored ? external(plain(authored)) : el('a');
  a.className = 'jsw-footer-social-link';
  if (name) a.setAttribute('aria-label', name);
  // the link reads as the network's name; the icon is its picture
  if (img) img.alt = '';
  a.replaceChildren(...(picture ? [picture] : []));
  item.append(a);
  return item;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const editing = Boolean(block.closest('[data-aue-resource]'));
  const {
    media, brand, actions, connect, items,
  } = sortRows([...block.children]);

  const nav = el('nav', 'jsw-footer-nav', { 'aria-label': 'Footer' });
  const socials = el('ul', 'jsw-footer-social');
  let column = null;
  items.forEach(({ row, type }) => {
    if (type === 'column') {
      column = buildColumn(row, editing);
      nav.append(column);
    } else if (type === 'link') {
      // a link before any Footer Column starts a column without a heading
      if (!column) {
        column = el('div', 'jsw-footer-column');
        column.append(el('ul', 'jsw-footer-links'));
        nav.append(column);
      }
      column.querySelector('.jsw-footer-links').append(buildLink(row, editing));
    } else {
      socials.append(buildSocial(row));
    }
  });

  // CONNECT: the social heading over the icons, the last column
  const connectColumn = el('div', 'jsw-footer-column jsw-footer-connect');
  const [connectNode] = textsOf(connect);
  const connectHeading = retag(connectNode, 'h2', 'jsw-footer-heading');
  cap(connectHeading, TEXT_LIMITS.connectHeading, editing);
  connectColumn.append(connectHeading, socials);
  nav.append(connectColumn);

  // the actions cell's links, read before either is moved: the CTA button, the privacy policy
  const [ctaLink, privacyLink] = [...(actions?.querySelectorAll('a') || [])];
  const inner = el('div', 'jsw-footer-inner');
  inner.append(buildBrand(brand, ctaLink, editing), nav, buildLegal(privacyLink, editing));
  block.replaceChildren(buildMedia(media), inner);
  if (editing) block.classList.add('jsw-footer-editing');
}
