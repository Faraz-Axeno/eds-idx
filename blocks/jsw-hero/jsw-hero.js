/*
 * jsw-hero: dark full-viewport intro of the JSW Motors NEV page.
 * Rows (any order, recognised by content):
 *   visual — a picture, shown blurred behind an ambient glow
 *   nav    — logo text, a list of links, then the CTA link: becomes the fixed pill navigation
 *   text   — h1 headline, description paragraph, bottom-right button link
 * Also adds the fixed right-edge scroll progress indicator. Navigation and indicator follow
 * the theme of the section underneath them (sections carry data-jsw-theme).
 */

const NAV_PROBE_Y = 40; // vertical centre of the fixed pill

function plainLink(a) {
  a.classList.remove('button', 'primary', 'secondary', 'accent');
  const p = a.closest('p');
  if (p && p.classList.contains('button-wrapper')) p.classList.remove('button-wrapper');
  return a;
}

function cellOf(row) {
  return row.querySelector(':scope > div') || row;
}

function inEditor(block) {
  return Boolean(block.closest('[data-aue-resource]'));
}

function decorateVisual(row) {
  row.className = 'jsw-hero-visual';
  const glow = document.createElement('span');
  glow.className = 'jsw-hero-glow';
  glow.setAttribute('aria-hidden', 'true');
  row.append(glow);
  const img = row.querySelector('img');
  if (img) {
    img.loading = 'eager';
    img.fetchPriority = 'high';
  }
}

function decorateText(row) {
  row.className = 'jsw-hero-content';
  const cell = cellOf(row);
  cell.classList.add('jsw-hero-content-inner');
  cell.querySelector('h1, h2')?.classList.add('jsw-hero-title');
  const paragraphs = [...cell.querySelectorAll(':scope > p')];
  paragraphs.forEach((p) => {
    const a = p.querySelector('a');
    if (a && p.textContent.trim() === a.textContent.trim()) {
      p.classList.add('jsw-hero-action');
      plainLink(a).classList.add('jsw-hero-cta');
      const plus = document.createElement('span');
      plus.className = 'jsw-hero-cta-icon';
      plus.setAttribute('aria-hidden', 'true');
      a.append(plus);
    } else {
      p.classList.add('jsw-hero-description');
    }
  });
}

/** turns the nav row into <nav>: brand link, links list and CTA */
function buildNav(row) {
  const cell = cellOf(row);
  cell.classList.add('jsw-nav-inner');
  const brand = [...cell.querySelectorAll(':scope > p')].find((p) => !p.querySelector('a'));
  if (brand) {
    const home = document.createElement('a');
    home.className = 'jsw-nav-brand';
    home.href = window.location.pathname;
    home.setAttribute('aria-label', `${brand.textContent.trim()} home`);
    const mark = document.createElement('span');
    mark.className = 'jsw-logo-mark';
    mark.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'jsw-nav-brand-text';
    label.textContent = brand.textContent.trim();
    home.append(mark, label);
    home.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0 });
    });
    brand.replaceChildren(home);
    brand.classList.add('jsw-nav-brand-wrap');
  }
  cell.querySelector(':scope > ul')?.classList.add('jsw-nav-links');
  cell.querySelectorAll('a').forEach(plainLink);
  const cta = [...cell.querySelectorAll(':scope > p a')].pop();
  if (cta && !cta.classList.contains('jsw-nav-brand')) {
    cta.classList.add('jsw-nav-cta');
    cta.closest('p').classList.add('jsw-nav-cta-wrap');
  }
  const nav = document.createElement('nav');
  nav.className = 'jsw-nav';
  nav.setAttribute('aria-label', 'Main');
  row.replaceWith(nav);
  nav.append(row);
  row.className = 'jsw-nav-row';
  return nav;
}

function buildScrollIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'jsw-scroll';
  indicator.setAttribute('aria-hidden', 'true');
  indicator.innerHTML = '<span class="jsw-scroll-track"><span class="jsw-scroll-thumb"></span></span>'
    + '<span class="jsw-scroll-label"><span class="jsw-scroll-mouse"></span>SCROLL</span>';
  return indicator;
}

/** keeps the fixed chrome in the theme of the section under it, and the progress current */
function trackPage(indicator) {
  let frame = 0;
  const update = () => {
    frame = 0;
    const sections = [...document.querySelectorAll('main > .section')];
    const under = sections.find((s) => {
      const r = s.getBoundingClientRect();
      return r.height > 0 && r.top <= NAV_PROBE_Y && r.bottom > NAV_PROBE_Y;
    });
    document.body.dataset.jswTheme = under?.dataset.jswTheme || 'dark';
    if (indicator) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      indicator.style.setProperty('--jsw-scroll-progress', max > 0 ? Math.min(1, window.scrollY / max) : 0);
      // step aside once the page footer comes up, so it never sits on the footer links
      const footer = document.querySelector('.jsw-footer');
      const footerTop = footer ? footer.getBoundingClientRect().top : Infinity;
      indicator.classList.toggle('is-hidden', footerTop < window.innerHeight * 0.75);
    }
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  // later sections set their theme once they are decorated
  new MutationObserver(schedule).observe(document.querySelector('main'), {
    subtree: true, attributes: true, attributeFilter: ['data-jsw-theme', 'data-section-status'],
  });
  update();
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  block.closest('.section')?.setAttribute('data-jsw-theme', 'dark');
  const rows = [...block.children];
  const textRow = rows.find((r) => r.querySelector('h1, h2'));
  const visualRow = rows.find((r) => r !== textRow && r.querySelector('picture') && !r.querySelector('a'));
  const navRow = rows.find((r) => r !== textRow && r !== visualRow && r.querySelector('a'));

  if (visualRow) decorateVisual(visualRow);
  if (textRow) decorateText(textRow);
  const nav = navRow ? buildNav(navRow) : null;

  if (inEditor(block)) {
    // keep everything inside the block so each field stays editable in place
    block.classList.add('jsw-hero-editing');
    return;
  }
  // fixed page chrome: outside every section so no stacking context can trap it
  if (nav) document.body.append(nav);
  const indicator = buildScrollIndicator();
  document.body.append(indicator);
  trackPage(indicator);
}
