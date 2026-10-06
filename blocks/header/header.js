// desktop breakpoint: tabbed two-column menu card; below it the menu is a full-screen accordion
const isDesktop = window.matchMedia('(width >= 900px)');
let uid = 0;
const nextId = (prefix) => {
  uid += 1;
  return `${prefix}-${uid}`;
};

/**
 * Fetches the nav fragment and rebases relative media to the fragment location.
 * @returns {Promise<Element[]|null>} the fragment's top-level sections
 */
async function fetchNavSections() {
  // metadata-independent: /content first (localhost / aem up), then site root (DA/EDS)
  let base = '/content/nav.plain.html';
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) {
    base = '/nav.plain.html';
    resp = await fetch('/nav.plain.html');
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
    if (v !== undefined && v !== null && v !== false) node.setAttribute(k, v === true ? '' : v);
  });
  node.append(...children.filter((c) => c !== null && c !== undefined && c !== false));
  return node;
}

/** diagonal arrow drawn with CSS (UI chrome) */
const arrow = () => el('span', { class: 'header-arrow', 'aria-hidden': 'true' });

/** plus / minus glyph (UI chrome) */
const plus = () => el('span', { class: 'header-plus', 'aria-hidden': 'true' });

function buildBrand(section) {
  const brand = el('div', { class: 'header-brand' });
  const links = [...section.querySelectorAll('a')];
  if (!links.length) return brand;
  const link = el('a', { href: links[0].getAttribute('href'), class: 'header-brand-link' });
  const [light, dark] = links.map((a) => a.querySelector('img')).filter(Boolean);
  if (light) {
    light.classList.add('header-logo', 'header-logo-light');
    light.loading = 'eager';
    link.append(light);
    link.setAttribute('aria-label', light.alt);
  }
  if (dark) {
    dark.classList.add('header-logo', 'header-logo-dark');
    dark.alt = '';
    link.append(dark);
  }
  brand.append(link);
  return brand;
}

function buildTools(section) {
  const tools = el('div', { class: 'header-tools' });
  section?.querySelectorAll('a').forEach((a) => {
    a.classList.add('header-tool');
    const img = a.querySelector('img');
    if (img) {
      img.alt = '';
      img.classList.add('header-tool-icon');
    }
    const label = el('span', { class: 'header-tool-label' }, a.textContent.trim());
    [...a.childNodes].forEach((n) => { if (n.nodeType === Node.TEXT_NODE) n.remove(); });
    a.append(label);
    tools.append(a);
  });
  return tools;
}

/** link with mono label + diagonal arrow */
function actionLink(a, className) {
  const out = el('a', { href: a.getAttribute('href'), class: className });
  out.append(el('span', { class: 'header-link-label' }, a.textContent.trim()), arrow());
  return out;
}

/**
 * Reads one category <li> from the fragment.
 * @returns {{ title, subtitle, href, description, primary, links, image }}
 */
function readCategory(li) {
  const paras = [...li.querySelectorAll(':scope > p')];
  const titleP = paras.find((p) => p.querySelector(':scope > strong') && !p.querySelector('a'));
  const direct = !titleP ? paras.find((p) => p.querySelector(':scope > a') && !p.querySelector('img')) : null;
  return {
    title: (titleP || direct)?.textContent.trim() || '',
    href: direct?.querySelector('a').getAttribute('href') || null,
    subtitle: paras.find((p) => p.querySelector(':scope > em'))?.textContent.trim() || null,
    description: paras.find((p) => !p.querySelector('strong, em, a, img') && p.textContent.trim())?.textContent.trim() || null,
    primary: paras.find((p) => p.querySelector(':scope > strong > a'))?.querySelector('a') || null,
    links: [...(li.querySelector(':scope > ul')?.querySelectorAll('a') || [])],
    image: paras.find((p) => p.querySelector('img'))?.querySelector('a') || null,
  };
}

function buildDetail(cat, id) {
  const detail = el('div', {
    class: 'header-detail', id, role: 'region', hidden: true,
  });
  const text = el('div', { class: 'header-detail-text' });
  if (cat.subtitle || cat.description || cat.primary) {
    text.append(el('p', { class: 'header-detail-title' }, cat.title));
  }
  if (cat.description) text.append(el('p', { class: 'header-detail-description' }, cat.description));
  if (cat.primary) text.append(actionLink(cat.primary, 'header-detail-primary'));
  if (cat.links.length) {
    text.append(el('ul', { class: 'header-detail-links' }, ...cat.links.map((a) => el('li', {}, actionLink(a, 'header-detail-link')))));
  }
  detail.append(text);
  if (cat.image) {
    const img = cat.image.querySelector('img');
    img.loading = 'lazy';
    const media = el('a', { href: cat.image.getAttribute('href'), class: 'header-detail-media', tabindex: '-1' }, img.closest('picture') || img);
    detail.append(media);
  }
  return detail;
}

