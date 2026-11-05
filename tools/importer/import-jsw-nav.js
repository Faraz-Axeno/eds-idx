/* eslint-disable */
/* global WebImporter */

/**
 * JSW navigation page (/jsw-nav), with the navigation of the JSW pages as authored on
 * /jsw-phase-3 (no source site: the fetched document is ignored): one jsw-nav block, read by the
 * JSW pages that bring the pill navigation (blocks/jsw-nav/pill-nav.js, loadPillNav). Its fields
 * (logo text | logo link | button link + text | Link 1-4: up to four links, each its target with
 * its text, in one group cell; the ones not used left out). The links to sections of
 * /jsw-phase-3 are written in full (/jsw-phase-3#nev-tech): on the other pages they open them
 * there.
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
      // Link 1-4, in one cell: each link with its text (links_linkN + links_linkNText)
      [LINKS.slice(0, 4).map(([text, href], i) => hinted(document, `links_link${i + 1}`, [link(document, href, text)]))],
    ];
    const main = document.createElement('div');
    main.append(WebImporter.Blocks.createBlock(document, { name: 'jsw-nav', cells }));
    return [{ element: main, path: '/jsw-nav', report: { title: 'jsw-nav' } }];
  },
};
