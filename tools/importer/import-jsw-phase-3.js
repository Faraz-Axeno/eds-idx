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
 *   1. immersive-hero    image | navigation (logo text, links, button) | headline | description + button
 *   2. hotspot-showcase  heading, then one item per powertrain: media (thumbnail + image) | title | description | hotspots
 *   3. parallax-collage  text, then image | position rows (same as /jsw-nev-collage)
 *   4. blog-carousel     background | heading, then one item per post: image | category | title | summary + link
 *   5. brand-footer      brand | cta | connect | explore
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
  // grouped cells: the navigation (logo text, links, button) and the description + button;
  // the links' text collapses into nav_ctaText / body_ctaText
  const group = (...parts) => {
    const cell = document.createDocumentFragment();
    cell.append(...parts);
    return cell;
  };
  return WebImporter.Blocks.createBlock(document, {
    name: 'immersive-hero',
    cells: [
      [hinted(document, 'image', [p(img(document, 'chassis.jpg', 'Electric vehicle platform lit from above'))])],
      [group(
        hinted(document, 'nav_brand', ['JSW MOTORS']),
        hinted(document, 'nav_links', [list(document, [['#nev-tech', 'NEV TECH'], ['#newsroom', 'NEWSROOM']])]),
        hinted(document, 'nav_cta', [p(link(document, '#register-interest', 'REGISTER INTEREST'))]),
      )],
      [hinted(document, 'title', ['NEW ENERGY FOR YOU BUILT FOR BEYOND'])],
      [group(
        hinted(document, 'body_description', [p('The everyday drive costs you almost nothing. The long one costs you no planning. That’s what new energy means, built for India.')]),
        hinted(document, 'body_cta', [p(link(document, '#nev-tech', 'DISCOVER NEW ENERGY'))]),
      )],
    ],
  });
}

// showcase images: the photos cut out of their black backgrounds (transparent PNGs, cropped
// to the artwork; the Rotax engine mirrored as in "NEV / Tech 2"); hotspot positions are
// percentages of those images from their bottom-left corner (x right, y up), measured on the
// "NEV / Tech 1-3" frames; at most 4 per powertrain
const POWERTRAINS = [
  {
    thumb: ['motor-red.jpg', 'Glowing red electric motor rotor'],
    image: ['chassis-cutout.png', 'Plug-in hybrid chassis with motor, battery and suspension'],
    title: 'Plug-in Hybrid Electric Vehicle',
    text: 'Drives on electric power for everyday journeys, with a petrol engine for added range and reassurance. On the highway engine and motor work the same axle.',
    hotspots: [
      '41, 75.5 | INTELLIGENT SWITCHING | Automatically alternates between pure electric and hybrid modes based on speed and terrain to optimize fuel efficiency.',
      '82.5, 45.5 | BATTERY PACK | A floor-mounted pack keeps the centre of gravity low and charges at home or on the go.',
      '29.5, 9 | EFFICIENT DRIVE UNIT | Motor, inverter and gearbox in one compact housing on the front axle.',
    ],
  },
  {
    thumb: ['motor-green.jpg', 'Electric drive unit under green light'],
    image: ['engine-rotax-cutout.png', 'Compact powertrain on a display stand'],
    title: 'Battery Electric Vehicle',
    text: 'Runs on electricity alone, from a battery charged at home, at work or on the highway. Instant torque, zero tailpipe emissions and almost no running cost.',
    hotspots: [
      '40.5, 91 | POWER ELECTRONICS | Converts battery power for the motor and recovers energy every time you brake.',
      '23, 60 | THERMAL MANAGEMENT | Keeps cells at their best temperature in Indian summers for consistent range and fast charging.',
      '47, 26 | DC FAST CHARGING | Adds range in the time of a coffee stop on highway charging networks.',
    ],
  },
  {
    thumb: ['engine-blue.jpg', 'Hybrid engine and motor under blue light'],
    image: ['engine-black-cutout.png', 'Range-extender engine with carbon intake pipes'],
    title: 'Extended-Range Electric Vehicle',
    text: 'The wheels are always driven electrically, while a small onboard generator tops up the battery on long journeys. Electric feel, no range anxiety.',
    hotspots: [
      '35.5, 87 | ONBOARD GENERATOR | A compact engine runs only to charge the battery, at its most efficient speed.',
      '73.5, 31 | ELECTRIC DRIVE | Every kilometre is driven by the electric motor for smooth, quiet acceleration.',
      '20, 27 | ENERGY CONTROL | Decides when to generate, store or regenerate power, based on route and charge level.',
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
      hinted(document, 'title', [item.title]),
      hinted(document, 'description', [item.text]),
      hinted(document, 'hotspots', [el(document, 'ul', ...item.hotspots.map((h) => el(document, 'li', h)))]),
    ]);
  });
  return WebImporter.Blocks.createBlock(document, { name: 'hotspot-showcase', cells });
}

