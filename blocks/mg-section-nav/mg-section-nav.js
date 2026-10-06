const OPTION_CLASSES = [];

/**
 * Panels that get a segment: every main > .section except one holding only this nav,
 * plus the page footer, which is the final snap panel (as on the source site).
 */
function getSections(block) {
  const main = block.closest('main') || document.querySelector('main');
  if (!main) return [];
  const sections = [...main.querySelectorAll(':scope > .section')].filter((section) => {
    if (!section.contains(block)) return true;
    // Keep the host section only if it has other visible content besides the nav.
    return [...section.children]
      .some((child) => !child.contains(block) && child.textContent.trim());
  });
  const footer = document.querySelector('body > footer');
  if (footer) sections.push(footer);
  return sections;
}

function labelFor(section, index) {
  if (section.tagName === 'FOOTER') return `${index + 1}. Footer`;
  const named = section.dataset.name || section.getAttribute('aria-label');
  if (named) return named;
  const heading = section.querySelector('h1, h2, h3');
  const text = heading?.textContent.trim();
  return text ? `${index + 1}. ${text}` : `Section ${index + 1}`;
}

function sectionTheme(section) {
  if (section.classList.contains('light')) return 'light';
  if (section.classList.contains('dark')) return 'dark';
  return 'default';
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const active = [...block.classList].filter((c) => OPTION_CLASSES.includes(c));
  block.dataset.options = active.join(' ');

  // No authored content is required; anything authored is ignored.
  const nav = document.createElement('nav');
  nav.className = 'mg-section-nav-indicator';
  nav.setAttribute('aria-label', 'Page sections');
  const list = document.createElement('ol');
  list.className = 'mg-section-nav-segments';
  nav.append(list);
  block.replaceChildren(nav);

  const host = block.closest('.section');
  if (host) host.classList.add('mg-section-nav-host');

  let sections = [];
  let buttons = [];
  let observer;
  const crossing = new Map();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const setActive = (index) => {
    if (index < 0 || String(index) === block.dataset.activeSection) return;
    block.dataset.activeSection = index;
    block.dataset.sectionTheme = sections[index] ? sectionTheme(sections[index]) : 'default';
    buttons.forEach((btn, i) => {
      const isActive = i === index;
      btn.dataset.active = isActive ? 'true' : 'false';
      if (isActive) btn.setAttribute('aria-current', 'true');
      else btn.removeAttribute('aria-current');
    });
    sections.forEach((section, i) => {
      section.dataset.sectionActive = i === index ? 'true' : 'false';
    });
  };

  const build = () => {
    if (observer) observer.disconnect();
    crossing.clear();
    sections = getSections(block);
    block.dataset.sectionCount = sections.length;
    delete block.dataset.activeSection;

    buttons = sections.map((section, i) => {
      section.dataset.sectionIndex = i;
      const li = document.createElement('li');
      li.className = 'mg-section-nav-segment';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mg-section-nav-button';
      btn.dataset.targetSection = i;
      btn.dataset.active = 'false';
      btn.setAttribute('aria-label', `Go to ${labelFor(section, i)}`);
      btn.addEventListener('click', () => {
        section.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
        setActive(i);
      });
      li.append(btn);
      return li;
    });
    list.replaceChildren(...buttons);
    buttons = buttons.map((li) => li.querySelector('button'));
    block.dataset.empty = sections.length ? 'false' : 'true';

    if (!sections.length) return;
    if (!('IntersectionObserver' in window)) {
      setActive(0);
      return;
    }
    // Active section = the one crossing the viewport's horizontal middle line.
    // The root is a zero-height line, so intersectionRatio is always 0:
    // rely on isIntersecting instead.
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        crossing.set(entry.target, entry.isIntersecting);
      });
      setActive(sections.findIndex((section) => crossing.get(section)));
    }, { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
    sections.forEach((section) => observer.observe(section));
    setActive(0);
  };

  build();

  // Rebuild when sections are added/removed (e.g. while authoring in Universal Editor).
  const main = block.closest('main');
  if (main && 'MutationObserver' in window) {
    let pending;
    new MutationObserver((mutations) => {
      const changed = mutations.some((m) => [...m.addedNodes, ...m.removedNodes]
        .some((n) => n.nodeType === 1 && n.classList.contains('section')));
      if (!changed) return;
      clearTimeout(pending);
      pending = setTimeout(build, 100);
    }).observe(main, { childList: true });
  }

  block.dataset.ready = 'true';
}
