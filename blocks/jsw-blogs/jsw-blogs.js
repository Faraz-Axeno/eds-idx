/*
 * jsw-blogs: dark panel with a blurred background and a frosted-glass card showing one post
 * at a time, ‹ OUR BLOGS › in its header row ("NEV / Blog").
 * Rows: background picture, card heading, then one row per post:
 *   category paragraph, title (h3), summary paragraph, READ MORE link.
 * On every screen size the card rises out of the section: its top already peeks in at the bottom
 * of the previous section's last screen ("NEV / Sustainable"), then it settles as the
 * section scrolls up. The section starts white and fades to its dark background as it does.
 * Each post has its own background (the prototype's, see TONES); ‹ › slide the new one
 * in from behind the arrow while the card's text changes, and the fixed
 * navigation takes on the post's colour (section data-jsw-nav-tone, read by jsw-hero).
 */

let instance = 0;
// how much of the card's top peeks into the previous section: its ‹ OUR BLOGS › header row;
// less where that section's last screen leaves less room below its images (phones), so the
// card always keeps this gap under them
const PEEK = 84;
const PEEK_GAP = 20;
// the section arrives white ("NEV / Blog" prototype): once it fills the screen and the card
// has settled, it stays white this long, then fades to its dark background (0.8s,
// jsw-blogs.css); it turns white again when scrolled away
const LIT_DELAY = 1000;
// per post, in order (then repeating), from the "NEV / Blog" prototype: its background
// (the authored photo for the first post; the next two are the prototype's own blurred
// backgrounds, rebuilt from it) and the navigation pill's colour
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

function decoratePost(row, index, total) {
  row.className = 'jsw-blogs-post';
  row.setAttribute('role', 'group');
  row.setAttribute('aria-roledescription', 'slide');
  row.setAttribute('aria-label', `${index + 1} of ${total}`);
  const cell = row.querySelector(':scope > div') || row;
  cell.classList.add('jsw-blogs-post-inner');
  const heading = cell.querySelector('h2, h3, h4');
  heading?.classList.add('jsw-blogs-title');
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
    p.classList.add(children.indexOf(p) < headingAt ? 'jsw-blogs-category' : 'jsw-blogs-summary');
  });
  if (linkP) {
    linkP.className = 'jsw-blogs-action';
    const a = linkP.querySelector('a');
    a.className = 'jsw-blogs-read';
    const label = el('span', 'jsw-blogs-read-label');
    label.textContent = a.textContent.trim();
    const icon = el('span', 'jsw-blogs-read-icon', { 'aria-hidden': 'true' });
    a.replaceChildren(label, icon);
    if (heading) a.setAttribute('aria-label', `${label.textContent}: ${heading.textContent.trim()}`);
  }
}

/** one background slide per post: its own background, else the authored photo */
function buildSlides(backgroundRow, count) {
  const picture = backgroundRow.querySelector('picture');
  if (!picture || count < 2) return [];
  const slides = Array.from({ length: count }, (_, i) => {
    const slide = el('div', 'jsw-blogs-slide');
    const { image } = TONES[i % TONES.length];
    if (image) {
      const own = el('picture');
      const img = el('img', '', { src: image, alt: '', decoding: 'async' });
      own.append(img);
      slide.append(own);
    } else {
      slide.append(i ? picture.cloneNode(true) : picture);
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
  // start just off the screen on the side it comes from, then glide in (jsw-blogs.css)
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
  block.classList.add('jsw-blogs-reveal');
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
      block.classList.remove('jsw-blogs-lit');
    } else if (!litTimer && !block.classList.contains('jsw-blogs-lit')) {
      litTimer = setTimeout(() => block.classList.add('jsw-blogs-lit'), LIT_DELAY);
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
  const id = `jsw-blogs-${instance}`;
  const section = block.closest('.section');
  if (section) {
    section.dataset.jswTheme = 'dark';
    if (!section.id && !document.getElementById('newsroom')) section.id = 'newsroom';
  }

  const rows = [...block.children];
  const postRows = rows.filter((r) => r.querySelector('h2, h3, h4'));
  const backgroundRow = rows.find((r) => !postRows.includes(r) && r.querySelector('picture'));
  const headingRow = rows.find((r) => !postRows.includes(r) && r !== backgroundRow);

  const card = el('div', 'jsw-blogs-card');
  // header row: ‹ OUR BLOGS ›
  const header = el('div', 'jsw-blogs-header');
  if (headingRow) {
    headingRow.className = 'jsw-blogs-heading';
    header.append(headingRow);
  }
  card.append(header);
  const posts = el('div', 'jsw-blogs-posts', { id: `${id}-posts`, 'aria-live': 'polite' });
  postRows.forEach((row, i) => {
    decoratePost(row, i, postRows.length);
    posts.append(row);
  });
  card.append(posts);

  const parts = [];
  let slides = [];
  if (backgroundRow) {
    backgroundRow.className = 'jsw-blogs-background';
    backgroundRow.setAttribute('aria-hidden', 'true');
    backgroundRow.querySelector('img')?.setAttribute('alt', '');
    slides = buildSlides(backgroundRow, postRows.length);
    parts.push(backgroundRow);
  }
  parts.push(card);

  const prev = el('button', 'jsw-blogs-prev', { type: 'button', 'aria-label': 'Previous post', 'aria-controls': posts.id });
  const next = el('button', 'jsw-blogs-next', { type: 'button', 'aria-label': 'Next post', 'aria-controls': posts.id });
  // "n / total" for screen readers only (the design shows just the arrows)
  const counter = el('p', 'jsw-blogs-counter');
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
    // the navigation pill follows the post's colour (jsw-hero.js reads it)
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
  if (!block.closest('[data-aue-resource]')) trackPeek(block, card);
}
