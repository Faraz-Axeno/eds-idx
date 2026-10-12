/*
 * jsw-blogs: dark panel with a blurred background and a frosted-glass card showing one post
 * at a time, ‹ OUR BLOGS › in its header row ("NEV / Blog").
 * Rows: background picture, card heading, then one row per post:
 *   category paragraph, title (h3), summary paragraph, READ MORE link.
 * On wide screens the card rises out of the section: its top already peeks in at the bottom
 * of the previous section's last screen ("NEV / Sustainable"), then it settles as the
 * section scrolls up.
 */

let instance = 0;
// how much of the card's top peeks into the previous section: its ‹ OUR BLOGS › header row
const PEEK = 84;
const PEEK_MEDIA = '(width >= 768px) and (orientation: landscape), (width >= 1200px)';

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
  const linkP = paragraphs.findLast(isLinkOnly);
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

/** scroll-linked rise of the card from its peek position into its place */
function trackPeek(block, card) {
  const media = window.matchMedia(PEEK_MEDIA);
  let frame = 0;
  const update = () => {
    frame = 0;
    if (!media.matches) {
      card.style.removeProperty('transform');
      return;
    }
    const h = window.innerHeight;
    // 0 while the section is still below the screen, 1 once its top reaches the screen top
    const t = Math.min(1, Math.max(0, 1 - block.getBoundingClientRect().top / h));
    const lift = (1 - t) * (card.offsetTop + PEEK);
    card.style.transform = lift ? `translate3d(0, ${-lift.toFixed(1)}px, 0)` : '';
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  media.addEventListener('change', schedule);
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
  if (backgroundRow) {
    backgroundRow.className = 'jsw-blogs-background';
    backgroundRow.setAttribute('aria-hidden', 'true');
    backgroundRow.querySelector('img')?.setAttribute('alt', '');
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
  const show = (index) => {
    current = (index + postRows.length) % postRows.length;
    postRows.forEach((row, i) => {
      const active = i === current;
      row.classList.toggle('is-active', active);
      row.setAttribute('aria-hidden', active ? 'false' : 'true');
      row.inert = !active;
    });
    counter.textContent = `${current + 1} / ${postRows.length}`;
  };
  prev.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });

  block.replaceChildren(...parts);
  if (postRows.length) show(0);
  if (!block.closest('[data-aue-resource]')) trackPeek(block, card);
}
