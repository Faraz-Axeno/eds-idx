/*
 * jsw-footer: the JSW footer, one block, authored once on its own page (/jsw-footer) and shown as
 * the footer of the JSW pages (scripts.js, loadJswFooter: in their <footer>, instead of the
 * site's). Everything is the block's own (_jsw-footer.json, its properties panel in tabs): the
 * layout, background, logo, copyright, button and privacy policy (Footer tab); the navigation
 * columns, a multi-field (footerColumns), each column its heading and its own multi-field of links
 * (columnLinks) (Columns tab); the social heading and the social icons, a multi-field
 * (socialIcons) (Social icons tab). Each column shows its first MAX_ITEMS links, the footer its
 * first MAX_ITEMS icons. In one of two layouts (the Footer layout field, a class on the block,
 * jsw-footer.css):
 *   variant-phase-5 (Variant A, the default; "Desktop Footer"): a photo (or a muted looping video)
 *     behind the whole footer; at the top left the logo, the copyright line and the CTA button; at
 *     the top right the columns and the social icons (CONNECT); at the foot, on the left, the
 *     privacy policy link
 *   variant-phase-3 (Variant B; the Phase 3 footer): on a gradient (no photo); at the left the
 *     logo, the copyright line and the privacy policy link; the CTA button in the centre; at the
 *     right CONNECT (the social links as text, their network names) and the columns
 * Rows (the block's four cells, in this order):
 *   media: footer layout | background type | background image (+ alt) | background video, then
 *     the starting content (fields hidden in the panel, uploaded with the page: two columns, each
 *     its heading and up to MAX_ITEMS links, and up to MAX_ITEMS icons, the design's; shown for
 *     the columns until the footer columns list holds a column, for the icons until the social
 *     icons list holds an icon)
 *   brand: logo (+ alt) | copyright text | CTA button link + text | privacy policy link + text |
 *     social heading
 *   footer columns: a list, each item its heading and its list of links
 *   social icons: a list, each item its image (+ network name) and its link
 * (Content saved before had seven cells: media, brand, actions, the footer columns, the social
 * heading, the social icons, then the starting content.)
 * A multi-field's items are rendered as a list (<ul>, items of one element each) or one after the
 * other between <hr> (items of more than one), so both are read: a heading starts a column, a
 * picture an icon. Content saved before is read too: with the columns and icons as numbered
 * fields (a fourth cell), as items of this block, or as jsw-footer-column and jsw-footer-social
 * blocks beside it in its section (then taken into this block).
 */

import { moveInstrumentation } from '../../scripts/scripts.js';

// the most links a column shows, and the most social icons: the model has MAX_ITEMS of each;
// content saved before could hold more, the page shows the first MAX_ITEMS only (.slice)
const MAX_ITEMS = 4;

// the most characters each text shows on the page, as the model's limits (_jsw-footer.json): a
// longer text, if saved anyway, is cut there with "…" (its whole wording as a tooltip); the
// editor shows every text whole
const TEXT_LIMITS = {
  copyright: 60,
  ctaButtonText: 24,
  privacyPolicyText: 30,
  heading: 20,
  linkText: 24,
};

// the items of content saved before (Footer Column, Footer Link, Social Icon)
const LEGACY_ITEM = /^jsw-footer-(column|link|social)$/;

// the layouts (the Footer layout field's values, and the block's class); the first the default
const VARIANTS = ['variant-phase-5', 'variant-phase-3'];
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

/** a saved item row's type (content saved before): the editor's model, the imported type cell */
function legacyType(row) {
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
 * the block's rows: its four field cells; content saved with items has its items after them (and
 * a social heading for its fourth cell), told by their type (editor, imported) or by place
 */
