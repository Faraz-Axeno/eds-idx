/*
 * expandable-blog-teaser: grey "‹ OUR BLOGS ›" tab resting at the bottom of the viewport
 * that expands into an overlay card when the user scrolls further (or clicks the tab).
 * Rows: 1) tab text, 2) expanded title, 3) expanded description, 4) button link.
 * The section overlaps the last screen of the block above (see --blog-teaser-overlap):
 * its sticky stage slides the tab up from the bottom with the page, then the scroll through
 * the remaining distance opens the card; the content fades + rises in after it.
 */

const OPEN_AT = 0.25; // share of the section's own scroll distance after which the card opens
let instance = 0;

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

const cellOf = (row) => row?.querySelector(':scope > div') || row;

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  instance += 1;
  const id = `blog-teaser-${instance}`;
  document.body.dataset.nativeScroll = 'true';

  const [tabRow, titleRow, descriptionRow, linkRow] = [...block.children];
  // "< OUR BLOGS >" → "OUR BLOGS": the chevrons are drawn by CSS
  const tabText = (cellOf(tabRow)?.textContent || 'OUR BLOGS').replace(/^[\s<‹]+|[\s>›]+$/g, '');

  const card = el('div', 'blog-teaser-card', { 'data-state': 'tab' });
  const tab = el('button', 'blog-teaser-tab', { type: 'button', 'aria-expanded': 'false', 'aria-controls': `${id}-panel` });
  const label = el('span', 'blog-teaser-tab-label');
  label.textContent = tabText;
  tab.append(el('span', 'blog-teaser-chevron is-prev', { 'aria-hidden': 'true' }), label, el('span', 'blog-teaser-chevron is-next', { 'aria-hidden': 'true' }));

  const panel = el('div', 'blog-teaser-panel', { id: `${id}-panel`, role: 'region', 'aria-label': tabText });
  const titleText = cellOf(titleRow)?.textContent.trim();
  if (titleText) {
    const title = el('h2', 'blog-teaser-title');
    title.textContent = titleText;
    panel.append(title);
  }
  const description = cellOf(descriptionRow);
  if (description) {
    description.className = 'blog-teaser-description';
    panel.append(description);
  }
  const source = linkRow?.querySelector('a');
  if (source) {
    const action = el('p', 'blog-teaser-action');
    const button = el('a', 'blog-teaser-button', { href: source.getAttribute('href') });
    const text = el('span');
    text.textContent = source.textContent.trim() || 'READ MORE';
    button.append(text, el('span', 'blog-teaser-arrow', { 'aria-hidden': 'true' }));
    action.append(button);
    panel.append(action);
  }
  card.append(tab, panel);

  const stage = el('div', 'blog-teaser-stage');
  stage.append(card);
  block.replaceChildren(stage);

  const section = block.closest('.section') || block;
  const setState = (open) => {
    card.dataset.state = open ? 'open' : 'tab';
    tab.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.inert = !open;
  };

  // Universal Editor: show the card open and in flow so every field can be edited
  if (block.closest('[data-aue-resource]')) {
    block.classList.add('blog-teaser-editing');
    setState(true);
    return;
  }

  const distance = () => Math.max(1, section.offsetHeight - window.innerHeight);
  let frame = 0;
  const update = () => {
    frame = 0;
    const progress = -section.getBoundingClientRect().top / distance();
    setState(progress >= OPEN_AT);
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  update();

  // clicking the tab scrolls to the open (or back to the resting) position
  tab.addEventListener('click', () => {
    const sectionTop = section.getBoundingClientRect().top + window.scrollY;
    const open = card.dataset.state === 'open';
    window.scrollTo({ top: sectionTop + (open ? 0 : distance() * 0.6), behavior: 'smooth' });
  });
}
