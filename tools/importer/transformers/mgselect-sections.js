/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: MG Select section breaks + Section Metadata.
 * Uses payload.template.sections from page-templates.json (selectors verified in
 * migration-work/cleaned.html: .banner.mg-select-scroller (885), .productShowcase (926),
 * .brandManifesto (1134), .carousel.panelcontainer (1292), .tabs.panelcontainer (1694),
 * div.scroller (4299)).
 *
 * Breaks are inserted in beforeTransform (parsers replace section elements between hooks);
 * Section Metadata is inserted in afterTransform anchored to marker <hr>s.
 * Header theme per panel is read from the source panel classes
 * (light-header / dark-header / mg-header-white / hide-header) and written as a
 * "header" Section Metadata property (light | dark | hidden) consumed by blocks/header.
 */
const SECTION_MARKER_ATTR = 'data-excat-section-id';
const HEADER_THEME_ATTR = 'data-excat-header';

function headerTheme(sectionEl) {
  const has = (cls) => sectionEl.classList.contains(cls) || !!sectionEl.querySelector(`:scope > .${cls}`);
  if (has('hide-header')) return 'hidden';
  if (has('light-header')) return 'light';
  if (has('dark-header') || has('mg-header-white')) return 'dark';
  return '';
}

function querySection(root, selectors) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  for (const sel of list) {
    if (!sel) continue;
    const el = root.querySelector(sel);
    if (el) return el;
  }
  return null;
}

export default function transform(hookName, element, payload) {
  const sections = (payload && payload.template && payload.template.sections) || [];
  if (sections.length < 2) return;

  if (hookName === 'beforeTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const sectionEl = querySection(element, section.selector);
      if (!sectionEl) continue;
      const theme = headerTheme(sectionEl);
      if (i === 0 && !section.style && !theme) continue;

      const hr = document.createElement('hr');
      if (section.style || theme) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
      if (theme) hr.setAttribute(HEADER_THEME_ATTR, theme);
      sectionEl.before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
      const theme = marker ? marker.getAttribute(HEADER_THEME_ATTR) : '';
      if (!section.style && !theme) continue;

      const anchor = marker || querySection(element, section.selector);
      if (!anchor) continue;

      const cells = {};
      if (section.style) cells.style = section.style;
      if (theme) cells.header = theme;
      const metadataBlock = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells,
      });
      anchor.after(metadataBlock);

      if (marker) {
        marker.removeAttribute(SECTION_MARKER_ATTR);
        marker.removeAttribute(HEADER_THEME_ATTR);
        if (i === 0) marker.remove();
      }
    }
  }
}
