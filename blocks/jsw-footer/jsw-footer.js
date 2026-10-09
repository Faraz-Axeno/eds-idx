/*
 * jsw-footer: full-width footer on a black-to-teal gradient.
 * Rows (in order): brand (name, copyright, location, legal link) | CTA link |
 * CONNECT (heading + link list) | EXPLORE (heading + link list).
 */

function plainLinks(scope) {
  scope.querySelectorAll('a').forEach((a) => {
    a.classList.remove('button', 'primary', 'secondary', 'accent');
    a.closest('.button-wrapper')?.classList.remove('button-wrapper');
  });
}

function decorateColumn(row, className) {
  row.className = className;
  const heading = row.querySelector('p');
  if (heading && !heading.querySelector('a')) heading.classList.add('jsw-footer-heading');
  row.querySelector('ul')?.classList.add('jsw-footer-list');
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const section = block.closest('.section');
  if (section) {
    section.dataset.jswTheme = 'dark';
    if (!section.id && !document.getElementById('register-interest')) section.id = 'register-interest';
  }
  plainLinks(block);

  const listRows = [...block.children].filter((r) => r.querySelector('ul'));
  const [brandRow, ctaRow] = [...block.children].filter((r) => !listRows.includes(r));

  if (brandRow) {
    brandRow.className = 'jsw-footer-brand';
    const [name, ...rest] = [...brandRow.querySelectorAll('p')];
    if (name && !name.querySelector('a')) {
      name.classList.add('jsw-footer-name');
      const mark = document.createElement('span');
      mark.className = 'jsw-logo-mark';
      mark.setAttribute('aria-hidden', 'true');
      name.prepend(mark);
    }
    rest.forEach((p) => p.classList.add(p.querySelector('a') ? 'jsw-footer-legal' : 'jsw-footer-meta'));
  }
  if (ctaRow) {
    ctaRow.className = 'jsw-footer-cta';
    ctaRow.querySelector('a')?.classList.add('jsw-footer-cta-link');
  }

  const links = document.createElement('div');
  links.className = 'jsw-footer-links';
  listRows.forEach((row) => {
    decorateColumn(row, 'jsw-footer-column');
    links.append(row);
  });

  block.replaceChildren(...[brandRow, ctaRow, links].filter(Boolean));
}
