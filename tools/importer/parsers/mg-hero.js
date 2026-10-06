/* eslint-disable */
/* global WebImporter */
/**
 * Parser for mg-hero. Base: hero (custom). Source: https://www.mgselect.co.in/
 * Generated: 2026-10-05
 *
 * Block contract (blocks/mg-hero/mg-hero.js + _mg-hero.json, xwalk):
 *   Row 1: <!-- field:image -->        desktop background picture
 *   Row 2: <!-- field:mobileImage -->  mobile / portrait picture (optional, row always emitted)
 *   Row 3: <!-- field:text -->         heading + links (first = EXPLORE CTA, rest = top-right pills)
 *
 * Source selectors (validated against migration-work/block-context/mg-hero/source.html):
 *   picture source[media*="min-width"]  -> desktop image (hero-banner-mg-select-gaurav-gupta)
 *   picture source[media*="max-width"] / img.hero__banner__dm--img -> mobile portrait image
 *   .hero__banner--title h5             -> heading "MG SELECT x GAURAV GUPTA"
 *   a.cta-section__main                 -> EXPLORE
 *   #sticky-cta-m9-wrapper-v2 a, #sticky-cta-cyber-wrapper-v2 a (document-level, outside main)
 * Images may arrive as DM carrier anchors (a[href*="/is/image/"]) if the DM transformer ran first.
 */
const BULLET_RE = /^[\s•·‣⁃▪●*\-–—]+|[\s•·*\-–—✕]+$/g;
const clean = (t) => (t || '').replace(/\s+/g, ' ').replace(BULLET_RE, '').trim();

function srcsetUrl(source) {
  const srcset = source && source.getAttribute('srcset');
  if (!srcset) return '';
  return srcset.split(',')[0].trim().split(/\s+/)[0];
}

function makeImg(document, src, alt) {
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt || '';
  return img;
}

function hinted(document, field, nodes) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${field} `));
  nodes.forEach((n) => frag.appendChild(n));
  return frag;
}

function makeLink(document, href, label) {
  const p = document.createElement('p');
  const a = document.createElement('a');
  a.href = href;
  a.textContent = label;
  p.appendChild(a);
  return p;
}

export default function parse(element, { document }) {
  // ---- Images -------------------------------------------------------------
  const picture = element.querySelector('picture');
  const fallbackImg = element.querySelector('img.hero__banner__dm--img, picture img, img');
  const alt = (fallbackImg && (fallbackImg.getAttribute('alt') || fallbackImg.getAttribute('title'))) || '';

  let desktopSrc = '';
  let mobileSrc = '';
  if (picture) {
    desktopSrc = srcsetUrl(picture.querySelector('source[media*="min-width"]'));
    mobileSrc = srcsetUrl(picture.querySelector('source[media*="max-width"]'));
  }
  const imgSrc = fallbackImg ? fallbackImg.getAttribute('src') : '';
  if (!desktopSrc) desktopSrc = imgSrc;
  if (!mobileSrc && imgSrc && imgSrc !== desktopSrc) mobileSrc = imgSrc;

  // DM carrier-anchor fallback (DM transformer already converted <img> into <a href=DM>alt</a>).
  if (!desktopSrc) {
    const dmAnchors = [...element.querySelectorAll('a[href*="/is/image/"]')];
    if (dmAnchors[0]) desktopSrc = dmAnchors[0].getAttribute('href');
    if (dmAnchors[1]) mobileSrc = dmAnchors[1].getAttribute('href');
  }
  if (mobileSrc === desktopSrc) mobileSrc = '';

  // ---- Heading ------------------------------------------------------------
  const headingSrc = element.querySelector(
    '.hero__banner--title h1, .hero__banner--title h2, .hero__banner--title h3, .hero__banner--title h4, .hero__banner--title h5, .hero__banner--title h6',
  ) || element.querySelector('h1, h2, h3, h4, h5, h6') || element.querySelector('.hero__banner--title');
  const headingText = headingSrc ? clean(headingSrc.textContent) : '';

  // ---- Links --------------------------------------------------------------
  const links = [];
  const seen = new Set();
  const addLink = (a) => {
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.includes('/is/image/')) return;
    const labelEl = a.querySelector('.cta-section__label');
    const label = clean((labelEl || a).textContent) || clean(a.getAttribute('title'));
    if (!label || seen.has(href)) return;
    seen.add(href);
    links.push({ href, label });
  };
  // Primary CTA (EXPLORE) first.
  element.querySelectorAll('a.cta-section__main, .hero__banner__content--cta a').forEach(addLink);
  // Sticky CTAs live outside main; removed only in afterTransform by the cleanup transformer.
  addLink(document.querySelector('#sticky-cta-m9-wrapper-v2 a'));
  addLink(document.querySelector('#sticky-cta-cyber-wrapper-v2 a'));

  // Empty-block guard.
  if (!desktopSrc && !headingText && !links.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // ---- Cells --------------------------------------------------------------
  const cells = [];
  cells.push([desktopSrc ? hinted(document, 'image', [makeImg(document, desktopSrc, alt)]) : '']);
  cells.push([mobileSrc ? hinted(document, 'mobileImage', [makeImg(document, mobileSrc, alt)]) : '']);

  const textNodes = [];
  if (headingText) {
    const h = document.createElement('h1');
    h.textContent = headingText;
    textNodes.push(h);
  }
  links.forEach(({ href, label }) => textNodes.push(makeLink(document, href, label)));
  cells.push([textNodes.length ? hinted(document, 'text', textNodes) : '']);

  const block = WebImporter.Blocks.createBlock(document, { name: 'mg-hero', cells });
  element.replaceWith(block);
}
