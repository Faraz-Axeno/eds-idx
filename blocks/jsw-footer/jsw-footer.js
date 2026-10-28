/*
 * jsw-footer: the JSW footer, authored once on its own page (/jsw-footer) and shown as the footer
 * of the JSW pages (scripts.js, loadJswFooter: in their <footer>, instead of the site's). The
 * footer is this block's section (scripts/jsw-footer-parts.js): this block (logo, copyright,
 * button, privacy policy, background, layout), a jsw-footer-column block for each navigation
 * column (holding its Footer Links) and a jsw-footer-social block (holding its Social Icons). This
 * block marks the section (jsw-footer-section, and the layout's class) and jsw-footer.css lays the
 * blocks out in it, in one of two layouts (its Footer layout field):
 *   variant-phase-5 (Variant A, the default; "Desktop Footer"): a photo (or a muted looping video)
 *     behind the whole footer; at the top left the logo, the copyright line and the CTA button; at
 *     the top right the columns and the social icons (CONNECT); at the foot, on the left, the
 *     privacy policy link
 *   variant-phase-3 (Variant B; the Phase 3 footer): on a gradient (no photo); at the left the
 *     logo, the copyright line and the privacy policy link; the CTA button in the centre; at the
 *     right CONNECT (the social links as text, their network names) and the columns
 * Rows (model, _jsw-footer.json), three cells:
 *   footer layout | background type | background image (+ alt) | background video
 *   logo (+ alt) | copyright text
 *   CTA button link + text | privacy policy link + text
 * Content saved before the columns and social links were blocks (a fourth cell, the social
 * heading, then Footer Column / Footer Link / Social Icon items in this block) is shown the same
 * way: this block builds those columns and social links beside itself in the section.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';
import { loadCSS } from '../../scripts/aem.js';
import {
  el, cap, plain, external, fillColumn, fillSocial,
} from '../../scripts/jsw-footer-parts.js';

// the most characters each text shows on the page, as the model's limits (_jsw-footer.json): a
// longer text, if saved anyway, is cut there with "…" (its whole wording as a tooltip); the
// editor shows every text whole
const TEXT_LIMITS = {
  copyright: 60,
  ctaButtonText: 24,
  privacyPolicyText: 30,
};

// the items of content saved before the columns and social links were blocks
const LEGACY_ITEM = /^jsw-footer-(column|link|social)$/;

// the layouts (the Footer layout field's values, and the block's class); the first the default
const VARIANTS = ['variant-phase-5', 'variant-phase-3'];
const VIDEO_TYPES = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

const cellsOf = (row) => [...(row?.children || [])];

/** an element of another tag, with the authored element's content and editor instrumentation */
function retag(node, tag, className) {
  const out = el(tag, className);
  if (!node) return out;
  moveInstrumentation(node, out);
  out.append(...node.childNodes);
  return out;
}

/** the text elements of a cell, each paragraph (or named field) without a picture or link */
const textsOf = (cell) => [...(cell?.querySelectorAll('p, [data-aue-prop]') || [])]
  .filter((n) => !n.querySelector('picture, a') && !n.closest('a') && n.textContent.trim()
    && !(n.matches('[data-aue-prop]') && n.parentElement.closest('[data-aue-prop]')));

/** a saved item row's type: the editor's model, the imported type cell (then dropped) */
function itemType(row) {
  const model = row.dataset.aueModel?.match(LEGACY_ITEM)?.[1];
  if (model) return model;
  const [first] = cellsOf(row);
  const typed = first?.textContent.trim().match(LEGACY_ITEM)?.[1];
  if (typed && !first.querySelector('picture, a')) {
    first.remove();
    return typed;
  }
  return null;
}

/**
 * the block's rows: its three field cells (content saved before: four, the social heading the
 * fourth) and the items of content saved before, in order
 */
