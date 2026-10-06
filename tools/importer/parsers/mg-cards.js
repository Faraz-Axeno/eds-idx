/* eslint-disable */
/* global WebImporter */
/**
 * Parser for mg-cards. Base: cards (custom city carousel). Source: https://www.mgselect.co.in/
 * Generated: 2026-10-05
 *
 * Block contract (blocks/mg-cards/mg-cards.js + _mg-cards.json, xwalk container):
 *   Row 1 (block model): <!-- field:background --> shared map background image
 *   Item rows (mg-cards-item), 2 cells:
 *     cell 1: <!-- field:image --> artwork img (alt = city, collapsed imageAlt)
 *     cell 2: <!-- field:text -->  p > a[href=/dealer/...] city name
 *
 * Source selectors (validated against migration-work/block-context/mg-cards/source.html):
 *   .mg-swiper-slide / .swiper-slide (14, "Slide N of 14")  -> iterate block-level slide wrappers
 *     .hero__banner--wrapper > div.position-absolute picture -> shared background (dealer-carousel-bg)
 *     .hero__banner__dm__img--container a[href]              -> dealer link (aria-label = city)
 *     .hero__banner__dm__img--container picture              -> artwork (desktop min-width source)
 * Iteration is keyed on the slide <div>s, not the <a> wrappers (inline-anchor merge trap).
 * Images may arrive as DM carrier anchors (a[href*="/is/image/"]) if DM transformer ran first.
 */
const clean = (t) => (t || '').replace(/\s+/g, ' ').trim();
const titleCase = (t) => clean(t).replace(/\b([a-z])/g, (m) => m.toUpperCase());

function srcsetUrl(source) {
  const srcset = source && source.getAttribute('srcset');
  if (!srcset) return '';
  return srcset.trim().split(',')[0].trim().split(/\s+/)[0];
}

function pickImage(document, container) {
  if (!container) return null;
  const picture = container.matches('picture') ? container : container.querySelector('picture');
  const img = container.querySelector('img');
  let src = '';
  if (picture) src = srcsetUrl(picture.querySelector('source[media*="min-width"]'));
  if (!src && img) src = img.getAttribute('src') || '';
  if (!src && picture) src = srcsetUrl(picture.querySelector('source'));
  let alt = img ? clean(img.getAttribute('alt') || img.getAttribute('title')) : '';
  if (!src) {
    const dm = container.querySelector('a[href*="/is/image/"]');
    if (dm) {
      src = dm.getAttribute('href');
      alt = clean(dm.textContent);
    }
  }
  if (!src) return null;
  const out = document.createElement('img');
  out.src = src;
  out.alt = alt;
  return out;
}

function hinted(document, field, nodes) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${field} `));
  nodes.forEach((n) => frag.appendChild(n));
  return frag;
}

export default function parse(element, { document }) {
  let slides = [...element.querySelectorAll('.mg-swiper-slide')];
  if (!slides.length) slides = [...element.querySelectorAll('.swiper-slide')];
  slides = slides.filter((s) => !s.classList.contains('swiper-slide-duplicate'));

  let background = null;
  const items = [];
  const seenHref = new Set();

  slides.forEach((slide) => {
    // Shared background picture sits in the absolutely-positioned layer before the artwork container.
    if (!background) {
      const bgLayer = slide.querySelector('.hero__banner--wrapper > div.position-absolute');
      if (bgLayer) background = pickImage(document, bgLayer);
      // Shared decorative map: the per-slide city alt does not describe it.
      if (background) background.alt = '';
    }

    const artContainer = slide.querySelector('.hero__banner__dm__img--container') || slide;
    const link = [...artContainer.querySelectorAll('a[href]')]
      .find((a) => !(a.getAttribute('href') || '').includes('/is/image/'));
    const art = pickImage(document, artContainer.querySelector('picture') || artContainer);
    const href = link ? link.getAttribute('href') : '';
    const city = (link && clean(link.getAttribute('aria-label') || link.textContent))
      || (art && art.alt) || '';

    if (!art && !href) return;
    const key = `${href}|${art ? art.src : ''}`;
    if (seenHref.has(key)) return;
    seenHref.add(key);
    items.push({ art, href, city });
  });

  // Empty-block guard.
  if (!items.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  cells.push([background ? hinted(document, 'background', [background]) : '']);

  items.forEach(({ art, href, city }) => {
    let textCell = '';
    if (href) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.href = href;
      a.textContent = titleCase(city) || href;
      p.appendChild(a);
      textCell = hinted(document, 'text', [p]);
    } else if (city) {
      const p = document.createElement('p');
      p.textContent = titleCase(city);
      textCell = hinted(document, 'text', [p]);
    }
    cells.push([art ? hinted(document, 'image', [art]) : '', textCell]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'mg-cards', cells });
  element.replaceWith(block);
}