function selectCategory(panel, index) {
  panel.querySelectorAll('.header-category-button').forEach((btn, i) => {
    btn.setAttribute('aria-expanded', i === index ? 'true' : 'false');
  });
  panel.querySelectorAll('.header-detail').forEach((d, i) => {
    d.hidden = i !== index;
  });
}

/** mobile: details sit under their category (accordion); desktop: shared right column */
function placeDetails(panel) {
  const details = panel.querySelector('.header-details');
  panel.querySelectorAll('.header-category[data-detail-index]').forEach((item) => {
    const detail = panel.querySelector(`#${item.querySelector('.header-category-button').getAttribute('aria-controls')}`);
    if (!detail) return;
    if (isDesktop.matches) details.append(detail);
    else item.append(detail);
  });
}

function buildTabPanel(section, tabId, panelId, label, onBack) {
  const panel = el('div', {
    class: 'header-tabpanel', id: panelId, role: 'tabpanel', 'aria-labelledby': tabId, hidden: true,
  });
  // mobile sub-page header: back arrow + page name
  const back = el('button', { type: 'button', class: 'header-back', 'aria-label': `Back from ${label}` });
  back.addEventListener('click', onBack);
  const head = el('div', { class: 'header-tabpanel-head' }, back, el('p', { class: 'header-tabpanel-title' }, label));
  const categories = el('ul', { class: 'header-categories' });
  const details = el('div', { class: 'header-details' });
  const items = [...(section.querySelector(':scope > ul')?.children || [])];
  let detailIndex = 0;
  items.forEach((li) => {
    const cat = readCategory(li);
    const item = el('li', { class: 'header-category' });
    if (cat.href) {
      item.append(el('a', { href: cat.href, class: 'header-category-link' }, el('span', { class: 'header-category-title' }, cat.title), arrow()));
      categories.append(item);
      return;
    }
    const detailId = nextId('header-detail');
    const index = detailIndex;
    detailIndex += 1;
    const btn = el('button', {
      type: 'button', class: 'header-category-button', 'aria-expanded': 'false', 'aria-controls': detailId,
    }, el('span', { class: 'header-category-title' }, cat.title, cat.subtitle ? null : plus()));
    if (cat.subtitle) btn.append(el('span', { class: 'header-category-subtitle' }, cat.subtitle));
    btn.addEventListener('click', () => {
      if (isDesktop.matches) {
        selectCategory(panel, index);
        return;
      }
      // mobile: multi-expand accordion
      const expand = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', expand ? 'true' : 'false');
      panel.querySelector(`#${detailId}`).hidden = !expand;
    });
    item.append(btn);
    categories.append(item);
    details.append(buildDetail(cat, detailId));
    item.dataset.detailIndex = index;
  });
  panel.append(head, categories, details, el('div', { class: 'header-tabpanel-footer' }));
  selectCategory(panel, 0);
  placeDetails(panel);
  return panel;
}

function selectTab(menu, index) {
  menu.querySelectorAll('[role="tab"]').forEach((tab, i) => {
    tab.setAttribute('aria-selected', i === index ? 'true' : 'false');
    tab.tabIndex = i === index ? 0 : -1;
  });
  menu.querySelectorAll('[role="tabpanel"]').forEach((p, i) => {
    p.hidden = i !== index;
  });
}

