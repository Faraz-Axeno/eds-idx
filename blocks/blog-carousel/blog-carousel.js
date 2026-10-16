/*
 * blog-carousel: dark panel with a blurred background and a frosted-glass card showing one post
 * at a time, ‹ OUR BLOGS › in its header row ("NEV / Blog").
 * Rows: background picture, card heading, then one row per post:
 *   its own background picture (optional) | category | title | summary + READ MORE link
 *   (older content: background | one cell with the category paragraph, title (h3), summary
 *   and link).
 * On every screen size the card rises out of the section: its top already peeks in at the bottom
 * of the previous section's last screen ("NEV / Sustainable"), then it settles as the
 * section scrolls up. The section starts white and fades to its dark background as it does.
 * Each post has its own background (authored, else the prototype's, see TONES); ‹ › slide
 * the new one in from behind the arrow while the card's text changes, and the fixed
 * navigation takes on the post's colour (section data-jsw-nav-tone, read by immersive-hero).
 */

let instance = 0;
// how much of the card's top peeks into the previous section: its ‹ OUR BLOGS › header row;
// less where that section's last screen leaves less room below its images (phones), so the
// card always keeps this gap under them
const PEEK = 84;
const PEEK_GAP = 20;
// the section arrives white ("NEV / Blog" prototype): once it fills the screen and the card
// has settled, it stays white this long, then fades to its dark background (0.8s,
// blog-carousel.css); it turns white again when scrolled away
const LIT_DELAY = 1000;
// per post, in order (then repeating), from the "NEV / Blog" prototype: its background where
// the post has none authored (the block's photo for the first post; the next two are the
// prototype's own blurred backgrounds, rebuilt from it) and the navigation pill's colour
const TONES = [
  { image: '', nav: '' }, // the authored photo, the default dark pill
  { image: new URL('./blog-under-the-hood.jpg', import.meta.url).href, nav: 'rgb(112 92 82 / 78%)' },
  { image: new URL('./blog-built-for-the-nation.jpg', import.meta.url).href, nav: 'rgb(18 24 34 / 78%)' },
];

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

// Universal Editor model of one post (block/item); published rows carry no model, so there a
// post is a row with an image cell and a text cell, or (older content) one with a title
const POST_MODEL = 'blog-carousel-item';

/**
 * a display copy of an authored part, without the editor's instrumentation (and ids): in
 * Universal Editor a post's background stays in its own row, hidden, so the content tree lists
 * it under that post, while the slides show a copy
 */
function displayCopy(part) {
  const copy = part.cloneNode(true);
  [copy, ...copy.querySelectorAll('*')].forEach((node) => {
    [...node.attributes].filter(({ name }) => /^data-(aue|richtext)-/.test(name) || name === 'id')
      .forEach(({ name }) => node.removeAttribute(name));
  });
  return copy;
}

/**
 * the post's own background picture (its first cell), if any; published, the cell leaves the
 * row, in the editor it stays there hidden and a copy is returned
 */
function takePostPicture(row, editing) {
  if (row.children.length < 2) return null;
  const imageCell = row.firstElementChild;
  let picture = imageCell.querySelector('picture');
  if (editing) {
    imageCell.hidden = true;
    picture = picture && displayCopy(picture);
  } else imageCell.remove();
  picture?.querySelector('img')?.setAttribute('alt', '');
  return picture;
}

/**
 * a post's text from its Category, Title and body (Summary + Link, grouped in one cell)
 * fields, in the order and markup the card styles (category line, h3, summary paragraphs,
 * link paragraph): the body's own nodes when published, copies in the editor (where the
 * fields stay)
 */
function postTextFrom([categoryCell, titleCell, bodyCell], editing) {
  const text = el('div');
  const line = (tag, value) => {
    if (!value) return;
    const node = el(tag);
    node.textContent = value;
    text.append(node);
  };
  line('p', categoryCell?.textContent.trim());
  line('h3', titleCell?.textContent.trim());
  const body = bodyCell && (editing ? displayCopy(bodyCell) : bodyCell);
  [...(body?.childNodes || [])].forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) line('p', node.textContent.trim());
    else if (node.nodeName === 'A') {
      // the link on its own, as the READ MORE paragraph
      const p = el('p');
      p.append(node);
      text.append(p);
    } else if (node.nodeType === Node.ELEMENT_NODE) text.append(node);
  });
  return text;
}

/**
 * a post with separate fields (category | title | summary + link, after its background) gets
 * them as one text block; older content has them in a single cell already
 */
function joinPostText(row, editing) {
  const cells = [...row.children].filter((c) => !c.hidden);
  if (cells.length < 3) return;
  const text = postTextFrom(cells, editing);
  cells.forEach((cell) => {
    if (editing) cell.hidden = true;
    else cell.remove();
  });
  row.append(text);
}

