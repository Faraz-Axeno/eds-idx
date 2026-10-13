/*
 * jsw-hero: dark full-viewport intro of the JSW Motors NEV page.
 * Rows (any order, recognised by content):
 *   visual — a picture, shown blurred behind an ambient glow; once the page has loaded, the
 *            background video /videos/jsw-hero.mp4 (if present) plays full screen over it
 *   nav    — logo text, a list of links, then the CTA link: becomes the fixed pill navigation
 *   text   — h1 headline, description paragraph, bottom-right button link
 * Also adds the fixed right-edge SCROLL button (one stop down). Navigation and button follow
 * the theme of the section underneath them (sections carry data-jsw-theme).
 */

const NAV_PROBE_Y = 40; // vertical centre of the fixed pill

// "JSW MOTORS" as in the Figma navbar, letter by letter on its 9-unit cap grid: squared,
// extended letters; each S open at the top right and bottom left
const WORDMARK = '<svg viewBox="2 0 166 9" focusable="false" aria-hidden="true" fill="currentColor">'
  + '<path d="M11 0H16V9H2V7.1H13.6V1.9H11Z"/>'
  + '<path d="M20 0H35V1.9H22.4V3.55H35V9H20V7.1H32.6V5.45H20Z"/>'
  + '<path d="M38 0H40.6V9H38ZM50.8 0H53.4V9H50.8ZM44.2 2H46.8L53.2 9H50.6ZM44.2 2H46.8L40.6 9H38Z"/>'
  + '<path d="M64 0H66.7V9H64ZM77.3 0H80V9H77.3ZM64 0H66.7L73.2 7.2H70.6ZM77.3 0H80L73.4 7.2H70.8Z"/>'
  + '<path d="M84 0H96.9A1 1 0 0 1 97.9 1V8A1 1 0 0 1 96.9 9H84A1 1 0 0 1 83 8V1A1 1 0 0 1 84 0ZM85.6 1.9V7.1H95.3V1.9Z"/>'
  + '<path d="M100 0H115.9V1.9H109.1V9H106.3V1.9H100Z"/>'
  + '<path d="M119 0H131.9A1 1 0 0 1 132.9 1V8A1 1 0 0 1 131.9 9H119A1 1 0 0 1 118 8V1A1 1 0 0 1 119 0ZM120.6 1.9V7.1H130.3V1.9Z"/>'
  + '<path d="M135 0H137.6V9H135ZM137.6 0H148.8A1 1 0 0 1 149.8 1V5.4H147.2V1.9H137.6ZM140 3.6H149.8V5.4H140ZM140.2 5.4H143.2L149.6 9H145.7Z"/>'
  + '<path d="M153 0H168V1.9H155.4V3.55H168V9H153V7.1H165.6V5.45H153Z"/>'
  + '</svg>';

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

/**
 * browsers without CSS container units (cqw / cqh): the container's own width and height as
 * --jsw-cq-w / --jsw-cq-h, which the CSS uses in their place (@supports not container-type)
 */
function containerUnits(container) {
  if (window.CSS?.supports?.('container-type', 'size')) return;
  const measure = () => {
    container.style.setProperty('--jsw-cq-w', `${container.clientWidth}px`);
    container.style.setProperty('--jsw-cq-h', `${container.clientHeight}px`);
  };
  measure();
  if (window.ResizeObserver) new ResizeObserver(measure).observe(container);
  else window.addEventListener('resize', measure);
}

