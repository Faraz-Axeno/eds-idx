/* eslint-disable */
/* global WebImporter */

/**
 * JSW navigation page (/jsw-nav), with the navigation of the JSW pages as authored on
 * /jsw-phase-3 (no source site: the fetched document is ignored): one jsw-nav block, read by the
 * JSW pages that bring the pill navigation (scripts/jsw-pill-nav.js, loadJswNav). Its fields
 * (logo text | logo link | button link + text), then its Nav Links; every Nav Link row starts
 * with its item type (jsw-nav-link) so md2jcr (the conversion to AEM content) creates it as that
 * item; the code reads and drops it. The links to sections of /jsw-phase-3 are written in full
 * (/jsw-phase-3#nev-tech): on the other pages they open them there.
 */

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

function link(document, href, text) {
  const a = el(document, 'a', text);
  a.href = href;
  return el(document, 'p', a);
}

// the navigation's links, left to right (as on /jsw-phase-3)
const LINKS = [
  ['NEV TECH', '/jsw-phase-3#nev-tech'],
  ['NEWSROOM', '/jsw-phase-3#newsroom'],
];

export default {
  transform: ({ document }) => {
    const cells = [
      [hinted(document, 'brand', [el(document, 'p', 'JSW MOTORS')])],
      [hinted(document, 'homeLink', [link(document, '/jsw-phase-3', '/jsw-phase-3')])],
      [hinted(document, 'cta', [link(document, '/jsw-phase-3#register-interest', 'REGISTER INTEREST')])],
      ...LINKS.map(([text, href]) => [
        document.createTextNode('jsw-nav-link'),
        hinted(document, 'link', [link(document, href, text)]),
      ]),
    ];
    const main = document.createElement('div');
    main.append(WebImporter.Blocks.createBlock(document, { name: 'jsw-nav', cells }));
    return [{ element: main, path: '/jsw-nav', report: { title: 'jsw-nav' } }];
  },
};
