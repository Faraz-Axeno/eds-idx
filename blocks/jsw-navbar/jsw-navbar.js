/*
 * jsw-navbar: the JSW Motors pill navigation, fixed at the top of the page.
 * Rows: brand link (logo text), list of navigation links, call-to-action link.
 * The pill is moved to <body> so no section or sticky stage can trap it.
 */

function cellOf(row) {
  return row?.querySelector(':scope > div') || row;
}

/** strip the site's automatic button styling from authored links */
function plain(a) {
  a.classList.remove('button', 'primary', 'secondary', 'accent');
  a.closest('.button-wrapper')?.classList.remove('button-wrapper');
  return a;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const linksRow = rows.find((r) => r.querySelector('ul, ol'));
  const [brandRow, ctaRow] = rows.filter((r) => r !== linksRow);

  const nav = document.createElement('nav');
  nav.className = 'jsw-navbar-nav';
  nav.setAttribute('aria-label', 'Main');
  const pill = document.createElement('div');
  pill.className = 'jsw-navbar-pill';

  // brand: ring-and-slash mark + logo text, linked
  const brandCell = cellOf(brandRow);
  const brandLink = brandCell?.querySelector('a');
  const brandText = (brandLink || brandCell)?.textContent.trim() || 'JSW MOTORS';
  const brand = document.createElement('a');
  brand.className = 'jsw-navbar-brand';
  brand.href = brandLink?.getAttribute('href') || '/';
  brand.setAttribute('aria-label', `${brandText} home`);
  const mark = document.createElement('span');
  mark.className = 'jsw-navbar-mark';
  mark.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.className = 'jsw-navbar-brand-text';
  label.textContent = brandText;
  brand.append(mark, label);
  pill.append(brand);

  const list = cellOf(linksRow)?.querySelector('ul, ol');
  if (list) {
    list.className = 'jsw-navbar-links';
    list.querySelectorAll('a').forEach(plain);
    pill.append(list);
  }

  const cta = cellOf(ctaRow)?.querySelector('a');
  if (cta) {
    plain(cta).className = 'jsw-navbar-cta';
    pill.append(cta);
  }

  nav.append(pill);
  block.replaceChildren(nav);

  // Universal Editor: keep it in place so the fields stay editable
  if (block.closest('[data-aue-resource]')) {
    block.classList.add('jsw-navbar-editing');
    return;
  }
  document.body.append(nav);
}