function decorateVisual(row) {
  row.className = 'jsw-hero-visual';
  containerUnits(row);
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

/**
 * muted looping background video, fetched after the page has loaded so the picture stays the
 * LCP; shown only once it actually plays (no file, an error or reduced motion: the picture stays)
 */
function addVideo(row) {
  if (!window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return;
  const video = document.createElement('video');
  video.className = 'jsw-hero-video';
  video.setAttribute('aria-hidden', 'true');
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.addEventListener('playing', () => row.classList.add('jsw-hero-has-video'), { once: true });
  video.addEventListener('error', () => video.remove(), { once: true });
  const glow = row.querySelector('.jsw-hero-glow');
  const start = () => {
    video.src = `${window.hlx?.codeBasePath || ''}/videos/jsw-hero.mp4`;
    if (glow) glow.before(video);
    else row.append(video);
    // older browsers return nothing from play()
    video.play()?.catch(() => {});
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
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
    // the JSW mark, traced from the Figma navbar: an oval ring crossed by a leaf (running out
    // at the top right) and, just below it, a band (running out at the bottom left)
    mark.innerHTML = '<svg viewBox="59.4 33.4 40.2 26" focusable="false" fill="currentColor">'
      + '<ellipse cx="79.4" cy="46.9" rx="18.7" ry="12.4" transform="rotate(-3 79.4 46.9)" fill="none" stroke="currentColor" stroke-width="2.2"/>'
      + '<path d="M68.4 50.4C70.2 46.6 74.8 44.2 80.5 42.2C86.5 39.8 92 36.6 97.6 33.2C93.4 37.6 88.6 42 83 45.2C78 48 73 50 68.4 50.4Z"/>'
      + '<path d="M60.3 58.4C64.5 55.4 69 53 73.5 51C81 47.6 88.5 43.4 95.6 39C96 39.8 96.5 40.8 96.9 41.8C89.5 46.6 82 50.8 74.5 54.4C69.5 56.6 64.5 58.2 60.3 58.4Z"/>'
      + '</svg>';
    const label = document.createElement('span');
    label.className = 'jsw-nav-brand-text';
    label.textContent = brand.textContent.trim();
    // "JSW MOTORS" is drawn as the frame's wordmark (no site font has its squared, extended
    // letters); the link's aria-label carries the name. Any other brand text stays text.
    if (label.textContent.toUpperCase() === 'JSW MOTORS') {
      label.classList.add('jsw-nav-wordmark');
      label.innerHTML = WORDMARK;
    }
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

/**
 * the SCROLL pill (mouse with an up/down arrow, as in the frames): a click glides to the next
 * stop like a wheel gesture (scripts/delayed.js answers the jsw:glide event), or, before that
 * script runs, scrolls smoothly to the next section
 */
function buildScrollIndicator() {
  const indicator = document.createElement('button');
  indicator.type = 'button';
  indicator.className = 'jsw-scroll';
  indicator.setAttribute('aria-label', 'Scroll to the next section');
  indicator.innerHTML = '<span class="jsw-scroll-label">'
    + '<svg class="jsw-scroll-mouse" viewBox="0 0 11 14" aria-hidden="true" focusable="false" fill="none" stroke="currentColor">'
    + '<rect x="0.75" y="0.75" width="9.5" height="12.5" rx="4.75" stroke-width="1.5"/>'
    + '<path d="M5.5 3.6V10.4M3.8 5.3 5.5 3.6 7.2 5.3M3.8 8.7 5.5 10.4 7.2 8.7" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/>'
    + '</svg>SCROLL</span>';
  indicator.addEventListener('click', () => {
    const glide = new CustomEvent('jsw:glide', { detail: 1, cancelable: true });
    if (!document.dispatchEvent(glide)) return;
    const next = [...document.querySelectorAll('main > .section')]
      .find((s) => s.offsetHeight > 5 && s.getBoundingClientRect().top > 2);
    next?.scrollIntoView({ behavior: 'smooth' });
  });
  return indicator;
}

/**
 * --jsw-fit on <html>: how much the page's fixed-size parts (navigation, copy, hotspots,
 * cards, footer) scale with very short or very large landscape screens, e.g. a browser zoomed
 * far in or out, so they keep their place beside the parts that scale with the screen
 * (videos, images). 1 on ordinary screens and on every portrait one.
 */
function trackFit() {
  const update = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    let fit = 1;
    if (w > h) {
      const grow = Math.min(h / 1200, w / 2133);
      fit = grow > 1 ? grow : Math.min(1, h / 640, w / 1000);
    }
    document.documentElement.style.setProperty('--jsw-fit', fit.toFixed(3));
  };
  window.addEventListener('resize', update);
  update();
}

/** keeps the fixed chrome in the theme of the section under it, the SCROLL button off the footer */
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
    // a section may tint the pill, e.g. jsw-blogs in its active post's colour
    const tone = under?.dataset.jswNavTone;
    if (tone) document.body.style.setProperty('--jsw-nav-tone', tone);
    else document.body.style.removeProperty('--jsw-nav-tone');
    document.body.toggleAttribute('data-jsw-nav-toned', Boolean(tone));
    if (indicator) {
      // shown on the hero (section 1) only: it steps aside once the page moves on from it.
      // Measured on the hero's section, which stays in its place: section 2's entrance
      // holds the hero's content on screen while the white card slides over it
      const block = document.querySelector('.jsw-hero');
      const hero = block?.closest('.section') || block;
      const heroBottom = hero ? hero.getBoundingClientRect().bottom : 0;
      indicator.classList.toggle('is-hidden', heroBottom < window.innerHeight * 0.75);
    }
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  // later sections set their theme once they are decorated
  new MutationObserver(schedule).observe(document.querySelector('main'), {
    subtree: true, attributes: true, attributeFilter: ['data-jsw-theme', 'data-jsw-nav-tone', 'data-section-status'],
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
  if (visualRow) addVideo(visualRow);
  // fixed page chrome: outside every section so no stacking context can trap it
  if (nav) document.body.append(nav);
  const indicator = buildScrollIndicator();
  document.body.append(indicator);
  trackPage(indicator);
  trackFit();
}
