/* eslint-disable */
/* global WebImporter */

/**
 * JSW NEV collage page (/jsw-nev-collage).
 * No source site: authored from the "NEV / Collage" and "NEV / Sustainable" frames, so the
 * fetched document is ignored. Two sections:
 *   1. jsw-navbar        brand link | links list | CTA link (fixed pill navigation)
 *   2. parallax-collage  heading + subtitle, then image | modifier rows
 * Side images were cropped from the design screenshots (content/images/jsw/).
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

function picture(document, file, alt) {
  const img = document.createElement('img');
  img.src = `${IMG}/${file}`;
  img.alt = alt;
  return el(document, 'p', img);
}

// [file, alt, modifier] in the order of the design: first screen, then second screen.
// The modifier sizes and places each card individually (blocks/parallax-collage).
const IMAGES = [
  ['engine-black.jpg', 'Electrified engine with carbon intake pipes', 'center-engine'],
  ['ev-charger.jpg', 'Wall-mounted EV charger plugged into a car', 'card-charger'],
  // re-saved under a new name: the first upload of bridge-road.jpg to AEM failed
  ['bridge-road-aerial.jpg', 'Aerial view of a road bridge over water', 'card-bridge'],
  ['test-hall.jpg', 'Empty vehicle test hall with ceiling lights', 'card-room'],
  ['suspension-spring.jpg', 'Close-up of a black suspension coil spring', 'card-spring'],
  ['phone-app.jpg', 'Phone app showing the car battery at 72%', 'card-phone'],
  ['jetour-sign.jpg', 'Illuminated JETOUR lettering on a dark wall', 'card-jetour'],
  ['floating-chassis.jpg', 'Car body-in-white suspended in a studio', 'card-chassis'],
  ['keynote-stage.jpg', 'Presenter on stage at a vehicle launch keynote', 'card-stage'],
];

export default {
  transform: ({ document }) => {
    const collage = WebImporter.Blocks.createBlock(document, {
      name: 'parallax-collage',
      cells: [
        [hinted(document, 'text', [
          el(document, 'h2', 'DRIVING INDIA INTO A MORE SUSTAINABLE FUTURE'),
          el(document, 'p', 'India is moving faster, travelling further and demanding more from mobility. New-energy vehicles can reduce dependence on fossil fuels while making cleaner technology practical for the realities of Indian roads, distances and infrastructure.'),
        ])],
        ...IMAGES.map(([file, alt, position]) => [
          hinted(document, 'image', [picture(document, file, alt)]),
          hinted(document, 'position', [position]),
        ]),
      ],
    });

    // fixed pill navigation (JSW MOTORS | NEV TECH, NEWSROOM | REGISTER INTEREST)
    const a = (href, text) => {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = text;
      return link;
    };
    const navbar = WebImporter.Blocks.createBlock(document, {
      name: 'jsw-navbar',
      cells: [
        [hinted(document, 'brand', [el(document, 'p', a('/jsw-phase-3', 'JSW MOTORS'))])],
        [hinted(document, 'links', [el(document, 'ul',
          el(document, 'li', a('/jsw-phase-3#nev-tech', 'NEV TECH')),
          el(document, 'li', a('/jsw-phase-3#newsroom', 'NEWSROOM')))])],
        [hinted(document, 'cta', [el(document, 'p', a('/jsw-phase-3#register-interest', 'REGISTER INTEREST'))])],
      ],
    });

    // the page is the navbar + the collage: it ends once the images have scrolled past
    const main = document.createElement('div');
    main.append(
      navbar,
      document.createElement('hr'),
      collage,
      WebImporter.Blocks.getMetadataBlock(document, {
        Title: 'JSW Motors | Driving India into a more sustainable future',
        Description: 'New-energy vehicles from JSW Motors: cleaner technology made practical for Indian roads, distances and infrastructure.',
      }),
    );

    return [{
      element: main,
      path: '/jsw-nev-collage',
      report: { title: 'jsw-nev-collage', images: IMAGES.length },
    }];
  },
};
