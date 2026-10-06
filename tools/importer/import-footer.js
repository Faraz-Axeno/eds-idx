/* eslint-disable */
/* global WebImporter */

/**
 * Footer fragment import for https://www.mgselect.co.in/
 * Produces content/footer.plain.html as flat, semantic sections
 * (no forms, classes or nested layout divs) — footer.js builds controls and layout.
 *
 * Sections:
 *   1. brand       — logo link
 *   2. newsletter  — title, input placeholder, submit label + icon, consent text, error text
 *   3. link groups — title + ul per column (4 columns)
 *   4. bottom bar  — copyright, legal links list, social icon list
 */

const ICONS = {
  instagram: { src: 'images/icon-instagram.svg', alt: 'Instagram' },
  x: { src: 'images/icon-x-twitter.svg', alt: 'X (Twitter)' },
  linkedin: { src: 'images/icon-linkedin.svg', alt: 'LinkedIn' },
};

function text(el) {
  return (el?.textContent || '').replace(/\s+/g, ' ').trim();
}

function link(document, a, label) {
  const out = document.createElement('a');
  out.href = a.getAttribute('href');
  out.textContent = label || text(a);
  return out;
}

function img(document, src, alt) {
  const i = document.createElement('img');
  i.src = src;
  i.alt = alt;
  return i;
}

function para(document, ...children) {
  const p = document.createElement('p');
  children.forEach((c) => p.append(typeof c === 'string' ? document.createTextNode(c) : c));
  return p;
}

function list(document, items) {
  const ul = document.createElement('ul');
  items.forEach((child) => {
    const li = document.createElement('li');
    li.append(child);
    ul.append(li);
  });
  return ul;
}

export default {
  transform: ({ document, params }) => {
    const footer = document.querySelector('footer.mg-select__footer');
    const main = document.createElement('div');
    const sections = [];
    const section = () => { const s = document.createElement('div'); sections.push(s); return s; };

    // 1. brand: logo image, then the home link (blocks/footer wraps the logo in it).
    // Kept apart because in xwalk a link-only paragraph becomes a Button and drops the image.
    const logoLink = footer.querySelector('.footer__logo a');
    const logoAlt = footer.querySelector('.footer__logo img')?.alt || 'MG Select';
    const s1 = section();
    const logoA = document.createElement('a');
    logoA.href = logoLink?.getAttribute('href') || '/';
    logoA.textContent = logoAlt;
    s1.append(para(document, img(document, 'images/mg-select-logo-light.png', logoAlt)), para(document, logoA));

    // 2. newsletter (text only — footer.js builds the form)
    const nl = footer.querySelector('.newsletter__form');
    const s2 = section();
    // headings are emitted as <p><strong> (the pipeline adds ids to h-tags); footer.js promotes them
    const nlTitle = document.createElement('strong');
    nlTitle.textContent = text(nl.querySelector('.newsletter__form--heading'));
    s2.append(para(document, nlTitle));
    s2.append(para(document, nl.querySelector('input[type=email]').getAttribute('placeholder')));
    s2.append(para(document, text(nl.querySelector('.newsletter__form-submit')), ' ', img(document, 'images/icon-arrow-diagonal.svg', '')));
    const consent = nl.querySelector('.newsletter__form-label');
    const consentLink = consent.querySelector('a');
    const consentLead = text(consent).replace(text(consentLink), '').trim();
    s2.append(para(document, `${consentLead} `, link(document, consentLink)));
    s2.append(para(document, 'Enter email address'));

    // 3. link groups
    const s3 = section();
    footer.querySelectorAll('.footer__navigation--content').forEach((content) => {
      const col = content.parentElement;
      const title = document.createElement('strong');
      title.textContent = text(col.firstElementChild);
      s3.append(para(document, title));
      s3.append(list(document, [...content.querySelectorAll('a')].map((a) => link(document, a))));
    });

    // 4. bottom bar
    const s4 = section();
    const legal = footer.querySelector('.footer__legal');
    s4.append(para(document, text(legal.firstElementChild)));
    s4.append(list(document, [...legal.querySelectorAll(':scope > a')].map((a) => link(document, a))));
    const social = [...footer.querySelectorAll('.footer__social a')].map((a) => {
      const key = (a.querySelector('use')?.getAttribute('xlink:href') || '').split('#').pop();
      const icon = ICONS[key] || { src: `images/icon-${key}.svg`, alt: key };
      const out = document.createElement('a');
      out.href = a.getAttribute('href');
      out.append(img(document, icon.src, icon.alt));
      return out;
    });
    s4.append(list(document, social));

    sections.forEach((s, i) => {
      if (i) main.append(document.createElement('hr'));
      main.append(...s.childNodes);
    });

    return [{
      element: main,
      path: '/footer',
      report: { title: 'footer', sections: sections.length },
    }];
  },
};
