/* eslint-disable */
/* global WebImporter */

/**
 * JSW reservation page (/jsw-reserve), from the "Opt 2 / Reserve 1280x720" design frame
 * (no source site: the fetched document is ignored). One block, reservation-form, its four
 * field groups as rows: media | content | form | nav. Its button opens /jsw-confirmed.
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
        ['content_heading', el(document, 'p', 'RESERVE NOW')],
        ['content_subheading', el(document, 'p', 'Allocation opens December 2026. Cars are assigned in the order reservations are placed.')],
        ['content_disclaimer', el(document, 'p', 'JSW Motors processes this data only for the purpose above, under the DPDP Act, 2023. Consent is optional and you can withdraw it or request erasure anytime at privacy@jswmotors.com. Full Privacy Notice.')],
      ]),
      group(document, [
        ['form_cities', el(document, 'p', 'Mumbai, Delhi, Bengaluru, Hyderabad, Chennai, Pune, Kolkata, Ahmedabad')],
        ['form_button', link(document, '/jsw-confirmed', 'PROCEED')],
      ]),
      group(document, [
        ['nav_brand', el(document, 'p', 'JSW MOTORS')],
        ['nav_link1', link(document, '/jsw-phase-3#nev-tech', 'NEV TECH')],
        ['nav_link2', link(document, '/jsw-phase-3#newsroom', 'NEWSROOM')],
        ['nav_cta', link(document, '/jsw-reserve', 'REGISTER INTEREST')],
      ]),
    ];

    const main = document.createElement('div');
    main.append(WebImporter.Blocks.createBlock(document, { name: 'reservation-form', cells }));

    return [{ element: main, path: '/jsw-reserve', report: { title: 'jsw-reserve' } }];
  },
};
