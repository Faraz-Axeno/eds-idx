/* eslint-disable */
/* global WebImporter */

/**
 * Nav fragment import for https://www.mgselect.co.in/
 * Produces content/nav.plain.html as flat, semantic sections (no forms, classes,
 * ids or nested layout divs) — blocks/header builds the bar, tabs and panels.
 *
 * Sections:
 *   1. brand  — logo link with light + dark logo variants
 *   2. tools  — header-bar links shown while the menu is open (showroom locator)
 *   3..n      — one section per menu tab:
 *                 <p><strong>Tab label</strong></p>
 *                 <ul> one <li> per left-column category:
 *                   <p><strong>Category</strong></p>        (or a plain link for direct categories)
 *                   <p><em>subtitle</em></p>                (optional, e.g. price)
 *                   <p>description</p>                      (optional)
 *                   <p><strong><a>primary CTA</a></strong></p> (optional)
 *                   <ul><li><a>action link</a></li>…</ul>
 *                   <p><a><img featured image></a></p>      (optional)
 */

const IMAGES = {
  'mg-select-final-logo-light': 'images/mg-select-logo-light-header.png',
  'mg-select-final-logo-dark': 'images/mg-select-logo-dark-header.png',
  'cybie-header': 'images/nav-cyberster.png',
  'm9-burger-menu': 'images/nav-m9.png',
  location: 'images/icon-location.png',
};

function text(el) {
  return (el?.textContent || '').replace(/\s+/g, ' ').trim();
}

function localImage(document, srcImg) {
  const src = srcImg.getAttribute('src') || '';
  const key = src.split('?')[0].split('/').pop();
  const img = document.createElement('img');
  img.src = IMAGES[key] || src;
  img.alt = srcImg.getAttribute('alt') || '';
  return img;
}

function el(document, tag, ...children) {
  const node = document.createElement(tag);
  children.filter(Boolean).forEach((c) => node.append(typeof c === 'string' ? document.createTextNode(c) : c));
  return node;
}

function link(document, a, label) {
  const out = document.createElement('a');
  out.href = a.getAttribute('href');
  out.textContent = label || text(a.querySelector('.cta-section__label') || a);
  return out;
}

export default {
  transform: ({ document }) => {
    const header = document.querySelector('.header-section');
    const main = document.createElement('div');
    const sections = [];

    // 1. brand
    const brand = [];
    header.querySelectorAll('.header__logo a').forEach((a) => {
      const img = a.querySelector('img');
      const out = document.createElement('a');
      out.href = a.getAttribute('href') || '/';
      out.append(localImage(document, img));
      brand.push(el(document, 'p', out));
    });
    sections.push(brand);

    // 2. tools
    const tools = [];
    header.querySelectorAll('.header__user__info a').forEach((a) => {
      const out = link(document, a);
      const icon = header.querySelector('.header__user__info img');
      if (icon) out.prepend(localImage(document, icon), ' ');
      tools.push(el(document, 'p', out));
    });
    sections.push(tools);

    // 3..n tabs
    const tabs = [...header.querySelectorAll('.header__main--tab')];
    const pages = [...header.querySelectorAll('.header__main__border-container')];
    tabs.forEach((tab, i) => {
      const page = pages[i];
      const nodes = [el(document, 'p', el(document, 'strong', text(tab)))];
      const list = document.createElement('ul');
      const items = [...page.querySelectorAll('.header__main--left .header__accordion--menu > li')];
      const details = [...page.querySelectorAll('.header__main--right .header__accordion--menu-display-item')];
      items.forEach((item, j) => {
        const li = document.createElement('li');
        const title = text(item.querySelector('h3, .header__accordion-tab-name')) || text(item);
        const detail = details[j];
        const directLink = !detail && item.querySelector('a[href]');
        if (directLink) {
          const a = document.createElement('a');
          a.href = directLink.getAttribute('href');
          a.textContent = title;
          li.append(el(document, 'p', a));
          list.append(li);
          return;
        }
        li.append(el(document, 'p', el(document, 'strong', title)));
        const sub = item.querySelector('p');
        if (sub && text(sub)) li.append(el(document, 'p', el(document, 'em', text(sub))));
        if (detail) {
          const desc = detail.querySelector('.header__main--text > p');
          if (desc && text(desc)) li.append(el(document, 'p', text(desc)));
          const primary = detail.querySelector('.header__main--cta-group a');
          if (primary) li.append(el(document, 'p', el(document, 'strong', link(document, primary))));
          const actions = [...detail.querySelectorAll('.link-list a, :scope > ul a')].filter((a) => !a.closest('.header__main--cta-group'));
          const seen = new Set();
          const ul = document.createElement('ul');
          actions.forEach((a) => {
            const key = `${a.getAttribute('href')}|${text(a)}`;
            if (seen.has(key) || !text(a)) return;
            seen.add(key);
            ul.append(el(document, 'li', link(document, a)));
          });
          if (ul.children.length) li.append(ul);
          const imgLink = detail.querySelector('a.header__content--image');
          if (imgLink && imgLink.querySelector('img')) {
            const a = document.createElement('a');
            a.href = imgLink.getAttribute('href');
            a.append(localImage(document, imgLink.querySelector('img')));
            li.append(el(document, 'p', a));
          }
        }
        list.append(li);
      });
      nodes.push(list);
      sections.push(nodes);
    });

    sections.forEach((nodes, i) => {
      if (i) main.append(document.createElement('hr'));
      main.append(...nodes);
    });

    return [{
      element: main,
      path: '/nav',
      report: { title: 'nav', sections: sections.length },
    }];
  },
};
