/* eslint-disable */
/* global WebImporter */

/**
 * JSW reservation confirmation page (/jsw-confirmed), from the "Confirmed 1280x720" design
 * frame (no source site: the fetched document is ignored). One block,
 * reservation-confirmation, its three field groups as rows: media | content | nav.
 * {name} and {email} are filled in from the reservation form.
 */

const IMG = 'images/jsw';

function hinted(document, field, nodes) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${field} `));
  nodes.forEach((n) => frag.appendChild(n));
  return frag;
}

function el(document, tag, ...children) {
  const node = document.createElement(tag);
  children.forEach((c) => node.append(typeof c === 'string' ? document.createTextNode(c) : c));
  return node;
}

function picture(document, file, alt) {
  const img = document.createElement('img');
  img.src = `${IMG}/${file}`;
  img.alt = alt;
  return el(document, 'p', img);
}

function link(document, href, text) {
  const a = el(document, 'a', text);
  a.href = href;
  return el(document, 'p', a);
}

function group(document, fields) {
  const frag = document.createDocumentFragment();
  fields.forEach(([field, node]) => frag.appendChild(hinted(document, field, [node])));
  return [frag];
}

export default {
  transform: ({ document }) => {
    const cells = [
      group(document, [
        ['media_background', picture(document, 'reserve-landscape.jpg', 'Blue hills around a still lake')],
        ['media_foreground', picture(document, 'reserve-car.jpg', 'Silhouette of the JSW SUV against a dark backdrop')],
      ]),
      group(document, [
        ['content_heading', el(document, 'p', 'CONFIRMED')],
        ['content_subheading', el(document, 'p', 'YOU’RE IN, {name}.')],
        ['content_message', el(document, 'p', 'We’ll message you when allocation opens. Your receipt is on its way to {email}.')],
        ['content_fallbackName', el(document, 'p', 'THERE')],
      ]),
      group(document, [
        ['nav_brand', el(document, 'p', 'JSW MOTORS')],
        ['nav_link1', link(document, '/jsw-phase-3#nev-tech', 'NEV TECH')],
        ['nav_link2', link(document, '/jsw-phase-3#newsroom', 'NEWSROOM')],
        ['nav_cta', link(document, '/jsw-reserve', 'REGISTER INTEREST')],
      ]),
    ];

    const main = document.createElement('div');
    main.append(WebImporter.Blocks.createBlock(document, { name: 'reservation-confirmation', cells }));

    return [{ element: main, path: '/jsw-confirmed', report: { title: 'jsw-confirmed' } }];
  },
};
