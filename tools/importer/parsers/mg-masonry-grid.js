/* eslint-disable */
/* global WebImporter */
/**
 * Parser for mg-masonry-grid. Base: columns (custom collage). Source: https://www.mgselect.co.in/
 * Generated: 2026-10-05
 *
 * Block contract (blocks/mg-masonry-grid/mg-masonry-grid.js + _mg-masonry-grid.json, xwalk container):
 *   One item row (mg-masonry-grid-item) per image, 1 cell: <!-- field:image --> img (alt collapsed)
 *
 * Source selectors (validated against migration-work/block-context/mg-masonry-grid/source.html):
 *   .swiper-slide[data-swiper-slide-index] picture -> 20 slides = 10 unique images duplicated for looping.
 *   Slides are ordered by data-swiper-slide-index (swiper loop may rotate DOM order) and
 *   de-duplicated by image path (+ alt) so only the 10 unique images remain, in order.
 * Images may arrive as DM carrier anchors (a[href*="/is/image/"]) if DM transformer ran first.
 */
const clean = (t) => (t || '').replace(/\s+/g, ' ').trim();

function srcsetUrl(source) {
  const srcset = source && source.getAttribute('srcset');
  if (!srcset) return '';
  return srcset.trim().split(',')[0].trim().split(/\s+/)[0];
}

function imageKey(src) {
  try {
    const u = new URL(src, 'https://x/');
    return u.pathname.toLowerCase();
  } catch (e) {
    return (src || '').split('?')[0].toLowerCase();
  }
}

export default function parse(element, { document }) {
  // Iterate the slide wrappers (block-level divs), falling back to bare pictures/DM anchors.
  let units = [...element.querySelectorAll('.swiper-slide')];
  if (!units.length) units = [...element.querySelectorAll('picture, a[href*="/is/image/"]')];

  const indexed = units.map((unit, domIndex) => {
    const idx = parseInt(unit.getAttribute('data-swiper-slide-index'), 10);
    return { unit, order: Number.isNaN(idx) ? domIndex : idx, domIndex };
  });
  indexed.sort((a, b) => (a.order - b.order) || (a.domIndex - b.domIndex));

  const seen = new Set();
  const images = [];
  indexed.forEach(({ unit }) => {
    const img = unit.tagName === 'IMG' ? unit : unit.querySelector('img');
    const picture = unit.tagName === 'PICTURE' ? unit : unit.querySelector('picture');
    let src = img ? img.getAttribute('src') : '';
    if (!src && picture) src = srcsetUrl(picture.querySelector('source'));
    let alt = img ? clean(img.getAttribute('alt') || img.getAttribute('title')) : '';
    if (!src) {
      const dm = unit.matches('a[href*="/is/image/"]') ? unit : unit.querySelector('a[href*="/is/image/"]');
      if (dm) {
        src = dm.getAttribute('href');
        alt = clean(dm.textContent);
      }
    }
    if (!src) return;
    const key = imageKey(src);
    if (seen.has(key)) return;
    seen.add(key);
    images.push({ src, alt });
  });

  // Empty-block guard.
  if (!images.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = images.map(({ src, alt }) => {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(' field:image '));
    const img = document.createElement('img');
    img.src = src;
    img.alt = alt;
    frag.appendChild(img);
    return [frag];
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'mg-masonry-grid', cells });
  element.replaceWith(block);
}
