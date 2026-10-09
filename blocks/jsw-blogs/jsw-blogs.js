/*
 * jsw-blogs: dark panel with a blurred background and ambient glow, a frosted-glass card
 * showing one post at a time, and ‹ n / total › controls below it.
 * Rows: background picture, card heading, then one row per post:
 *   category paragraph, title (h3), summary paragraph, READ MORE link.
 */

let instance = 0;

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
  if (headingRow) {
    headingRow.className = 'jsw-blogs-heading';
    card.append(headingRow);
  }
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

  const controls = el('div', 'jsw-blogs-controls', { role: 'group', 'aria-label': 'Blog posts' });
  const prev = el('button', 'jsw-blogs-prev', { type: 'button', 'aria-label': 'Previous post', 'aria-controls': posts.id });
  const next = el('button', 'jsw-blogs-next', { type: 'button', 'aria-label': 'Next post', 'aria-controls': posts.id });
  const counter = el('p', 'jsw-blogs-counter');
  controls.append(prev, counter, next);
  if (postRows.length > 1) parts.push(controls);

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
}
