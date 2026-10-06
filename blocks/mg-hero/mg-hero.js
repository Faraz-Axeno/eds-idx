import { createPicture, moveInstrumentation } from '../../scripts/scripts.js';

// No authorable options yet; kept so options can be added without restructuring.
const OPTION_CLASSES = [];

// Leading/trailing list markers that leak into the heading from the source markup
// (e.g. "- MG SELECT x GAURAV GUPTA", "• MG SELECT x GAURAV GUPTA").
const BULLET_RE = /^[\s•·‣⁃▪●*\-–—]+|[\s•·*\-–—]+$/g;

function cleanText(text) {
  return (text || '').replace(BULLET_RE, '').replace(/\s+/g, ' ').trim();
}

/**
 * Builds a clean heading element from the authored content. Handles headings that
 * were imported inside list items or that carry bullet/hyphen prefixes.
 */
function buildHeading(content) {
  let heading = content.querySelector('h1, h2, h3, h4, h5, h6');
  if (!heading) {
    // Fallback: first non-link text node (paragraph or list item) becomes the title.
    const candidate = [...content.querySelectorAll('li, p')]
      .find((el) => !el.querySelector('a, picture') && cleanText(el.textContent));
    if (!candidate) return null;
    heading = document.createElement('h1');
    moveInstrumentation(candidate, heading);
    heading.textContent = candidate.textContent;
    candidate.remove();
  }
  const title = document.createElement(heading.tagName.toLowerCase());
  moveInstrumentation(heading, title);
  if (heading.id) title.id = heading.id;
  title.className = 'mg-hero-title';
  title.textContent = cleanText(heading.textContent);
  heading.remove();
  return title;
}

function optimizePicture(picture, eager, width) {
  const img = picture.querySelector('img');
  if (!img) return picture;
  const optimized = createPicture(img.src, img.alt, eager, [{ width }]);
  moveInstrumentation(img, optimized.querySelector('img'));
  return optimized;
}

function buildCta(link) {
  const cta = link;
  cta.className = 'mg-hero-cta';
  const label = document.createElement('span');
  label.className = 'mg-hero-cta-label';
  label.textContent = cleanText(cta.textContent);
  const icon = document.createElement('span');
  icon.className = 'mg-hero-cta-icon';
  icon.setAttribute('aria-hidden', 'true');
  cta.replaceChildren(label, icon);
  return cta;
}

function buildPill(link, index) {
  const li = document.createElement('li');
  li.className = 'mg-hero-pill';
  li.dataset.pillIndex = index;
  li.dataset.dismissed = 'false';

  link.className = 'mg-hero-pill-link';
  link.textContent = cleanText(link.textContent);

  // like the source, a dismissed pill stays closed for the rest of the browser session
  const storageKey = `mg-hero-pill-closed:${link.getAttribute('href') || link.textContent}`;
  const dismiss = () => {
    li.dataset.dismissed = 'true';
    li.hidden = true;
  };
  try {
    if (sessionStorage.getItem(storageKey) === 'true') dismiss();
  } catch (e) {
    // storage unavailable (privacy mode): pills just show
  }

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'mg-hero-pill-close';
  close.setAttribute('aria-label', `Dismiss ${link.textContent}`);
  close.addEventListener('click', () => {
    dismiss();
    try {
      sessionStorage.setItem(storageKey, 'true');
    } catch (e) {
      // ignore
    }
  });

  li.append(link, close);
  return li;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const active = [...block.classList].filter((c) => OPTION_CLASSES.includes(c));
  block.dataset.options = active.join(' ');

  const rows = [...block.querySelectorAll(':scope > div')];
  const pictures = [];
  const content = document.createElement('div');
  const body = document.createElement('div');
  body.className = 'mg-hero-content';

  rows.forEach((row) => {
    const pics = [...row.querySelectorAll('picture')];
    const hasText = [...row.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, a')]
      .some((el) => !el.querySelector('picture') && el.textContent.trim());
    if (pics.length && !hasText) {
      pictures.push(...pics);
    } else {
      // Rich text row: pictures inside it are still treated as media.
      pics.forEach((pic) => {
        pictures.push(pic);
        (pic.closest('p') || pic).remove();
      });
      const cell = row.querySelector(':scope > div') || row;
      moveInstrumentation(row, body);
      content.append(...cell.childNodes);
    }
  });

  // Media: first picture = desktop/landscape, second (optional) = mobile/portrait.
  const media = document.createElement('div');
  media.className = 'mg-hero-media';
  if (pictures[0]) {
    const desktop = optimizePicture(pictures[0], true, '2000');
    desktop.classList.add('mg-hero-media-desktop');
    media.append(desktop);
  }
  if (pictures[1]) {
    const mobile = optimizePicture(pictures[1], false, '900');
    mobile.classList.add('mg-hero-media-mobile');
    media.append(mobile);
    block.dataset.hasMobileMedia = 'true';
  }

  const title = buildHeading(content);
  if (title) body.append(title);

  // Links: first = primary CTA, the rest = top-right pills.
  const links = [...content.querySelectorAll('a[href]')];
  const [primary, ...pillLinks] = links;
  links.forEach((a) => {
    const wrapper = a.closest('p, li');
    a.remove();
    if (wrapper && !wrapper.textContent.trim()) wrapper.remove();
  });

  // Keep any remaining authored copy (e.g. subtitle) under the title, without bullets.
  content.querySelectorAll('ul, ol').forEach((list) => {
    [...list.children].forEach((li) => {
      const p = document.createElement('p');
      p.textContent = cleanText(li.textContent);
      if (p.textContent) list.before(p);
    });
    list.remove();
  });
  [...content.children].forEach((el) => {
    if (el.textContent.trim() || el.querySelector('picture')) {
      el.classList.add('mg-hero-text');
      body.append(el);
    }
  });

  if (primary) {
    const actions = document.createElement('div');
    actions.className = 'mg-hero-actions';
    actions.append(buildCta(primary));
    body.append(actions);
  }

  const children = [media, body];
  if (pillLinks.length) {
    const pills = document.createElement('ul');
    pills.className = 'mg-hero-pills';
    pills.setAttribute('aria-label', 'Featured bookings');
    pillLinks.forEach((link, idx) => pills.append(buildPill(link, idx)));
    children.push(pills);
  }
  block.dataset.pills = pillLinks.length;

  block.replaceChildren(...children);

  // The Book pills float over every panel (sticky), so on the live page they move up to
  // <body>: inside the hero section they would sit in its stacking context, behind later
  // panels. In Universal Editor (instrumented markup) they stay put so authors can edit them.
  const pillList = block.querySelector('.mg-hero-pills');
  if (pillList && !block.closest('[data-aue-resource]')) {
    document.querySelectorAll('body > .mg-hero-pills').forEach((old) => old.remove());
    document.body.append(pillList);
  }

  // Animation hook: flag when the hero enters the viewport.
  block.dataset.inView = 'false';
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        block.dataset.inView = entry.isIntersecting ? 'true' : 'false';
      });
    }, { threshold: 0.3 });
    observer.observe(block);
  }
  block.dataset.ready = 'true';
}
