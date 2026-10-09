/* eslint-disable */
/* global WebImporter */

/**
 * JSW Motors NEV Experience page (/jsw-phase-3).
 * There is no source site: the page is authored from the design frames
 * (NEV / Hero, Tech 1-3, Collage, Blog, Footer), so the fetched document is ignored and
 * the content is built here. Images are the design photos in content/images/jsw/;
 * art that was not supplied (charger, bridge, spring, phone app) uses the closest photo
 * as a placeholder with an alt text describing what is actually shown.
 *
 * Sections, in order (one block each):
 *   1. jsw-hero           image | nav | text
 *   2. jsw-tech-showcase  heading, then one item per powertrain: media (thumbnail + image) | text | hotspots
 *   3. jsw-collage        text, then six image items
 *   4. jsw-blogs          background | heading, then one item per post
 *   5. jsw-footer         brand | cta | connect | explore
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
  children.filter(Boolean).forEach((c) => node.append(typeof c === 'string' ? document.createTextNode(c) : c));
  return node;
}

function img(document, file, alt) {
  const node = document.createElement('img');
  node.src = `${IMG}/${file}`;
  node.alt = alt;
  return node;
}

function link(document, href, label) {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = label;
  return a;
}

function list(document, items) {
  return el(document, 'ul', ...items.map(([href, label]) => el(document, 'li', link(document, href, label))));
}

function hero(document) {
  const p = (...c) => el(document, 'p', ...c);
  return WebImporter.Blocks.createBlock(document, {
    name: 'jsw-hero',
    cells: [
      [hinted(document, 'image', [p(img(document, 'chassis.jpg', 'Electric vehicle platform lit from above'))])],
      [hinted(document, 'nav', [
        p('JSW MOTORS'),
        list(document, [['#nev-tech', 'NEV TECH'], ['#newsroom', 'NEWSROOM']]),
        p(link(document, '#register-interest', 'REGISTER INTEREST')),
      ])],
      [hinted(document, 'text', [
        el(document, 'h1', 'NEW ENERGY FOR YOU BUILT FOR BEYOND'),
        p('The everyday drive costs you almost nothing. The long one costs you no planning. That’s what new energy means, built for India.'),
        p(link(document, '#nev-tech', 'DISCOVER NEW ENERGY')),
      ])],
    ],
  });
}

const POWERTRAINS = [
  {
    thumb: ['motor-red.jpg', 'Glowing red electric motor rotor'],
    image: ['chassis.jpg', 'Plug-in hybrid chassis with motor, battery and suspension'],
    title: 'Plug-in Hybrid Electric Vehicle',
    text: 'Drives on electric power for everyday journeys, with a petrol engine for added range and reassurance. On the highway engine and motor work the same axle.',
    hotspots: [
      '42, 30 | INTELLIGENT SWITCHING | Automatically alternates between pure electric and hybrid modes based on speed and terrain to optimize fuel efficiency.',
      '68, 55 | BATTERY PACK | A floor-mounted pack keeps the centre of gravity low and charges at home or on the go.',
      '30, 86 | EFFICIENT DRIVE UNIT | Motor, inverter and gearbox in one compact housing on the front axle.',
    ],
  },
  {
    thumb: ['motor-green.jpg', 'Electric drive unit under green light'],
    image: ['engine-rotax.jpg', 'Compact powertrain on a display stand'],
    title: 'Battery Electric Vehicle',
    text: 'Runs on electricity alone, from a battery charged at home, at work or on the highway. Instant torque, zero tailpipe emissions and almost no running cost.',
    hotspots: [
      '56, 26 | POWER ELECTRONICS | Converts battery power for the motor and recovers energy every time you brake.',
      '36, 52 | THERMAL MANAGEMENT | Keeps cells at their best temperature in Indian summers for consistent range and fast charging.',
      '62, 84 | DC FAST CHARGING | Adds range in the time of a coffee stop on highway charging networks.',
    ],
  },
  {
    thumb: ['engine-blue.jpg', 'Hybrid engine and motor under blue light'],
    image: ['engine-black.jpg', 'Range-extender engine with carbon intake pipes'],
    title: 'Extended-Range Electric Vehicle',
    text: 'The wheels are always driven electrically, while a small onboard generator tops up the battery on long journeys. Electric feel, no range anxiety.',
    hotspots: [
      '30, 22 | ONBOARD GENERATOR | A compact engine runs only to charge the battery, at its most efficient speed.',
      '74, 58 | ELECTRIC DRIVE | Every kilometre is driven by the electric motor for smooth, quiet acceleration.',
      '44, 74 | ENERGY CONTROL | Decides when to generate, store or regenerate power, based on route and charge level.',
    ],
  },
];

function techShowcase(document) {
  const cells = [[hinted(document, 'heading', [el(document, 'h2', 'A NEW WAY TO MOVE POWERED BY TECH')])]];
  POWERTRAINS.forEach((item) => {
    const media = document.createDocumentFragment();
    media.append(
      hinted(document, 'media_thumbnail', [el(document, 'p', img(document, ...item.thumb))]),
      hinted(document, 'media_image', [el(document, 'p', img(document, ...item.image))]),
    );
    cells.push([
      media,
      hinted(document, 'text', [el(document, 'h3', item.title), el(document, 'p', item.text)]),
      hinted(document, 'hotspots', [el(document, 'ul', ...item.hotspots.map((h) => el(document, 'li', h)))]),
    ]);
  });
  return WebImporter.Blocks.createBlock(document, { name: 'jsw-tech-showcase', cells });
}

const COLLAGE = [
  ['engine-blue.jpg', 'Hybrid engine and motor under blue light'],
  ['motor-green.jpg', 'Electric drive unit under green light'],
  ['test-hall.jpg', 'Empty vehicle test hall with ceiling lights'],
  ['motor-red.jpg', 'Glowing red electric motor rotor'],
  ['chassis.jpg', 'Electric vehicle chassis seen from above'],
  ['keynote-stage.jpg', 'Presenter on stage at a vehicle launch keynote'],
];

function collage(document) {
  const cells = [[hinted(document, 'text', [
    el(document, 'h2', 'DRIVING INDIA INTO A MORE SUSTAINABLE FUTURE'),
    el(document, 'p', 'India is moving faster, travelling further and demanding more from mobility. New-energy vehicles can reduce dependence on fossil fuels while making cleaner technology practical for the realities of Indian roads, distances and infrastructure.'),
  ])]];
  COLLAGE.forEach(([file, alt]) => cells.push([hinted(document, 'image', [el(document, 'p', img(document, file, alt))])]));
  return WebImporter.Blocks.createBlock(document, { name: 'jsw-collage', cells });
}

const POSTS = [
  {
    category: 'LEARN MORE / NEV & PHEV',
    title: 'TESTED HERE, BEFORE IT REACHES YOU.',
    text: 'Every powertrain is proven on Indian roads first: monsoon flooding, mountain passes, city crawl and long highway runs. We share what we learn from thousands of test kilometres, so you know how a new-energy vehicle behaves where you actually drive.',
  },
  {
    category: 'CHARGING IN INDIA',
    title: 'BUILT FOR THE NATION AS IT IS TODAY.',
    text: 'Forget ideal laboratory range and perfect charging scenarios. We break down actual battery performance in heavy traffic, fast-charging availability across major highways, and true power consumption so you know exactly what daily NEV ownership looks like in India.',
  },
  {
    category: 'OWNERSHIP / RUNNING COSTS',
    title: 'WHAT A KILOMETRE REALLY COSTS.',
    text: 'Electricity at home, fast charging on the road, servicing and tyres: we add up the real cost of running a plug-in hybrid and a battery electric vehicle against petrol, month by month.',
  },
];

function blogs(document) {
  const cells = [
    [hinted(document, 'background', [el(document, 'p', img(document, 'engine-rotax.jpg', 'Powertrain on a display stand, out of focus'))])],
    [hinted(document, 'heading', [el(document, 'p', 'OUR BLOGS')])],
  ];
  POSTS.forEach((post) => cells.push([hinted(document, 'text', [
    el(document, 'p', post.category),
    el(document, 'h3', post.title),
    el(document, 'p', post.text),
    el(document, 'p', link(document, '#newsroom', 'READ MORE')),
  ])]));
  return WebImporter.Blocks.createBlock(document, { name: 'jsw-blogs', cells });
}

function footer(document) {
  const p = (...c) => el(document, 'p', ...c);
  return WebImporter.Blocks.createBlock(document, {
    name: 'jsw-footer',
    cells: [
      [hinted(document, 'brand', [
        p('JSW MOTORS'),
        p('© 2026 JSW Motors'),
        p('Mumbai, India'),
        p(link(document, '#privacy-policy', 'PRIVACY POLICY')),
      ])],
      [hinted(document, 'cta', [p(link(document, '#register-interest', 'REGISTER INTEREST'))])],
      [hinted(document, 'connect', [
        p('CONNECT'),
        list(document, [
          ['https://www.instagram.com/', 'Instagram'],
          ['https://x.com/', 'X'],
          ['https://www.linkedin.com/', 'LinkedIn'],
          ['https://www.youtube.com/', 'YouTube'],
        ]),
      ])],
      [hinted(document, 'explore', [
        p('EXPLORE'),
        list(document, [
          ['/jsw-phase-3', 'Home'],
          ['#newsroom', 'Newsroom'],
          ['#nev-tech', 'NEV'],
          ['#register-interest', 'Contact Us'],
        ]),
      ])],
    ],
  });
}

export default {
  transform: ({ document }) => {
    const main = document.createElement('div');
    const blocks = [hero, techShowcase, collage, blogs, footer].map((build) => build(document));
    blocks.forEach((block, i) => {
      if (i) main.append(document.createElement('hr'));
      main.append(block);
    });
    main.append(WebImporter.Blocks.getMetadataBlock(document, {
      Title: 'JSW Motors | New Energy Vehicles Built for India',
      Description: 'Discover JSW Motors new-energy vehicles: plug-in hybrid, battery electric and extended-range powertrains engineered and tested for Indian roads.',
    }));

    return [{
      element: main,
      path: '/jsw-phase-3',
      report: { title: 'jsw-phase-3', blocks: blocks.length },
    }];
  },
};