function sortRows(rows) {
  const typed = rows.map((row) => ({ row, type: legacyType(row) }));
  const marked = typed.some(({ type }) => type);
  const fieldRows = marked ? typed.filter(({ type }) => !type) : typed.slice(0, 4);
  const itemRows = marked ? typed.filter(({ type }) => type) : typed.slice(4);
  const items = itemRows.map(({ row, type }) => {
    if (type) return { row, type };
    if (row.querySelector('picture')) return { row, type: 'social' };
    if (row.querySelector('a')) return { row, type: 'link' };
    return { row, type: 'column' };
  });
  const [media, brand, actions, nav] = fieldRows.map(({ row }) => cellsOf(row)[0] || null);
  return {
    media, brand, actions, nav, items,
  };
}

/** the text element of a cell or row (a heading): its paragraph without a link or picture */
const headingOf = (node) => textsOf(node)[0] || null;

/**
 * the navigation from the fourth cell's fields, in the model's order: column 1's heading and
 * links, column 2's, then the social heading and icons (each icon its picture, then its link).
 * In the editor the fields are named (data-aue-prop): an empty heading does not shift the others
 * @returns {{columns: {heading: Element, links: Element[]}[], social: {heading: Element,
 *   icons: {picture: Element, link: Element}[]}}}
 */
function readNav(cell) {
  const columns = [{ heading: null, links: [] }, { heading: null, links: [] }];
  const social = { heading: null, icons: [] };
  let part = 0; // 0, 1: the columns; 2: the social links
  let headings = 0;
  [...(cell?.children || [])].forEach((node) => {
    const prop = node.dataset.aueProp || node.querySelector('[data-aue-prop]')?.dataset.aueProp || '';
    const picture = node.querySelector('picture') || (node.matches('picture') ? node : null);
    const link = node.matches('a') ? node : node.querySelector('a');
    const column = prop.match(/^(?:nav_column|media_startColumn)(\d)/)?.[1];
    if (column) part = Number(column) - 1;
    else if (/^(?:nav_social|media_startSocial)/.test(prop)) part = 2;
    if (picture) {
      part = 2;
      social.icons.push({ picture, link: null });
    } else if (link) {
      if (part < 2) columns[part].links.push(link);
      else {
        const last = social.icons[social.icons.length - 1];
        if (last && !last.link) last.link = link;
        else social.icons.push({ picture: null, link });
      }
    } else if (node.textContent.trim()) {
      // a heading: the next one in order (column 1, column 2, the social links), unless named
      if (!prop) part = Math.min(headings, 2);
      headings = Math.max(headings, part + 1);
      if (part < 2) columns[part].heading = node;
      else social.heading = node;
    }
  });
  return { columns, social };
}

/** content saved with items: its Footer Columns (each with the Footer Links after it) and icons */
function readItems(items, connectCell) {
  const columns = [];
  const social = { heading: headingOf(connectCell), icons: [] };
  items.forEach(({ row, type }) => {
    if (type === 'column') columns.push({ heading: headingOf(row), links: [] });
    else if (type === 'social') {
      social.icons.push({ picture: row.querySelector('picture'), link: row.querySelector('a') });
    } else {
      if (!columns.length) columns.push({ heading: null, links: [] });
      const link = row.querySelector('a');
      if (link) columns[columns.length - 1].links.push(link);
    }
  });
  return { columns, social };
}

/**
 * content saved with jsw-footer-column and jsw-footer-social blocks beside this one: their
 * headings, links and icons, those blocks taken out of the section (not loaded)
 */
function readSiblingBlocks(block) {
  const section = block.closest('.section');
  const blocks = [...(section?.querySelectorAll('.jsw-footer-column, .jsw-footer-social') || [])];
  if (!blocks.length) return null;
  const columns = [];
  const social = { heading: null, icons: [] };
  blocks.forEach((part) => {
    const [first, ...rows] = [...part.children];
    if (part.classList.contains('jsw-footer-social')) {
      social.heading = headingOf(first);
      rows.forEach((r) => social.icons.push({
        picture: r.querySelector('picture'), link: r.querySelector('a'),
      }));
    } else {
      const links = rows.map((r) => r.querySelector('a')).filter(Boolean);
      columns.push({ heading: headingOf(first), links });
    }
    part.dataset.blockStatus = 'loaded';
    (part.parentElement?.matches('[class$="-wrapper"]') ? part.parentElement : part).remove();
  });
  return { columns, social };
}

