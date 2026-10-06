/* eslint-disable */
/* global WebImporter */
/**
 * Parser for mg-timeline. Base: carousel/timeline (custom). Source: https://www.mgselect.co.in/
 * Generated: 2026-10-05
 *
 * Block contract (blocks/mg-timeline/mg-timeline.js + _mg-timeline.json, xwalk container):
 *   One item row (mg-timeline-item) per milestone, 3 cells:
 *     cell 1: <!-- field:image --> img (imageAlt collapsed)
 *     cell 2: <!-- field:year -->  bare year text (e.g. 1924)
 *     cell 3: <!-- field:text -->  h3 title + p description
 *
 * Source selectors (validated against migration-work/block-context/mg-timeline/source.html):
 *   .swiper-slide.timeline-card[data-year] (18)          -> iterate (block-level div)
 *     .model-year / [data-year]                          -> year
 *     .overlay (text minus "+" span and tooltip)          -> title
 *     .timeline-card-tooltip (hidden tooltip)            -> description
 *     picture.timeline-card__picture img                 -> image
 * Images may arrive as DM carrier anchors (a[href*="/is/image/"]) if DM transformer ran first.
 */
const clean = (t) => (t || '').replace(/[​-‍﻿]/g, '').replace(/\s+/g, ' ').trim();

function hinted(document, field, nodes) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${field} `));
  nodes.forEach((n) => frag.appendChild(typeof n === 'string' ? document.createTextNode(n) : n));
  return frag;
}

function pickImage(document, slide, fallbackAlt) {
  const img = slide.querySelector('picture img, img');
  let src = img ? img.getAttribute('src') : '';
  if (!src) {
    const source = slide.querySelector('picture source[srcset]');
    if (source) src = source.getAttribute('srcset').trim().split(',')[0].trim().split(/\s+/)[0];
  }
  let alt = img ? clean(img.getAttribute('alt') || img.getAttribute('title')) : '';
  if (!src) {
    const dm = slide.querySelector('a[href*="/is/image/"]');
    if (dm) {
      src = dm.getAttribute('href');
      alt = clean(dm.textContent);
    }
  }
  if (!src) return null;
  const out = document.createElement('img');
  out.src = src;
  out.alt = alt || fallbackAlt || '';
  return out;
}

export default function parse(element, { document }) {
  let slides = [...element.querySelectorAll('.timeline-card')];
  if (!slides.length) slides = [...element.querySelectorAll('.swiper-slide')];
  slides = slides.filter((s) => !s.classList.contains('swiper-slide-duplicate'));

  // Order by swiper index when present (loop mode may rotate DOM order); dedupe by index.
  const seenIdx = new Set();
  slides = slides
    .map((s, i) => {
      const idx = parseInt(s.getAttribute('data-swiper-slide-index'), 10);
      return { s, order: Number.isNaN(idx) ? i : idx, hasIdx: !Number.isNaN(idx), i };
    })
    .sort((a, b) => (a.order - b.order) || (a.i - b.i))
    .filter(({ order, hasIdx }) => {
      if (!hasIdx) return true;
      if (seenIdx.has(order)) return false;
      seenIdx.add(order);
      return true;
    })
    .map(({ s }) => s);

  const cells = [];
  slides.forEach((slide) => {
    const yearEl = slide.querySelector('.model-year');
    const year = clean(slide.getAttribute('data-year')) || (yearEl ? clean(yearEl.textContent) : '');

    // Title = overlay text without the "+" marker span and the tooltip.
    const overlay = slide.querySelector('.overlay');
    const tooltip = slide.querySelector('.timeline-card-tooltip, .tooltip');
    let title = '';
    if (overlay) {
      const copy = overlay.cloneNode(true);
      copy.querySelectorAll('.timeline-card-tooltip, .tooltip, span').forEach((n) => n.remove());
      title = clean(copy.textContent).replace(/^\+\s*/, '');
    }
    const description = tooltip ? clean(tooltip.textContent) : '';

    const image = pickImage(document, slide, title);
    if (!title && image) title = clean(image.alt);
    if (!year && !title && !description && !image) return;

    const textNodes = [];
    if (title) {
      const h = document.createElement('h3');
      h.textContent = title;
      textNodes.push(h);
    }
    if (description) {
      const p = document.createElement('p');
      p.textContent = description;
      textNodes.push(p);
    }

    cells.push([
      image ? hinted(document, 'image', [image]) : '',
      year ? hinted(document, 'year', [year]) : '',
      textNodes.length ? hinted(document, 'text', textNodes) : '',
    ]);
  });

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'mg-timeline', cells });
  element.replaceWith(block);
}
