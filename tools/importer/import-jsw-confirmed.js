/* eslint-disable */
/* global WebImporter */

/**
 * JSW reservation confirmation page (/jsw-confirmed), from the "Confirmed 1280x720" design
 * frame (no source site: the fetched document is ignored). One block,
 * reservation-confirmation, as rows: layoutVariant | media | content; the JSW Navbar
 * block before it.
 * {NAME} and {email} are filled in by the block.
 * A URL with "split" makes /jsw-confirmed-split, the split layout ("Confirmed opt3"); one with
 * "failed" makes /jsw-payment-failed, the payment failure page (the centered layout for now).
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

function navbar(document) {
  const list = el(document, 'ul');
  [['/jsw-phase-3#nev-tech', 'NEV TECH'], ['/jsw-phase-3#newsroom', 'NEWSROOM']].forEach(([href, text]) => {
    const a = el(document, 'a', text);
    a.href = href;
    list.append(el(document, 'li', a));
  });
  return WebImporter.Blocks.createBlock(document, {
    name: 'jsw-navbar',
    cells: [
      [hinted(document, 'brand', [link(document, '/jsw-phase-3', 'JSW MOTORS')])],
      [hinted(document, 'links', [list])],
      [hinted(document, 'cta', [link(document, '/jsw-reserve', 'REGISTER INTEREST')])],
    ],
  });
}

export default {
  transform: ({ document, url }) => {
    const split = /split/.test(url || '');
    const failed = /failed/.test(url || '');
    const cells = [
      [hinted(document, 'layoutVariant', [document.createTextNode(split ? 'layout-split' : 'layout-centered')])],
      group(document, [
        ['media_background', picture(document, 'reserve-landscape.jpg', 'Blue hills around a still lake')],
        ['media_foreground', picture(document, 'reserve-car.jpg', 'Silhouette of the JSW SUV against a dark backdrop')],
      ]),
      group(document, [
        ['content_heading', el(document, 'p', failed ? 'FAILED' : 'CONFIRMED')],
        ['content_subheading', el(document, 'p', failed ? 'SORRY, {NAME}.' : (split ? 'YOU’RE ALL SET, {NAME}.' : 'YOU’RE IN, {NAME}.'))],
        ['content_message', el(document, 'p', (failed
          && 'Your payment didn’t go through and no money was taken. Please try again from the reservation page.')
          || (split
            ? 'We’ll message you when allocation opens in December. Your receipt is on its way to {email}.'
            : 'We’ll message you when allocation opens. Your receipt is on its way to {email}.'))],
      ]),
    ];

    const main = document.createElement('div');
    main.append(WebImporter.Blocks.createBlock(document, { name: 'reservation-confirmation', cells }));

    const path = (failed && '/jsw-payment-failed') || (split && '/jsw-confirmed-split') || '/jsw-confirmed';
    return [{ element: main, path, report: { title: 'jsw-confirmed', split, failed } }];
  },
};