function buildMenu(tabSections, menuId) {
  const menu = el('div', { class: 'header-menu', id: menuId });
  const tablist = el('div', { class: 'header-tabs', role: 'tablist' });
  const panels = el('div', { class: 'header-tabpanels' });
  tabSections.forEach((section, i) => {
    const label = section.querySelector(':scope > p')?.textContent.trim() || '';
    const tabId = nextId('header-tab');
    const panelId = nextId('header-tabpanel');
    const tab = el('button', {
      type: 'button', role: 'tab', id: tabId, class: 'header-tab', 'aria-controls': panelId, 'aria-selected': 'false',
    }, el('span', { class: 'header-tab-label' }, label), el('span', { class: 'header-chevron', 'aria-hidden': 'true' }));
    tab.addEventListener('click', () => {
      selectTab(menu, i);
      // mobile: the tab's page slides in over the list
      if (!isDesktop.matches) document.getElementById(panelId).dataset.mobileOpen = 'true';
    });
    tab.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const tabs = [...tablist.children];
      const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      selectTab(menu, next);
      tabs[next].focus();
    });
    tablist.append(tab);
    panels.append(buildTabPanel(section, tabId, panelId, label, () => {
      delete document.getElementById(panelId).dataset.mobileOpen;
      tab.focus();
    }));
  });
  menu.append(tablist, panels);
  selectTab(menu, 0);
  return menu;
}

/** header theme follows the panel in view: section metadata "header" = light | dark | hidden */
function watchTheme(block) {
  const targets = [...document.querySelectorAll('main > .section')];
  const themeOf = (t) => t.dataset.header || 'dark';
  const footer = document.querySelector('body > footer');
  const apply = () => {
    // the footer is the final snap panel: once it fills the lower part of the viewport, hide
    if (footer && footer.getBoundingClientRect().top < window.innerHeight * 0.6) {
      block.dataset.theme = 'hidden';
      return;
    }
    const probe = window.innerHeight * 0.1;
    const active = targets.find((t) => {
      const r = t.getBoundingClientRect();
      return r.height > 0 && r.top <= probe && r.bottom > probe;
    });
    block.dataset.theme = active ? themeOf(active) : 'dark';
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(apply, { rootMargin: '-10% 0px -89% 0px' });
    [...targets, footer].filter(Boolean).forEach((t) => io.observe(t));
  }
  window.addEventListener('scroll', apply, { passive: true });
  apply();
  // sections finish loading after the header; re-evaluate once they have, and whenever a
  // block switches its section's header theme (mg-vehicles night view -> light header)
  new MutationObserver(apply).observe(document.querySelector('main'), { attributes: true, subtree: true, attributeFilter: ['data-section-status', 'data-header'] });
}

/**
 * loads and decorates the header
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const sections = await fetchNavSections();
  if (!sections) return;
  const [brandSection, toolsSection, ...tabSections] = sections;
  const menuId = nextId('header-menu');

  const hamburger = el('button', {
    type: 'button',
    class: 'header-hamburger',
    'aria-expanded': 'false',
    'aria-controls': menuId,
    'aria-label': 'Open Menu',
    title: 'Open Menu',
  }, el('span', { class: 'header-stroke header-stroke-top' }), el('span', { class: 'header-stroke header-stroke-bottom' }));

  const bar = el(
    'nav',
    { class: 'header-bar', 'aria-label': 'Main' },
    buildBrand(brandSection),
    buildTools(toolsSection),
    el('div', { class: 'header-hamburger-wrap' }, hamburger),
  );
  const closeLayer = el('div', { class: 'header-close-layer', 'aria-hidden': 'true' });
  const menu = buildMenu(tabSections, menuId);
  // mobile sub-page footer repeats the bar tools (showroom locator)
  const tools = bar.querySelector('.header-tools');
  menu.querySelectorAll('.header-tabpanel-footer').forEach((footerEl) => {
    footerEl.append(...[...tools.children].map((n) => n.cloneNode(true)));
  });
  const resetMobile = () => menu.querySelectorAll('[data-mobile-open]').forEach((p) => { delete p.dataset.mobileOpen; });

  const setOpen = (open) => {
    block.classList.toggle('is-open', open);
    hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
    const label = open ? 'Close Menu' : 'Open Menu';
    hamburger.setAttribute('aria-label', label);
    hamburger.title = label;
    document.body.classList.toggle('header-menu-open', open && !isDesktop.matches);
    if (!open) resetMobile();
  };
  hamburger.addEventListener('click', () => setOpen(!block.classList.contains('is-open')));
  closeLayer.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && block.classList.contains('is-open')) {
      setOpen(false);
      hamburger.focus();
    }
  });
  // crossing the desktop breakpoint resets to a closed menu with the first category selected
  isDesktop.addEventListener('change', () => {
    setOpen(false);
    menu.querySelectorAll('.header-tabpanel').forEach((p) => {
      selectCategory(p, 0);
      placeDetails(p);
    });
  });

  block.replaceChildren(bar, closeLayer, menu);
  watchTheme(block);
}