// section 3: the same parallax-collage as /jsw-nev-collage ("NEV / Collage" + "NEV / Sustainable"):
// [file, alt, place] in the order of the design: first screen, then second screen
const COLLAGE = [
  ['engine-black.jpg', 'Electrified engine with carbon intake pipes', 'center-engine'],
  ['ev-charger.jpg', 'Wall-mounted EV charger plugged into a car', 'card-charger'],
  ['bridge-road-aerial.jpg', 'Aerial view of a road bridge over water', 'card-bridge'],
  ['test-hall.jpg', 'Empty vehicle test hall with ceiling lights', 'card-room'],
  ['suspension-spring.jpg', 'Close-up of a black suspension coil spring', 'card-spring'],
  ['phone-app.jpg', 'Phone app showing the car battery at 72%', 'card-phone'],
  ['jetour-sign.jpg', 'Illuminated JETOUR lettering on a dark wall', 'card-jetour'],
  ['floating-chassis.jpg', 'Car body-in-white suspended in a studio', 'card-chassis'],
  ['keynote-stage.jpg', 'Presenter on stage at a vehicle launch keynote', 'card-stage'],
];

function collage(document) {
  const cells = [[hinted(document, 'text', [
    el(document, 'h2', 'DRIVING INDIA INTO A MORE SUSTAINABLE FUTURE'),
    el(document, 'p', 'India is moving faster, travelling further and demanding more from mobility. New-energy vehicles can reduce dependence on fossil fuels while making cleaner technology practical for the realities of Indian roads, distances and infrastructure.'),
  ])]];
  COLLAGE.forEach(([file, alt, place]) => cells.push([
    hinted(document, 'image', [el(document, 'p', img(document, file, alt))]),
    hinted(document, 'position', [place]),
  ]));
  return WebImporter.Blocks.createBlock(document, { name: 'parallax-collage', cells });
}

// the three posts of the "NEV / Blog" prototype, in its order (same category and summary)
const POST_TEXT = 'Forget ideal laboratory range and perfect charging scenarios. We break down actual battery performance in heavy traffic, fast-charging availability across major highways, and true power consumption so you know exactly what daily NEV ownership looks like in India.';
// image: the post's own background (the prototype's blurred backgrounds); the first post has
// none and shows the block's background photo
const POSTS = [
  { category: 'LEARN MORE / NEV & PHEV', title: 'TESTED HERE, BEFORE IT REACHES YOU.', text: POST_TEXT },
  {
    category: 'LEARN MORE / NEV & PHEV', title: 'UNDERSTANDING WHAT\'S UNDER THE HOOD.', text: POST_TEXT,
    image: ['blog-under-the-hood.jpg', 'Warm-toned stage lights, out of focus'],
  },
  {
    category: 'LEARN MORE / NEV & PHEV', title: 'BUILT FOR THE NATION AS IT IS TODAY.', text: POST_TEXT,
    image: ['blog-built-for-the-nation.jpg', 'Dark blue stage lights, out of focus'],
  },
];

function blogs(document) {
  const cells = [
    // the "NEV / Blog" frame's own blurred photo (taken from the design, card area filled in)
    [hinted(document, 'background', [el(document, 'p', img(document, 'blogs-background.jpg', 'Vehicle on a lit stage, out of focus'))])],
    [hinted(document, 'heading', [el(document, 'p', 'OUR BLOGS')])],
  ];
  // one row per post: its own background (empty cell when it has none) | category | title |
  // body: the summary and the link grouped in one cell (the link's text collapses into
  // body_linkText)
  POSTS.forEach((post) => {
    const body = document.createDocumentFragment();
    body.append(
      hinted(document, 'body_summary', [el(document, 'p', post.text)]),
      hinted(document, 'body_link', [el(document, 'p', link(document, '#newsroom', 'READ MORE'))]),
    );
    cells.push([
      post.image ? hinted(document, 'image', [el(document, 'p', img(document, ...post.image))]) : '',
      hinted(document, 'category', [post.category]),
      hinted(document, 'title', [post.title]),
      body,
    ]);
  });
  return WebImporter.Blocks.createBlock(document, { name: 'blog-carousel', cells });
}

function footer(document) {
  const p = (...c) => el(document, 'p', ...c);
  return WebImporter.Blocks.createBlock(document, {
    name: 'brand-footer',
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
