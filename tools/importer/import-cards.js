/* eslint-disable */
/* global WebImporter */

/**
 * Cards page (/jsw/cards), from the Pillars Figma frames (no source site: the fetched document
 * is ignored). One cards block, Pillars style, Pillar Horizontal layout: four cards, each
 * image | text (label, heading, description with its opening words in bold). Images are in
 * content/jsw/images/jsw/.
 */

const IMG = 'images/jsw';

const PILLARS = [
  ['pillar-engineering.jpg', 'Grey SUV rear quarter with a spare wheel on the tailgate', 'ENGINEERING',
    'BUILT TO MOVE BOLD IDEAS INTO SOMETHING REAL', 'We turn ambitious ideas',
    ' into meaningful mobility, bringing together precision, performance and craft to build what moves us forward.'],
  ['pillar-electrification.jpg', 'Mirrored towers rising from a desert dune under a blue sky', 'ELECTRIFICATION',
    'POWERING A NEW WAY TO PROGRESS FORWARD', 'believing the future demands',
    ' a different way forward, shaped by cleaner thinking, purposeful innovation and the courage to rethink mobility.'],
  ['pillar-progress.jpg', 'Tyre track pressed into fine grey sand', 'PROGRESS',
    'NEVER SETTLE FOR WHAT EXISTS WHEN MORE IS POSSIBLE', 'We believe progress comes from never standing,',
    ' questioning what exists and pushing ourselves to build what the future demands.'],
  ['pillar-india.jpg', 'Aerial view of a long bridge crossing dark green water', 'INDIA',
    'BUILT FOR INDIA DRIVEN AMBITION TO MOVE', 'We believe India is not just where we begin,',
    ' but a source of ideas, ambition and possibility can shape the future of mobility everywhere.'],
];

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

export default {
  transform: ({ document }) => {
    const cells = PILLARS.map(([file, alt, label, heading, bold, rest]) => {
      const img = document.createElement('img');
      img.src = `${IMG}/${file}`;
      img.alt = alt;
      return [
        hinted(document, 'image', [el(document, 'p', img)]),
        hinted(document, 'text', [
          el(document, 'p', label),
          el(document, 'h2', heading),
          el(document, 'p', el(document, 'strong', bold), rest),
        ]),
      ];
    });

    const main = document.createElement('div');
    main.append(WebImporter.Blocks.createBlock(document, { name: 'Cards (pillars, pillar-horizontal)', cells }));

    return [{ element: main, path: '/jsw/cards', report: { title: 'cards' } }];
  },
};
