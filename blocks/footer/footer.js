/**
 * Fetches the footer fragment and rebases relative media to the fragment location.
 * @returns {Promise<Element[]|null>} the fragment's top-level sections
 */
async function fetchFooterSections() {
  // metadata-independent: /content first (localhost / aem up), then site root (DA/EDS)
  let base = '/content/footer.plain.html';
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) {
    base = '/footer.plain.html';
    resp = await fetch('/footer.plain.html');
  }
  if (!resp.ok) return null;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = await resp.text();
  const baseUrl = new URL(base, window.location);
  wrapper.querySelectorAll('img[src], source[srcset]').forEach((media) => {
    const attr = media.tagName === 'IMG' ? 'src' : 'srcset';
    const value = media.getAttribute(attr);
    if (value && !/^([a-z]+:|\/)/i.test(value)) media.setAttribute(attr, new URL(value, baseUrl).href);
  });
  return [...wrapper.children];
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (v !== undefined && v !== null) node.setAttribute(k, v);
  });
  node.append(...children.filter(Boolean));
  return node;
}

/** external links and documents open in a new tab, as on the source */
function decorateLinks(root) {
  root.querySelectorAll('a[href]').forEach((a) => {
    const url = new URL(a.href, window.location);
    const external = url.origin !== window.location.origin && /^https?:$/.test(url.protocol);
    if (external || /^(tel|mailto):$/.test(url.protocol)) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
  });
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** plus / minus accordion glyph (UI chrome, not authored content) */
function toggleIcon(kind) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('class', `footer-links-icon footer-links-icon-${kind}`);
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', kind === 'plus' ? 'M8 2v12M2 8h12' : 'M2 8h12');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-linecap', 'round');
  svg.append(path);
  return svg;
}

/** converts a paragraph whose only content is <strong> into a heading */
function toHeading(p, level, className) {
  const heading = el(`h${level}`, { class: className });
  heading.textContent = p.textContent.trim();
  return heading;
}

function buildBrand(section) {
  const brand = el('div', { class: 'footer-brand' });
  const link = section.querySelector('a');
  if (link) {
    link.classList.add('footer-brand-link');
    brand.append(link);
  }
  return brand;
}

function buildNewsletter(section) {
  const [titleP, placeholderP, submitP, consentP, errorP] = [...section.querySelectorAll(':scope > p')];
  const uid = Math.random().toString(36).slice(2, 8);

  const input = el('input', {
    type: 'email',
    name: 'email',
    id: `footer-email-${uid}`,
    class: 'footer-newsletter-input',
    placeholder: placeholderP?.textContent.trim(),
    'aria-label': placeholderP?.textContent.trim(),
    autocomplete: 'email',
    required: '',
  });

  const button = el('button', { type: 'submit', class: 'footer-newsletter-submit' });
  const icon = submitP?.querySelector('img');
  button.append(el('span', { class: 'footer-newsletter-submit-label' }, submitP?.textContent.trim()));
  if (icon) {
    icon.alt = '';
    icon.classList.add('footer-newsletter-submit-icon');
    button.append(icon.closest('picture') || icon);
  }

  const error = el('p', {
    class: 'footer-newsletter-error',
    id: `footer-email-error-${uid}`,
    role: 'alert',
    'aria-live': 'polite',
  });
  const errorText = errorP?.textContent.trim() || '';
  input.setAttribute('aria-describedby', error.id);

  const checkbox = el('input', {
    type: 'checkbox',
    name: 'consent',
    id: `footer-consent-${uid}`,
    class: 'footer-newsletter-checkbox',
  });
  const label = el('label', { for: checkbox.id, class: 'footer-newsletter-label' });
  if (consentP) label.append(...consentP.childNodes);

  const form = el(
    'form',
    { class: 'footer-newsletter', novalidate: '' },
    titleP ? toHeading(titleP, 2, 'footer-newsletter-title') : null,
    el('div', { class: 'footer-newsletter-row' }, input, button),
    error,
    el('div', { class: 'footer-newsletter-consent' }, checkbox, label),
  );

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const valid = input.checkValidity() && input.value.trim();
    error.textContent = valid ? '' : errorText;
    form.dataset.invalid = valid ? 'false' : 'true';
    input.setAttribute('aria-invalid', valid ? 'false' : 'true');
    if (!valid) input.focus();
  });
  input.addEventListener('input', () => {
    if (form.dataset.invalid === 'true' && input.checkValidity()) {
      error.textContent = '';
      form.dataset.invalid = 'false';
      input.setAttribute('aria-invalid', 'false');
    }
  });
  return form;
}

function buildLinkColumns(section) {
  const nav = el('nav', { class: 'footer-links', 'aria-label': 'Footer' });
  section.querySelectorAll(':scope > p').forEach((titleP, index) => {
    const list = titleP.nextElementSibling?.tagName === 'UL' ? titleP.nextElementSibling : null;
    const column = el('div', { class: 'footer-links-column', 'data-column': index });
    const heading = toHeading(titleP, 3, 'footer-links-title');
    const listId = `footer-links-${index}-${Math.random().toString(36).slice(2, 6)}`;
    // mobile accordion toggle (multi-expand, first column open like the source);
    // inert on desktop where all columns are open
    const toggle = el('button', {
      type: 'button',
      class: 'footer-links-toggle',
      'aria-expanded': index === 0 ? 'true' : 'false',
      'aria-controls': listId,
    });
    toggle.append(heading.textContent, toggleIcon('plus'), toggleIcon('minus'));
    heading.textContent = '';
    heading.append(toggle);
    toggle.addEventListener('click', () => {
      toggle.setAttribute('aria-expanded', toggle.getAttribute('aria-expanded') === 'true' ? 'false' : 'true');
    });
    column.append(heading);
    if (list) {
      list.id = listId;
      list.classList.add('footer-links-list');
      column.append(list);
    }
    nav.append(column);
  });
  return nav;
}

function buildBottom(section) {
  const [copyright] = section.querySelectorAll(':scope > p');
  const [legalList, socialList] = section.querySelectorAll(':scope > ul');
  const legal = el('div', { class: 'footer-legal' });
  if (copyright) {
    copyright.classList.add('footer-copyright');
    legal.append(copyright);
  }
  if (legalList) {
    legalList.classList.add('footer-legal-list');
    legal.append(legalList);
  }
  if (socialList) {
    socialList.classList.add('footer-social');
    socialList.querySelectorAll('a').forEach((a) => {
      const img = a.querySelector('img');
      if (img) a.setAttribute('aria-label', img.alt);
    });
  }
  return el('div', { class: 'footer-bottom' }, legal, socialList);
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const sections = await fetchFooterSections();
  if (!sections) return;
  const [brandSection, newsletterSection, linksSection, bottomSection] = sections;

  const top = el(
    'div',
    { class: 'footer-top' },
    brandSection ? buildBrand(brandSection) : null,
    newsletterSection ? buildNewsletter(newsletterSection) : null,
  );
  const inner = el(
    'div',
    { class: 'footer-inner' },
    top,
    linksSection ? buildLinkColumns(linksSection) : null,
    el('div', { class: 'footer-divider', role: 'presentation' }),
    bottomSection ? buildBottom(bottomSection) : null,
  );
  decorateLinks(inner);
  block.replaceChildren(inner);
}