function decoratePost(row, index, total) {
  row.className = 'blog-carousel-post';
  row.setAttribute('role', 'group');
  row.setAttribute('aria-roledescription', 'slide');
  row.setAttribute('aria-label', `${index + 1} of ${total}`);
  // its text cell (in the editor its own background cell stays before it, hidden)
  const cell = [...row.children].find((c) => !c.hidden) || row;
  cell.classList.add('blog-carousel-post-inner');
  const heading = cell.querySelector('h2, h3, h4');
  heading?.classList.add('blog-carousel-title');
  const children = [...cell.children];
  const headingAt = heading ? children.indexOf(heading) : -1;
  const paragraphs = [...cell.querySelectorAll(':scope > p')];
  const isLinkOnly = (p) => {
    const a = p.querySelector('a');
    return a && p.textContent.trim() === a.textContent.trim();
  };
  // the last link-only paragraph (written out: older Safari and Samsung lack findLast)
  const linkP = [...paragraphs].reverse().find(isLinkOnly);
  paragraphs.forEach((p) => {
    if (p === linkP) return;
    // paragraphs above the title are the category line, below it the summary
    p.classList.add(children.indexOf(p) < headingAt ? 'blog-carousel-category' : 'blog-carousel-summary');
  });
  if (linkP) {
    linkP.className = 'blog-carousel-action';
    const a = linkP.querySelector('a');
    a.className = 'blog-carousel-read';
    const label = el('span', 'blog-carousel-read-label');
    label.textContent = a.textContent.trim();
    const icon = el('span', 'blog-carousel-read-icon', { 'aria-hidden': 'true' });
    a.replaceChildren(label, icon);
    if (heading) a.setAttribute('aria-label', `${label.textContent}: ${heading.textContent.trim()}`);
  }
}

/**
 * one background slide per post: the post's own authored background, else the prototype's
 * (TONES), else the block's authored photo
 */
function buildSlides(backgroundRow, count, postPictures = []) {
  const picture = backgroundRow.querySelector('picture');
  if (count < 2 || (!picture && !postPictures.some(Boolean))) return [];
  let pictureUsed = false;
  const slides = Array.from({ length: count }, (_, i) => {
    const slide = el('div', 'blog-carousel-slide');
    const { image } = TONES[i % TONES.length];
    if (postPictures[i]) {
      slide.append(postPictures[i]);
    } else if (image) {
      const own = el('picture');
      const img = el('img', '', { src: image, alt: '', decoding: 'async' });
      own.append(img);
      slide.append(own);
    } else if (picture) {
      // further slides show copies, so the editor lists the block's photo once
      slide.append(pictureUsed ? displayCopy(picture) : picture);
      pictureUsed = true;
    }
    // a slide that has left the screen is hidden until it comes back
    slide.addEventListener('transitionend', (e) => {
      if (e.propertyName === 'transform' && !slide.classList.contains('is-active')) {
        slide.classList.remove('is-shown');
      }
    });
    return slide;
  });
  backgroundRow.replaceChildren(...slides);
  return slides;
}

/**
 * slides background `to` in the way the arrow points, from behind it: from the left for ›
 * (dir 1), from the right for ‹ (dir -1), pushing `from` out the other side; dir 0 just
 * shows it
 */
function slideBackground(slides, from, to, dir) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const incoming = slides[to];
  const outgoing = slides[from];
  slides.forEach((slide) => {
    if (slide !== incoming && slide !== outgoing) slide.classList.remove('is-shown', 'is-active');
  });
  incoming.classList.add('is-shown', 'is-active');
  if (!dir || from === to || reduced) {
    slides.forEach((slide) => {
      if (slide !== incoming) slide.classList.remove('is-shown', 'is-active');
    });
    incoming.style.transform = '';
    return;
  }
  // start just off the screen on the side it comes from, then glide in (blog-carousel.css)
  incoming.style.transition = 'none';
  incoming.style.transform = `translate3d(${-dir * 100}%, 0, 0)`;
  incoming.getBoundingClientRect();
  incoming.style.removeProperty('transition');
  incoming.style.transform = 'translate3d(0, 0, 0)';
  outgoing.classList.remove('is-active');
  outgoing.style.transform = `translate3d(${dir * 100}%, 0, 0)`;
}

/**
 * scroll-linked rise of the card from its peek position into its place, and the white to
 * dark background reveal that goes with it
 */
