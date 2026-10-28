/* eslint-disable */
/* global WebImporter */

/**
 * JSW footer page (/jsw-footer), from the "Desktop Footer" design frame (no source site: the
 * fetched document is ignored): the footer of the JSW pages (scripts.js loads this page as their
 * footer, instead of the site's), one section holding:
 *   - a jsw-footer block: its fields, grouped in three cells (media | brand | actions);
 *   - a jsw-footer-column block for each navigation column: its heading, then its Footer Links;
 *   - a jsw-footer-social block: its heading (CONNECT), then its Social Icons.
 * Each column and the social block hold their own items (one item type each, so md2jcr, the
 * conversion to AEM content, needs no type cell). The background was cut from the design.
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
    ];

    // the columns: each its heading, then its links
    const columns = COLUMNS.map(([heading, links]) => WebImporter.Blocks.createBlock(document, {
      name: 'jsw-footer-column',
      cells: [
        [hinted(document, 'columnHeading', [el(document, 'p', heading)])],
        ...links.map(([text, href]) => [hinted(document, 'link', [link(document, href, text)])]),
      ],
    }));

    // the social links: their heading, then the icons
    const social = WebImporter.Blocks.createBlock(document, {
      name: 'jsw-footer-social',
      cells: [
        [hinted(document, 'connectHeading', [el(document, 'p', 'CONNECT')])],
        ...SOCIALS.map(([file, name, href]) => [
          hinted(document, 'iconImage', [image(document, file, name)]),
          hinted(document, 'iconLink', [link(document, href, href)]),
        ]),
      ],
    });

    // one section: the footer
    const main = document.createElement('div');
    main.append(WebImporter.Blocks.createBlock(document, { name: 'jsw-footer', cells }), ...columns, social);
    return [{ element: main, path: '/jsw-footer', report: { title: 'jsw-footer' } }];
  },
};
