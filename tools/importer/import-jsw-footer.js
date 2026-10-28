/* eslint-disable */
/* global WebImporter */

/**
 * JSW footer page (/jsw-footer), from the "Desktop Footer" design frame (no source site: the
 * fetched document is ignored): one jsw-footer block, the footer of the JSW pages (scripts.js
 * loads this page as their footer, instead of the site's). Its seven cells: media | brand |
 * actions (grouped fields) | footer columns | social heading | social icons | starting content.
 * The footer columns and social icons are multi-fields, which md2jcr (the conversion to AEM
 * content) does not carry: their cells are left empty here, and the design's columns and icons
 * (COLUMNS, SOCIALS below) go into the starting content (grouped fields, hidden in the editor's
 * panel), which the footer shows until columns and icons are added to the lists in Universal
 * Editor. The background was cut from the design.
 */

const IMG = 'images/jsw';

function hinted(document, field, nodes) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${field} `));
  nodes.forEach((n) => frag.appendChild(typeof n === 'string' ? document.createTextNode(n) : n));
  return frag;
}

function el(document, tag, ...children) {
  const node = document.createElement(tag);
  children.forEach((c) => node.append(typeof c === 'string' ? document.createTextNode(c) : c));
  return node;
}

function group(document, fields) {
  const frag = document.createDocumentFragment();
  fields.forEach(([field, node]) => frag.appendChild(hinted(document, field, [node])));
  return frag;
}

function link(document, href, text) {
  const a = el(document, 'a', text);
  a.href = href;
  return el(document, 'p', a);
}

function image(document, src, alt) {
  const img = document.createElement('img');
  img.src = `${IMG}/${src}`;
  img.alt = alt;
  return el(document, 'p', img);
}

// the navigation columns and their links (the design's)
const COLUMNS = [
  ['TECHNOLOGY', [
    ['NEVs', '/jsw-phase-3#nev-tech'],
    ['Pillars', '/jsw-phase-3#pillars'],
    ['Benefits', '/jsw-phase-3#benefits'],
  ]],
  ['EXPLORE', [
    ['About', '/jsw-phase-3'],
    ['Newsroom', '/jsw-phase-3#newsroom'],
    ['Careers', '/jsw-phase-5'],
    ['Contact Us', '/jsw-phase-3#register-interest'],
  ]],
];

// the social icons, left to right
const SOCIALS = [
  ['social-facebook.svg', 'Facebook', 'https://www.facebook.com/'],
  ['social-instagram.svg', 'Instagram', 'https://www.instagram.com/'],
  ['social-x.svg', 'X', 'https://x.com/'],
  ['social-linkedin.svg', 'LinkedIn', 'https://www.linkedin.com/'],
];

export default {
  transform: ({ document }) => {
    const cells = [
      [group(document, [
        ['media_footerVariant', el(document, 'p', 'variant-phase-5')],
        ['media_backgroundMode', el(document, 'p', 'image')],
        ['media_backgroundImage', image(document, 'jsw-footer-bg.jpg', '')],
      ])],
      [group(document, [
        ['brand_logo', image(document, 'jsw-motors-wordmark.svg', 'JSW Motors')],
        ['brand_copyright', el(document, 'p', '© 2026 JSW Motors  Mumbai, India')],
      ])],
      [group(document, [
        ['actions_ctaButton', link(document, '/jsw-phase-3#register-interest', 'REGISTER INTEREST')],
        ['actions_privacyPolicy', link(document, '#privacy-policy', 'PRIVACY POLICY')],
      ])],
      // the footer columns and social icons: multi-fields, added in Universal Editor (md2jcr
      // does not carry them); the social heading
      [hinted(document, 'footerColumns', [])],
      [hinted(document, 'socialHeading', [el(document, 'p', 'CONNECT')])],
      [hinted(document, 'socialIcons', [])],
      // the starting content (fields hidden in the editor's panel): the design's columns and icons,
      // shown until the lists above hold items
      [group(document, [
        ...COLUMNS.flatMap(([heading, links], c) => [
          [`nav_column${c + 1}Heading`, el(document, 'p', heading)],
          ...links.map(([text, href], i) => [`nav_column${c + 1}Link${i + 1}`, link(document, href, text)]),
        ]),
        ...SOCIALS.flatMap(([file, name, href], i) => [
          [`nav_social${i + 1}Icon`, image(document, file, name)],
          [`nav_social${i + 1}Link`, link(document, href, href)],
        ]),
      ])],
    ];

    const main = document.createElement('div');
    main.append(WebImporter.Blocks.createBlock(document, { name: 'jsw-footer', cells }));
    return [{ element: main, path: '/jsw-footer', report: { title: 'jsw-footer' } }];
  },
};