function trackPeek(block, card) {
  block.classList.add('blog-carousel-reveal');
  let previous = block.closest('.section')?.previousElementSibling;
  while (previous && !previous.classList.contains('section')) {
    previous = previous.previousElementSibling;
  }
  // the peek: PEEK, or less where the previous section's images reach further down its last
  // screen (the one this section's top comes up under)
  const peekFor = (top, h) => {
    let lowest = 0; // the lowest image bottom, from the top of that last screen
    previous?.querySelectorAll('img').forEach((img) => {
      const r = img.getBoundingClientRect();
      if (r.width && r.bottom > top - h && r.top < top) {
        lowest = Math.max(lowest, r.bottom - (top - h));
      }
    });
    return Math.max(0, Math.min(PEEK, h - lowest - PEEK_GAP));
  };
  let frame = 0;
  let litTimer = 0;
  const update = () => {
    frame = 0;
    const h = window.innerHeight;
    const { top } = block.getBoundingClientRect();
    // 0 while the section is still below the screen, 1 once its top reaches the screen top
    const t = Math.min(1, Math.max(0, 1 - top / h));
    if (t < 0.995) {
      clearTimeout(litTimer);
      litTimer = 0;
      block.classList.remove('blog-carousel-lit');
    } else if (!litTimer && !block.classList.contains('blog-carousel-lit')) {
      litTimer = setTimeout(() => block.classList.add('blog-carousel-lit'), LIT_DELAY);
    }
    const lift = t < 1 ? (1 - t) * (card.offsetTop + peekFor(top, h)) : 0;
    card.style.transform = lift ? `translate3d(0, ${-lift.toFixed(1)}px, 0)` : '';
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  new ResizeObserver(schedule).observe(block);
  update();
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  instance += 1;
  const id = `blog-carousel-${instance}`;
  const section = block.closest('.section');
  if (section) {
    section.dataset.jswTheme = 'dark';
    if (!section.id && !document.getElementById('newsroom')) section.id = 'newsroom';
  }

  const rows = [...block.children];
  // a post just added in the editor has no text yet, but is shown (and editable)
  const postRows = rows.filter((r) => r.dataset.aueModel === POST_MODEL
    || r.children.length > 1 || r.querySelector('h2, h3, h4'));
  // the block's own fields come first, in model order: background, heading
  const fieldRows = rows.filter((r) => !postRows.includes(r));
  const backgroundRow = fieldRows.length > 1 ? fieldRows[0]
    : fieldRows.find((r) => r.querySelector('picture'));
  const headingRow = fieldRows.find((r) => r !== backgroundRow);
  const editing = Boolean(block.closest('[data-aue-resource]'));
  const postPictures = postRows.map((row) => takePostPicture(row, editing));
  postRows.forEach((row) => joinPostText(row, editing));

  const card = el('div', 'blog-carousel-card');
  // header row: ‹ OUR BLOGS ›
  const header = el('div', 'blog-carousel-header');
  if (headingRow) {
    headingRow.className = 'blog-carousel-heading';
    header.append(headingRow);
  }
  card.append(header);
  const posts = el('div', 'blog-carousel-posts', { id: `${id}-posts`, 'aria-live': 'polite' });
  postRows.forEach((row, i) => {
    decoratePost(row, i, postRows.length);
    posts.append(row);
  });
  card.append(posts);

  const parts = [];
  let slides = [];
  if (backgroundRow) {
    backgroundRow.className = 'blog-carousel-background';
    backgroundRow.setAttribute('aria-hidden', 'true');
    backgroundRow.querySelector('img')?.setAttribute('alt', '');
    slides = buildSlides(backgroundRow, postRows.length, postPictures);
    parts.push(backgroundRow);
  }
  parts.push(card);

  const prev = el('button', 'blog-carousel-prev', { type: 'button', 'aria-label': 'Previous post', 'aria-controls': posts.id });
  const next = el('button', 'blog-carousel-next', { type: 'button', 'aria-label': 'Next post', 'aria-controls': posts.id });
  // "n / total" for screen readers only (the design shows just the arrows)
  const counter = el('p', 'blog-carousel-counter');
  if (postRows.length > 1) {
    header.setAttribute('role', 'group');
    header.setAttribute('aria-label', 'Blog posts');
    header.prepend(prev);
    header.append(next, counter);
  }

  let current = 0;
  // dir: 1 next (the new background comes in from the left), -1 previous, 0 no slide
  const show = (index, dir = 0) => {
    const from = current;
    current = (index + postRows.length) % postRows.length;
    postRows.forEach((row, i) => {
      const active = i === current;
      row.classList.toggle('is-active', active);
      row.setAttribute('aria-hidden', active ? 'false' : 'true');
      row.inert = !active;
    });
    counter.textContent = `${current + 1} / ${postRows.length}`;
    if (slides.length) slideBackground(slides, from, current, dir);
    // the navigation pill follows the post's colour (immersive-hero.js reads it)
    const { nav } = TONES[current % TONES.length];
    if (section && nav) section.dataset.jswNavTone = nav;
    else if (section) delete section.dataset.jswNavTone;
  };
  prev.addEventListener('click', () => show(current - 1, -1));
  next.addEventListener('click', () => show(current + 1, 1));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(current - 1, -1);
    if (e.key === 'ArrowRight') show(current + 1, 1);
  });

  block.replaceChildren(...parts);
  if (postRows.length) show(0);
  if (!editing) trackPeek(block, card);
}