/** the background: the picture, or the video over it (the picture until it plays) */
function buildMedia(cell) {
  const media = el('div', 'jsw-footer-media');
  if (!cell) return media;
  const picture = cell.querySelector('picture');
  const mode = textsOf(cell).map((n) => n.textContent.trim().toLowerCase())
    .find((t) => t === 'image' || t === 'video' || t === 'both') || 'image';
  const videoUrl = cell.querySelector('a')?.href;
  if (picture) media.append(picture);
  const ext = videoUrl?.split(/[?#]/)[0].split('.').pop().toLowerCase();
  // Video, or Image and video (for now shown as Video): the video over the picture
  if (mode === 'image' || !videoUrl) return media;

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

const MODES = ['image', 'video', 'both'];

/**
 * the block's four cells (the model now): media (with the starting content after its own
 * fields), brand (with the button, privacy policy and social heading), the footer columns list
 * and the social icons list; told from content saved before by its brand cell holding the links
 */
function isCompact(rows) {
  if (rows.length !== 4) return false;
  const [, brand, columns, icons] = rows.map((r) => cellsOf(r)[0]);
  if (!brand?.querySelector('a')) return false;
  const empty = (cell) => !cell || (!cell.textContent.trim() && !cell.querySelector('picture, a'));
  return (empty(columns) || Boolean(columns.querySelector('hr, ul, a')))
    && (empty(icons) || Boolean(icons.querySelector('hr, ul, picture, a')));
}

// the block's items (the model now): a Column (its title | its links) and an Icon
const ITEM_MODELS = { 'jsw-footer-column': 'column', 'jsw-footer-icon': 'icon' };
const ITEM_TYPE_CELL = /^jsw-footer-(column|icon)$/;

/** the block's two cells (media, brand: with the button), then its Column and Icon items */
function isItemsFormat(rows) {
  if (rows.length < 2 || !cellsOf(rows[1])[0]?.querySelector('a') || isCompact(rows)) return false;
  return rows.slice(2).every((row) => ITEM_MODELS[row.dataset.aueModel]
    || ITEM_TYPE_CELL.test(cellsOf(row)[0]?.textContent.trim() || '') || cellsOf(row).length >= 2);
}

/** the block's Column and Icon items, in order, each with its row (its editor instrumentation) */
function readFooterItems(rows) {
  const columns = [];
  const icons = [];
  rows.forEach((row) => {
    let type = ITEM_MODELS[row.dataset.aueModel];
    const first = cellsOf(row)[0];
    const typed = first?.textContent.trim().match(ITEM_TYPE_CELL)?.[1];
    if (!type && typed && !first.querySelector('a, picture')) {
      type = typed;
      first.remove();
    }
    if (!type) type = row.querySelector('picture') ? 'icon' : 'column';
    const [titleCell, linksCell] = cellsOf(row);
    if (type === 'column') {
      const links = [...(linksCell?.querySelectorAll('a') || [])].filter((a) => a.getAttribute('href'));
      columns.push({ heading: headingOf(titleCell), links, row });
    } else icons.push({ picture: row.querySelector('picture'), link: row.querySelector('a[href]'), row });
  });
  return { columns, icons };
}

/** in the editor, an empty item's place: something to select (never on the page) */
function placeholder(text) {
  const span = el('span', 'jsw-footer-placeholder');
  span.textContent = text;
  return span;
}

/**
 * the media cell's own fields (layout, background type, image, video) and, after them, the
 * starting content (named media_start… in the editor; else from its first heading, a text other
 * than the layout and background type, or a second picture)
 */
function splitMedia(cell) {
  const own = el('div');
  const starting = el('div');
  let inStarting = false;
  let pictures = 0;
  [...(cell?.children || [])].forEach((node) => {
    const prop = node.dataset.aueProp || node.querySelector('[data-aue-prop]')?.dataset.aueProp || '';
    const text = node.textContent.trim();
    const value = text.toLowerCase();
    const hasPicture = Boolean(node.querySelector('picture') || node.matches('picture'));
    if (!inStarting) {
      if (prop.startsWith('media_start')) inStarting = true;
      else if (!prop && !hasPicture && !node.querySelector('a') && text
        && !VARIANTS.includes(value) && !MODES.includes(value)) inStarting = true;
      else if (!prop && hasPicture && pictures > 0) inStarting = true;
    }
    if (hasPicture && !inStarting) pictures += 1;
    (inStarting ? starting : own).append(node);
  });
  return { own, starting };
}

/**
 * the multi-fields' cells: the fourth to sixth cells hold lists, or are empty (none added yet);
 * a seventh, the starting content (hidden fields), may follow
 */
function isMultiFields(rows) {
  if (rows.length !== 6 && rows.length !== 7) return false;
  const [columns, heading, icons] = rows.slice(3).map((r) => cellsOf(r)[0]);
  const named = (cell, name) => Boolean(cell?.querySelector(`[data-aue-prop="${name}"]`)
    || cell?.matches?.(`[data-aue-prop="${name}"]`));
  if (named(columns, 'footerColumns') || named(icons, 'socialIcons')) return true;
  // the columns hold links (content saved before had a text only there, its social heading), the
  // social heading a text only, the icons pictures and links; each list may be empty
  const empty = (cell) => !cell || (!cell.textContent.trim() && !cell.querySelector('picture, a'));
  const columnsList = empty(columns) || Boolean(columns.querySelector('hr, ul, a'));
  const iconsList = empty(icons) || Boolean(icons.querySelector('hr, ul, picture, a'));
  return columnsList && iconsList && !heading?.querySelector('a, picture');
}

/**
 * the footer columns (footerColumns): in order, a heading starts a column (as does a <hr>), the
 * links after it are its links (columnLinks, listed or one after the other)
 */
function readColumns(cell) {
  const columns = [];
  let current = null;
  const start = () => {
    current = { heading: null, links: [] };
    columns.push(current);
  };
  [...(cell?.querySelectorAll('hr, a, p, h1, h2, h3, h4, h5, h6') || [])].forEach((node) => {
    if (node.matches('hr')) current = null;
    else if (node.matches('a')) {
      if (!current) start();
      current.links.push(node);
    } else if (!node.closest('li, a') && !node.querySelector('a, picture') && node.textContent.trim()) {
      if (!current || current.heading || current.links.length) start();
      current.heading = node;
    }
  });
  return columns;
}

/** the social icons (socialIcons): in order, a picture starts an icon, the link after it is its */
function readIcons(cell) {
  const icons = [];
  [...(cell?.querySelectorAll('hr, picture, a') || [])].forEach((node) => {
    const last = icons[icons.length - 1];
    if (node.matches('hr')) {
      if (last) last.closed = true;
    } else if (node.matches('picture')) icons.push({ picture: node, link: null });
    else if (last && !last.link && !last.closed) last.link = node;
    else icons.push({ picture: null, link: node });
  });
  return icons.map(({ picture, link }) => ({ picture, link }));
}

/** an element's editor instrumentation (data-aue-*: resource, prop, type, model, filter, label) */
function instrument(node, attrs) {
  if (!node) return;
  Object.entries(attrs).forEach(([k, v]) => {
    if (v) node.setAttribute(`data-aue-${k}`, v);
  });
}

/** no editor instrumentation inside an element (what it was moved from: set again below) */
function stripInstrumentation(root) {
  [root, ...root.querySelectorAll('*')].forEach((node) => [...node.attributes]
    .filter(({ name }) => name.startsWith('data-aue-') || name.startsWith('data-richtext-'))
    .forEach(({ name }) => node.removeAttribute(name)));
}

/*
 * In the editor, the navigation as the editor's content tree shows it, nested: the Columns list
 * (footerColumns, a container) holding a Column item for each column (its Column title, then its
 * Links list, columnLinks, a container holding a Link item for each link, its Label), and the
 * Social icons list (socialIcons) holding an Icon item for each icon. The lists' entries are
 * stored under the block as <list>/item<n>, in order: those are the items' resources, so each can
 * be selected, edited in the properties panel (its own model), moved and deleted. The starting
 * content (shown while a list is empty) is not the lists': it is left out of the tree.
 */
function instrumentNav(nav, block, {
  columnsFromList, iconsFromList, asText, socialHeadingProp,
}) {
  const base = block.dataset.aueResource;
  if (!base) return;
  stripInstrumentation(nav);
  instrument(nav.querySelector('.jsw-footer-columns'), {
    resource: `${base}/footerColumns`, prop: 'footerColumns', type: 'container', filter: 'jsw-footer-columns', label: 'Columns',
  });
  if (columnsFromList) {
    [...nav.querySelectorAll('.jsw-footer-columns > .jsw-footer-column')].forEach((column, i) => {
      const path = `${base}/footerColumns/item${i}`;
      const heading = column.querySelector('.jsw-footer-heading');
      instrument(column, {
        resource: path, type: 'component', model: 'jsw-footer-column', label: `Column: ${heading?.textContent.trim() || i + 1}`,
      });
      instrument(heading, { prop: 'columnHeading', type: 'text', label: 'Column title' });
      instrument(column.querySelector('.jsw-footer-links'), {
        resource: `${path}/columnLinks`, prop: 'columnLinks', type: 'container', filter: 'jsw-footer-links', label: 'Links',
      });
      [...column.querySelectorAll('.jsw-footer-links > li')].forEach((item, j) => {
        const a = item.querySelector('a');
        instrument(item, {
          resource: `${path}/columnLinks/item${j}`, type: 'component', model: 'jsw-footer-link', label: `Link: ${a?.textContent.trim() || j + 1}`,
        });
        instrument(a, { prop: 'linkText', type: 'text', label: 'Label' });
      });
    });
  }
  const connect = nav.querySelector('.jsw-footer-connect');
  instrument(connect?.querySelector('.jsw-footer-heading'), { prop: socialHeadingProp, type: 'text', label: 'Social heading' });
  instrument(connect?.querySelector('ul'), {
    resource: `${base}/socialIcons`, prop: 'socialIcons', type: 'container', filter: 'jsw-footer-icons', label: 'Social icons',
  });
  if (iconsFromList) {
    [...(connect?.querySelectorAll('ul > li') || [])].forEach((item, i) => {
      const a = item.querySelector('a');
      const name = a?.getAttribute('aria-label') || a?.textContent.trim() || `${i + 1}`;
      instrument(item, {
        resource: `${base}/socialIcons/item${i}`, type: 'component', model: 'jsw-footer-icon', label: `Icon: ${name}`,
      });
      if (asText) instrument(a, { prop: 'iconImageAlt', type: 'text', label: 'Network name' });
      else instrument(item.querySelector('img'), { prop: 'iconImage', type: 'media', label: 'Icon' });
    });
  }
}

/** a heading of the navigation, from its authored text (its editor instrumentation kept) */
function buildHeading(node, editing) {
  const heading = retag(node, 'h2', 'jsw-footer-heading');
  cap(heading, TEXT_LIMITS.heading, editing);
  return heading;
}

/** a column: its heading, then its first MAX_ITEMS links */
function buildColumn({ heading, links }, editing) {
  const column = el('div', 'jsw-footer-column');
  if (heading) column.append(buildHeading(heading, editing));
  const list = el('ul', 'jsw-footer-links');
  links.slice(0, MAX_ITEMS).forEach((a) => {
    const item = el('li', 'jsw-footer-link');
    external(plain(a));
    a.classList.remove('button', 'primary', 'secondary');
    cap(a, TEXT_LIMITS.linkText, editing);
    item.append(a);
    list.append(item);
  });
  column.append(list);
  return column;
}

/**
 * the social links (CONNECT): their heading, then their first MAX_ITEMS icons, as icons in tiles
 * or (asText, Variant B) their networks' names as links
 */
function buildSocial({ heading, icons }, asText, editing, keepAll = false) {
  const column = el('div', 'jsw-footer-column jsw-footer-connect');
  if (heading) column.append(buildHeading(heading, editing));
  const list = el('ul', asText ? 'jsw-footer-links' : 'jsw-footer-social');
  const shown = keepAll ? icons
    : icons.filter(({ picture, link }) => picture || link).slice(0, MAX_ITEMS);
  shown.forEach(({ picture, link }) => {
    if (!picture && !link) {
      // in the editor, an Icon not filled in yet
      const item = el('li', `${asText ? 'jsw-footer-link' : 'jsw-footer-social-item'} is-empty`);
      const a = el('a', asText ? '' : 'jsw-footer-social-link');
      a.append(placeholder(asText ? 'New icon' : '+'));
      item.append(a);
      list.append(item);
      return;
    }
    const img = picture?.querySelector('img');
    const name = img?.getAttribute('alt')?.trim() || '';
    const a = link ? external(plain(link)) : el('a');
    const item = el('li', asText ? 'jsw-footer-link' : 'jsw-footer-social-item');
    if (asText) {
      a.removeAttribute('class');
      a.textContent = name || a.textContent;
    } else {
      a.className = 'jsw-footer-social-link';
      if (name) a.setAttribute('aria-label', name);
      // the link reads as the network's name; the icon is its picture
      if (img) img.alt = '';
      a.replaceChildren(...(picture ? [picture] : []));
    }
    item.append(a);
    list.append(item);
  });
  column.append(list);
  return column;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const editing = Boolean(block.closest('[data-aue-resource]'));
  const rows = [...block.children];
  const itemsFormat = isItemsFormat(rows);
  const compact = !itemsFormat && isCompact(rows);
  const multiFields = !itemsFormat && (compact || isMultiFields(rows));
  let footerItems = null;
  let media;
  let brand;
  let actions;
  let navCell = null;
  let items = [];
  let columnsCell;
  let socialHeadingCell;
  let iconsCell;
  let startingCell;
  if (itemsFormat) {
    // the two cells: media | brand (+ button, privacy policy, social heading); then the items
    [media, brand] = rows.slice(0, 2).map((r) => cellsOf(r)[0] || null);
    actions = brand;
    footerItems = readFooterItems(rows.slice(2));
    const texts = textsOf(brand);
    socialHeadingCell = el('div');
    const named = brand?.querySelector('[data-aue-prop="brand_socialHeading"]');
    const heading = named || (texts.length > 1 ? texts[texts.length - 1] : null);
    if (heading) socialHeadingCell.append(heading);
  } else if (compact) {
    // the four cells: media (+ starting content) | brand (+ button, privacy, social heading) |
    // footer columns | social icons
    const [mediaCell, brandCell] = rows.slice(0, 2).map((r) => cellsOf(r)[0] || null);
    [, , columnsCell, iconsCell] = rows.map((r) => cellsOf(r)[0] || null);
    const { own, starting } = splitMedia(mediaCell);
    media = own;
    startingCell = starting;
    brand = brandCell;
    actions = brandCell;
    // the social heading: the brand cell's text after its links (named in the editor)
    const texts = textsOf(brandCell);
    socialHeadingCell = el('div');
    const named = brandCell?.querySelector('[data-aue-prop="brand_socialHeading"]');
    const heading = named || (texts.length > 1 ? texts[texts.length - 1] : null);
    if (heading) socialHeadingCell.append(heading);
  } else {
    ({
      media, brand, actions, nav: navCell, items,
    } = multiFields ? { ...sortRows(rows.slice(0, 3)), nav: null, items: [] } : sortRows(rows));
    [columnsCell, socialHeadingCell, iconsCell, startingCell] = multiFields
      ? rows.slice(3).map((r) => cellsOf(r)[0] || null) : [];
  }
  const variant = variantOf(block, media);
  const phase3 = variant === 'variant-phase-3';
  block.classList.remove(...VARIANTS);
  block.classList.add(variant);

  // the columns and social links: the block's multi-fields, else content saved before
  let data = footerItems ? {
    columns: footerItems.columns,
    social: { heading: headingOf(socialHeadingCell), icons: footerItems.icons },
  } : readSiblingBlocks(block);
  let listed = null;
  if (!data && multiFields) {
    // a list with no items yet: the starting content's (the design's, uploaded with the page)
    const starting = readNav(startingCell);
    const columns = readColumns(columnsCell);
    const icons = readIcons(iconsCell);
    listed = { columnsFromList: columns.length > 0, iconsFromList: icons.length > 0 };
    data = {
      columns: columns.length ? columns : starting.columns,
      social: {
        heading: headingOf(socialHeadingCell) || starting.social.heading,
        icons: icons.length ? icons : starting.social.icons,
      },
    };
  }
  if (!data) data = items.length ? readItems(items, navCell) : readNav(navCell);
  const { columns, social } = data;

  const nav = el('nav', 'jsw-footer-nav', { 'aria-label': 'Footer' });
  // the columns, in a box-less wrapper (in the editor the Columns list's container)
  const columnsList = el('div', 'jsw-footer-columns');
  columns.filter((c) => c.heading || c.links.length || (editing && c.row))
    .forEach((c) => {
      const title = c.heading?.textContent.trim();
      const column = buildColumn(c, editing);
      if (itemsFormat && editing) {
        // the Column item: selectable, named by its title (an empty one shown as a placeholder)
        moveInstrumentation(c.row, column);
        column.dataset.aueLabel = `Column: ${title || 'New column'}`;
        if (!title) column.prepend(el('h2', 'jsw-footer-heading'));
        if (!title) column.querySelector('.jsw-footer-heading').append(placeholder('New column'));
      }
      columnsList.append(column);
    });
  nav.append(columnsList);
  // CONNECT: the last column (Variant B: the first)
  const connect = buildSocial(social, phase3, editing, itemsFormat && editing);
  if (itemsFormat && editing) {
    // each Icon item: selectable, named by its network; those after the first MAX_ITEMS filled
    // ones dimmed (never on the page)
    let filled = 0;
    [...connect.querySelectorAll('ul > li')].forEach((item, i) => {
      const { row, picture, link } = social.icons[i] || {};
      if (!row) return;
      moveInstrumentation(row, item);
      // the icon's own field, its image, in the tree under the Icon (its link, around the image
      // in a tile, edited in the properties panel)
      const tile = item.querySelector('a');
      if (tile?.querySelector('img')) {
        [...tile.attributes].filter(({ name: attr }) => attr.startsWith('data-aue-'))
          .forEach(({ name: attr }) => tile.removeAttribute(attr));
      }
      const name = picture?.querySelector('img')?.getAttribute('alt')?.trim()
        || item.querySelector('a')?.getAttribute('aria-label') || '';
      item.dataset.aueLabel = `Icon: ${name || 'New icon'}`;
      if (picture || link) {
        filled += 1;
        if (filled > MAX_ITEMS) {
          item.classList.add('is-over-limit');
          item.title = `Not shown on the page: only the first ${MAX_ITEMS} icons are.`;
        }
      }
    });
  }
  if (phase3) nav.prepend(connect);
  else nav.append(connect);
  if (editing && listed) {
    instrumentNav(nav, block, {
      ...listed, asText: phase3, socialHeadingProp: compact ? 'brand_socialHeading' : 'socialHeading',
    });
  }

  // the actions cell's links, read before either is moved: the CTA button, the privacy policy
  const [ctaLink, privacyLink] = [...(actions?.querySelectorAll('a') || [])];
  const { brand: branding, cta } = buildBrand(brand, ctaLink, editing);
  const legal = buildLegal(privacyLink, editing);
  const inner = el('div', 'jsw-footer-inner');
  if (phase3) {
    // branding (with the privacy policy under it) | the CTA, centred | the columns; no photo
    branding.append(legal);
    inner.append(branding, cta, nav);
    block.replaceChildren(inner);
  } else {
    // branding with the CTA under it | the columns; the privacy policy at the foot
    branding.append(cta);
    inner.append(branding, nav, legal);
    block.replaceChildren(buildMedia(media), inner);
  }
  if (editing) block.classList.add('jsw-footer-editing');
}