function sortRows(rows) {
  const typed = rows.map((row) => ({ row, type: itemType(row) }));
  // imported content and the editor mark every item; published pages mark none: there the
  // block's fields are its first three rows (content saved before: four, then its items)
  const marked = typed.some(({ type }) => type);
  const fields = rows.length > 3 ? 4 : 3;
  const fieldRows = marked ? typed.filter(({ type }) => !type) : typed.slice(0, fields);
  const itemRows = marked ? typed.filter(({ type }) => type) : typed.slice(fields);
  const items = itemRows.map(({ row, type }) => {
    if (type) return { row, type };
    if (row.querySelector('picture')) return { row, type: 'social' };
    if (row.querySelector('a')) return { row, type: 'link' };
    return { row, type: 'column' };
  });
  const [media, brand, actions] = fieldRows.map(({ row }) => cellsOf(row)[0] || null);
  return {
    media, brand, actions, connectRow: fieldRows[3]?.row || null, items,
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

/** the layout: the Footer layout field (in the first cell), else a class, else the default */
function variantOf(block, mediaCell) {
  const chosen = textsOf(mediaCell).map((n) => n.textContent.trim().toLowerCase())
    .find((t) => VARIANTS.includes(t));
  return chosen || VARIANTS.find((v) => block.classList.contains(v)) || VARIANTS[0];
}

/** the logo and copyright line, and the CTA button (the first link of the actions cell) */
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
  brand.append(logo, copyright);
  return { brand, cta };
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

/**
 * content saved before the columns and social links were blocks: its Footer Columns (each with
 * the Footer Links after it) and Social Icons built as jsw-footer-column and jsw-footer-social
 * blocks beside this one in the section, so they are laid out the same. In the editor they cannot
 * be edited where they are (they are this block's items, not those blocks'): re-import the page.
 */
function buildLegacyParts(block, connectRow, items, editing) {
  if (!items.length) return;
  const columns = [];
  const socialRows = [];
  items.forEach(({ row, type }) => {
    // their editor instrumentation is left out: they would show outside this block's tree
    [row, ...row.querySelectorAll('*')].forEach((n) => [...n.attributes]
      .filter(({ name }) => name.startsWith('data-aue-'))
      .forEach(({ name }) => n.removeAttribute(name)));
    if (type === 'column') columns.push({ row, links: [] });
    else if (type === 'social') socialRows.push(row);
    else {
      if (!columns.length) columns.push({ row: null, links: [] });
      columns[columns.length - 1].links.push(row);
    }
  });
  const part = (name) => {
    const wrapper = el('div', `${name}-wrapper`);
    const part0 = el('div', `${name} block`, { 'data-block-name': name, 'data-block-status': 'loaded' });
    wrapper.append(part0);
    loadCSS(`${window.hlx.codeBasePath}/blocks/${name}/${name}.css`);
    return { wrapper, part: part0 };
  };
  const wrappers = columns.map(({ row, links }) => {
    const { wrapper, part: column } = part('jsw-footer-column');
    fillColumn(column, row, links, editing);
    return wrapper;
  });
  const { wrapper, part: social } = part('jsw-footer-social');
  fillSocial(social, connectRow, socialRows, editing);
  wrappers.push(wrapper);
  (block.parentElement || block).after(...wrappers);
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const editing = Boolean(block.closest('[data-aue-resource]'));
  const {
    media, brand, actions, connectRow, items,
  } = sortRows([...block.children]);
  const variant = variantOf(block, media);
  const phase3 = variant === 'variant-phase-3';
  // the section is the footer: laid out by jsw-footer.css with its column and social blocks
  [block, block.closest('.section')].filter(Boolean).forEach((node) => {
    node.classList.remove(...VARIANTS);
    node.classList.add(variant);
  });
  block.closest('.section')?.classList.add('jsw-footer-section');

  // the actions cell's links, read before either is moved: the CTA button, the privacy policy
  const [ctaLink, privacyLink] = [...(actions?.querySelectorAll('a') || [])];
  const { brand: branding, cta } = buildBrand(brand, ctaLink, editing);
  const legal = buildLegal(privacyLink, editing);
  const inner = el('div', 'jsw-footer-inner');
  if (phase3) {
    // the branding with the privacy policy under it, then the CTA (centred); no photo
    branding.append(legal);
    inner.append(branding, cta);
    block.replaceChildren(inner);
  } else {
    // the branding with the CTA under it; the privacy policy at the foot of the footer
    branding.append(cta);
    inner.append(branding, legal);
    block.replaceChildren(buildMedia(media), inner);
  }
  buildLegacyParts(block, connectRow, items, editing);
  if (editing) block.classList.add('jsw-footer-editing');
}
