/* eslint-disable */
/* global WebImporter */
/**
 * Parser for mg-vehicles. Base: carousel (custom). Source: https://www.mgselect.co.in/
 * Generated: 2026-10-05
 *
 * Block contract (blocks/mg-vehicles/mg-vehicles.js + _mg-vehicles.json, xwalk container):
 *   Row 1: <!-- field:dayBackground -->   day background picture
 *   Row 2: <!-- field:nightBackground --> night background picture
 *   Item rows (mg-vehicles-item), 2 cells:
 *     cell 1 (media_ group):   <!-- field:media_dayImage --> img, <!-- field:media_nightImage --> img
 *     cell 2 (content_ group): <!-- field:content_text --> h3 title, p tagline, p>a EXPLORE NOW, p>a DOWNLOAD BROCHURE
 *
 * Source selectors (validated against migration-work/block-context/mg-vehicles/source.html):
 *   .product-showcase__background--light / --dark picture        -> backgrounds
 *   .product-showcase__swiper .swiper-slide:not(.swiper-slide-duplicate) -> per-vehicle images
 *     .product-showcase__swiper--image-light / -dark picture     -> day / night car images
 *   .car-models-carousel__content (paired by index with slides)  -> title, tagline, CTAs
 * Images may arrive as DM carrier anchors (a[href*="/is/image/"]) if DM transformer ran first.
 */
const clean = (t) => (t || '').replace(/\s+/g, ' ').trim();

function srcsetUrl(source) {
  const srcset = source && source.getAttribute('srcset');
  if (!srcset) return '';
  return srcset.trim().split(',')[0].trim().split(/\s+/)[0];
}

/** Returns an <img> for the best (desktop) rendition inside a container, or null. */
function pickImage(document, container) {
  if (!container) return null;
  const picture = container.querySelector('picture');
  const img = container.querySelector('img');
  let src = '';
  if (picture) src = srcsetUrl(picture.querySelector('source[media*="min-width"]') || picture.querySelector('source'));
  if (!src && img) src = img.getAttribute('src') || '';
  let alt = img ? clean(img.getAttribute('alt') || img.getAttribute('title')) : '';
  if (!src) {
    // DM carrier anchor form: <a href="https://...scene7.com/is/image/...">alt</a>
    const dm = container.querySelector('a[href*="/is/image/"]');
    if (dm) {
      src = dm.getAttribute('href');
      alt = clean(dm.textContent);
    }
  }
  if (!src) return null;
  const out = document.createElement('img');
  out.src = src;
  out.alt = /^alt text$/i.test(alt) ? '' : alt;
  return out;
}

function hinted(document, field, nodes) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${field} `));
  nodes.forEach((n) => frag.appendChild(n));
  return frag;
}

export default function parse(element, { document }) {
  const cells = [];

  // ---- Block-level background rows ---------------------------------------
  const dayBg = pickImage(document, element.querySelector('.product-showcase__background--light'));
  const nightBg = pickImage(document, element.querySelector('.product-showcase__background--dark'));
  cells.push([dayBg ? hinted(document, 'dayBackground', [dayBg]) : '']);
  cells.push([nightBg ? hinted(document, 'nightBackground', [nightBg]) : '']);

  // ---- Vehicle items -----------------------------------------------------
  const slides = [...element.querySelectorAll('.product-showcase__swiper .swiper-slide')]
    .filter((s) => !s.classList.contains('swiper-slide-duplicate'));
  const contents = [...element.querySelectorAll('.car-models-carousel__content')];
  const count = Math.max(slides.length, contents.length);

  let items = 0;
  for (let i = 0; i < count; i += 1) {
    const slide = slides[i];
    const content = contents[i];

    const day = slide && pickImage(document, slide.querySelector('.product-showcase__swiper--image-light') || slide);
    const night = slide && pickImage(document, slide.querySelector('.product-showcase__swiper--image-dark'));

    const mediaNodes = [];
    if (day) mediaNodes.push(document.createComment(' field:media_dayImage '), day);
    if (night) mediaNodes.push(document.createComment(' field:media_nightImage '), night);

    const textNodes = [];
    if (content) {
      const titleEl = content.querySelector('.car-models-carousel__content-name, h1, h2, h3, h4, h5, h6');
      const title = titleEl ? clean(titleEl.textContent) : '';
      if (title) {
        const h = document.createElement('h3');
        h.textContent = title;
        textNodes.push(h);
      }
      const descEl = content.querySelector('.car-models-carousel__content-description, p');
      const desc = descEl ? clean(descEl.textContent) : '';
      if (desc) {
        const p = document.createElement('p');
        p.textContent = desc;
        textNodes.push(p);
      }
      // Source duplicates each CTA for mobile/desktop - dedupe by href, keep order.
      const seen = new Set();
      content.querySelectorAll('a[href]').forEach((a) => {
        const href = a.getAttribute('href');
        if (!href || seen.has(href) || href.includes('/is/image/')) return;
        const labelEl = a.querySelector('.cta-section__label');
        const label = clean((labelEl || a).textContent) || clean(a.getAttribute('title'));
        if (!label) return;
        seen.add(href);
        const p = document.createElement('p');
        const link = document.createElement('a');
        link.href = href;
        link.textContent = label;
        p.appendChild(link);
        textNodes.push(p);
      });
    }

    if (!mediaNodes.length && !textNodes.length) continue;
    const mediaCell = document.createDocumentFragment();
    mediaNodes.forEach((n) => mediaCell.appendChild(n));
    cells.push([
      mediaNodes.length ? mediaCell : '',
      textNodes.length ? hinted(document, 'content_text', textNodes) : '',
    ]);
    items += 1;
  }

  // Empty-block guard.
  if (!items && !dayBg && !nightBg) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'mg-vehicles', cells });
  element.replaceWith(block);
}
