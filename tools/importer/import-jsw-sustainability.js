/* eslint-disable */
/* global WebImporter */

/**
 * JSW Sustainability collage page (/jsw-sustainability).
 * No source site: the page is authored from the "NEV / Collage" and "NEV / Sustainable"
 * design frames, so the fetched document is ignored. One section, one block:
 *   jsw-sustainability  engine | text, then one item per card (top-left, top-right,
 *                       middle-left, middle-right, bottom-left, bottom-right)
 * Images are the session photos in content/images/jsw/. The phone-app and Jetour-sign
 * art was not supplied, so those slots use the closest photo with an honest alt text.
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

const CARDS = [
  ['engine-blue.jpg', 'Hybrid engine and electric motor under blue light'],
  ['motor-green.jpg', 'Electric drive unit under green light'],
  ['chassis.jpg', 'Electric vehicle chassis seen from above'],
  ['keynote-stage.jpg', 'Presenter on stage at a vehicle launch keynote'],
  ['test-hall.jpg', 'Empty vehicle test hall with ceiling lights'],
  ['motor-red.jpg', 'Glowing red electric motor rotor'],
];

export default {
  transform: ({ document }) => {
    const cells = [
      [hinted(document, 'engine', [picture(document, 'engine-black.jpg', 'Electrified engine with carbon intake pipes')])],
      [hinted(document, 'text', [
        el(document, 'h2', 'DRIVING INDIA INTO A MORE SUSTAINABLE FUTURE'),
        el(document, 'p', 'India is moving faster, travelling further and demanding more from mobility. New-energy vehicles can reduce dependence on fossil fuels while making cleaner technology practical for the realities of Indian roads, distances and infrastructure.'),
      ])],
      ...CARDS.map(([file, alt]) => [hinted(document, 'image', [picture(document, file, alt)])]),
    ];

    const main = document.createElement('div');
    main.append(
      WebImporter.Blocks.createBlock(document, { name: 'jsw-sustainability', cells }),
      WebImporter.Blocks.getMetadataBlock(document, {
        Title: 'JSW Motors | Driving India into a more sustainable future',
        Description: 'How new-energy vehicles from JSW Motors reduce dependence on fossil fuels while making cleaner technology practical for Indian roads.',
      }),
    );

    return [{
      element: main,
      path: '/jsw-sustainability',
      report: { title: 'jsw-sustainability', cards: CARDS.length },
    }];
  },
};
