// Spec Table "Showcase" in a Light section (Code T specs)

import { inEditor } from '../../scripts/utils/common.js';
import decorateBrochure from '../../scripts/utils/brochure.js';

// a paragraph holding only pictures (and spaces)
const pictureOnly = (p) => !!p.querySelector('picture, img') && !p.textContent.trim();

// an image whose asset was removed: the backend delivers <img src="about:error">
const emptyPicture = (p) => {
  const src = p?.querySelector('img')?.getAttribute('src') || '';
  return !src || src.startsWith('about:');
};

/**
 * Sets a car's proportions (--car1-ar / --car2-ar) from its image.
 * @param {Element} section
 * @param {Element} p the car's paragraph
 * @param {number} n 1 or 2
 */
function carRatio(section, p, n) {
  const img = p.querySelector('img');
  if (!img) return;
  const set = (w, h) => {
    if (w > 0 && h > 0) section.style.setProperty(`--car${n}-ar`, (w / h).toFixed(4));
  };
  set(Number(img.getAttribute('width')), Number(img.getAttribute('height')));
  const loaded = () => set(img.naturalWidth, img.naturalHeight);
  if (img.complete) loaded();
  else img.addEventListener('load', loaded, { once: true });
}

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

// the prototype's eases (GSAP power2.in, power2.inOut, power3.out)
const EASE = {
  in: (t) => t ** 3,
  inOut: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - ((2 - 2 * t) ** 3) / 2),
  out: (t) => 1 - (1 - t) ** 4,
};
// reveal length in prototype timeline units
const TIMELINE = 1.36;
// how long .specs-arrive stays on: past the dimension lines' fade-in (spec-table-showcase.css)
const ARRIVE_MS = 2000;
// the gesture from the heading and the cars to the final view plays the reveal over this long
const REVEAL_MS = 1200;

/**
 * Scroll-driven reveal (prototype .fold--specs); not in Universal Editor or reduced motion.
 * @param {Element} section
 */
function wireReveal(section) {
  if (inEditor() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const first = section.querySelector(':scope > .default-content-wrapper');
  const last = section.querySelector(':scope > .default-content-wrapper:last-child');
  const tables = [...section.querySelectorAll(':scope > .spec-table-wrapper')];
  if (!first || !last || first === last || !tables.length) return;

  const inFirst = (selector) => [...first.querySelectorAll(`:scope > ${selector}`)];
  const marks = inFirst('p')
    .filter((p) => !p.matches('.specs-car, .specs-dims') && !p.querySelector('picture, img'));
  // a group: the label closing the content before its table, and the table
  const groups = tables.map((wrapper) => [
    wrapper.previousElementSibling?.querySelector(':scope > h3:last-child'),
    wrapper.querySelector(':scope > .spec-table'),
  ]);
  const later = [
    last.querySelector(':scope > h2'),
    last.querySelector(':scope > p:not(:has(a))'),
    last.querySelector(':scope > p:has(> a:only-child)'),
  ];
  const [title, label, cta] = later;
  const links = last.querySelector(':scope > p:has(> a + a)');

  const narrow = window.matchMedia('(width < 900px)');
  const rise = (from) => () => [from, 0];
  // desktop: 300 design px (1280 × 720) scaled to the screen, plus 60
  const carRise = (h) => (narrow.matches
    ? h / 2
    : 300 * Math.min(window.innerWidth / 1280, h / 720) + 60);
  // two cars: rise and shrink to above the groups (prototype specsCar)
  const twoCars = section.classList.contains('specs-two-cars');
  const stacked = window.matchMedia('(width < 768px)');
  const pairs = inFirst('.specs-car').map((car) => [car, car.nextElementSibling?.matches('.specs-dims')
    ? car.nextElementSibling : null]);
  const carsEnd = (h) => {
    const cars = pairs.map(([car]) => car);
    const top = Math.min(...cars.map((car) => car.offsetTop));
    const height = Math.max(...cars.map((car) => car.offsetTop + car.offsetHeight)) - top;
    const left = Math.min(...cars.map((car) => car.offsetLeft));
    const middle = (left + Math.max(...cars.map((car) => car.offsetLeft + car.offsetWidth))) / 2;
    const end = stacked.matches ? 72 : 64;
    const limit = (first.querySelector(':scope > h3')?.offsetTop ?? h) - 32;
    return {
      top, middle, end, scale: Math.min(1, (limit - end) / height),
    };
  };
  const carTracks = twoCars
    ? pairs.map((els) => ({
      els,
      at: 0,
      dur: 1,
      ease: EASE.inOut,
      x: () => {
        const { middle, scale } = carsEnd();
        const centre = els[0].offsetLeft + els[0].offsetWidth / 2;
        return [0, (centre - middle) * (scale - 1)];
      },
      y: (h) => {
        const { top, end, scale } = carsEnd(h);
        const centre = els[0].offsetTop + els[0].offsetHeight / 2;
        return [0, end + (centre - top) * scale - centre];
      },
      scale: (h) => [1, carsEnd(h).scale],
    })).concat({
      // the dimension lines: kept on desktop, faded out on phones as the pair shrinks
      els: inFirst('.specs-dims'),
      at: 0.2,
      dur: 0.4,
      ease: EASE.in,
      fade: () => [1, stacked.matches ? 0 : 1],
    })
    : [{
      els: inFirst(':is(.specs-car, .specs-dims)'),
      at: 0,
      dur: 1,
      ease: EASE.inOut,
      y: (h) => [0, -carRise(h)],
      scale: (h) => [1, narrow.matches && h <= 720 ? 0.85 : 1],
    }];
  const tracks = [
    ...carTracks,
    {
      els: inFirst('.specs-dims-phone'), at: 0, dur: 0.4, ease: EASE.in, fade: [1, 0],
    },
    {
      els: [inFirst('h2')[0], ...marks], at: 0.1, dur: 0.5, ease: EASE.in, y: () => [0, -60], fade: [1, 0],
    },
    ...groups.map((els, i) => ({
      els, at: 0.45 + i * 0.1, dur: 0.5, ease: EASE.out, y: rise(70), fade: [0, 1],
    })),
    {
      els: [title], at: 0.75, dur: 0.5, ease: EASE.out, y: rise(50), fade: [0, 1],
    },
    {
      els: [label], at: 0.92, dur: 0.4, ease: EASE.out, y: rise(30), fade: [0, 1],
    },
    // the links show on their own (spec-table-showcase.css): they only travel with their label
    {
      els: [links], at: 0.92, dur: 0.4, ease: EASE.out, y: rise(30),
    },
    {
      els: [cta], at: 0.96, dur: 0.4, ease: EASE.out, y: rise(30), fade: [0, 1],
    },
  ];

  // the brochure popup closes as its button fades, or it would float over the reveal
  const closeBrochure = () => {
    if (!last.classList.contains('is-open')) return;
    last.classList.remove('is-open');
    last.querySelector('.brochure-toggle')?.setAttribute('aria-expanded', 'false');
  };

  // only changed styles are written
  const written = new Map();
  // under 500px tall the section is a plain stack (spec-table-showcase.css): nothing plays there
  const pinned = window.matchMedia('(height >= 500px)');
  const runway = () => {
    // the layers' height (100svh), as the snap measures the runway: not innerHeight, which
    // changes with a phone's toolbars and moved the reveal
    const total = section.offsetHeight - first.offsetHeight;
    const p = total > 0 ? clamp(-section.getBoundingClientRect().top / total, 0, 1) : 0;
    return { total, p };
  };
  // with the snap engine the reveal is two steps (stepped below), played on its own: the
  // heading and the cars, then one gesture plays it to the end; without it the scroll scrubs it
  let stepped = true;
  let shown = 0;
  let frame = 0;
  const render = () => {
    frame = 0;
    if (!pinned.matches) {
      written.forEach((style, el) => Object.keys(style).forEach((prop) => { el.style[prop] = ''; }));
      written.clear();
      return;
    }
    const h = first.offsetHeight;
    const t = (stepped ? shown : runway().p) * TIMELINE;
    const styles = new Map();
    tracks.forEach((track) => {
      const k = track.ease(clamp((t - track.at) / track.dur, 0, 1));
      if (track.els[0] === label && k < 1) closeBrochure();
      const at = ([from, to]) => from + (to - from) * k;
      track.els.filter(Boolean).forEach((el) => {
        const style = styles.get(el) || {};
        if (track.y) {
          style.translate = `${track.x ? at(track.x(h)).toFixed(1) : 0}px ${at(track.y(h)).toFixed(1)}px`;
        }
        if (track.scale) style.scale = at(track.scale(h)).toFixed(4);
        if (track.fade) {
          const o = at(typeof track.fade === 'function' ? track.fade() : track.fade);
          // never exactly 0: iOS Safari stops repainting a layer that reaches opacity 0 and
          // keeps showing the frame before it (a ghost behind the groups); 0.001 draws nothing
          style.opacity = Math.max(o, 0.001).toFixed(3);
          // still read by screen readers; only not clickable while mostly faded
          style.pointerEvents = o < 0.5 ? 'none' : '';
        }
        styles.set(el, style);
      });
    });
    styles.forEach((style, el) => {
      const before = written.get(el) || {};
      Object.entries(style).forEach(([prop, value]) => {
        if (before[prop] !== value) el.style[prop] = value;
      });
      written.set(el, style);
    });
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(render);
  };

  // the two steps: 0 the heading and the cars, 1 the final view; a gesture plays from one to
  // the other (the tracks keep their own eases), and from the final view the page moves on
  let target = 0;
  let tween = 0;
  const playTo = (to) => {
    cancelAnimationFrame(tween);
    target = to;
    const from = shown;
    const ms = REVEAL_MS * Math.abs(to - from);
    const start = performance.now();
    const tick = (now) => {
      const k = ms ? Math.min(1, (now - start) / ms) : 1;
      shown = from + (to - from) * k;
      render();
      tween = k < 1 ? requestAnimationFrame(tick) : 0;
    };
    tween = requestAnimationFrame(tick);
  };
  const jumpTo = (to) => {
    cancelAnimationFrame(tween);
    tween = 0;
    target = to;
    shown = to;
    schedule();
  };
  const stepper = {
    canScrollDown: () => pinned.matches && target < 1,
    canScrollUp: () => pinned.matches && target > 0,
    scrollDown: () => playTo(1),
    scrollUp: () => playTo(0),
    isBusy: () => tween !== 0,
    destroy: () => cancelAnimationFrame(tween),
  };

  // keyboard focus on a later part plays the reveal to its end
  section.addEventListener('focusin', (e) => {
    if (!pinned.matches || ![...later, links].some((el) => el?.contains(e.target))) return;
    if (stepped) {
      if (target < 1) playTo(1);
      return;
    }
    setTimeout(() => {
      const end = section.offsetTop + runway().total;
      if (Math.abs(window.scrollY - end) >= 1) window.scrollTo(0, end);
    }, 0);
  });

  window.addEventListener('scroll', schedule, { passive: true });
  document.addEventListener('snap:start', ({ detail }) => {
    if (detail?.from === section) closeBrochure();
  });

  // arriving from above: dimension lines fade in after the car
  let arriveTimer;
  document.addEventListener('snap:start', ({ detail: { from, to } }) => {
    if (to !== section || !from?.compareDocumentPosition) return;
    // eslint-disable-next-line no-bitwise
    const fromAbove = !!(from.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING);
    // stepped: from above it opens on the heading and the cars, from below on the final view
    if (stepped) jumpTo(fromAbove ? 0 : 1);
    if (!fromAbove || !pinned.matches) return;
    clearTimeout(arriveTimer);
    section.classList.remove('specs-arrive');
    requestAnimationFrame(() => section.classList.add('specs-arrive'));
    arriveTimer = setTimeout(() => section.classList.remove('specs-arrive'), ARRIVE_MS);
  });

  // one screen, stepped by the snap engine; registered at once and kept only if the engine
  // starts (`snap-active`, set before `snap-settled`), else the section is the scroll runway
  section.classList.add('specs-scrub', 'specs-stepped');
  const snap = import('../../scripts/section-snap.js').then((mod) => {
    mod.registerBlockScroll(section, stepper);
    return mod;
  });
  const root = document.documentElement;
  const decide = () => {
    if (!root.classList.contains('snap-settled')) return false;
    if (!root.classList.contains('snap-active')) {
      stepped = false;
      stepper.destroy();
      section.classList.remove('specs-stepped');
      section.classList.add('scroll-runway', 'runway-stop');
      snap.then((mod) => mod.unregisterBlockScroll(section)).catch(() => {});
      schedule();
    }
    return true;
  };
  if (!decide()) {
    const watch = new MutationObserver(() => { if (decide()) watch.disconnect(); });
    watch.observe(root, { attributes: true, attributeFilter: ['class'] });
  }
  window.addEventListener('resize', schedule, { passive: true });
  pinned.addEventListener('change', schedule);
  render();
}

/**
 * Inlines an SVG drawing so it uses the page's font and styles.
 * @param {Element} p the drawing's paragraph
 */
async function inlineDrawing(p) {
  const img = p?.querySelector('img');
  const src = img?.currentSrc || img?.src;
  if (!src || !/\.svg$/i.test(new URL(src, window.location.href).pathname)) return;
  try {
    const resp = await fetch(src);
    if (!resp.ok || !resp.headers.get('content-type')?.includes('svg')) return;
    const doc = new DOMParser().parseFromString(await resp.text(), 'image/svg+xml');
    const svg = doc.documentElement;
    if (svg.localName !== 'svg' || doc.querySelector('parsererror') || !svg.getAttribute('viewBox')) return;
    svg.querySelectorAll('script, style, foreignObject, a, image, use').forEach((n) => n.remove());
    [svg, ...svg.querySelectorAll('*')].forEach((el) => {
      [...el.attributes]
        .filter(({ name }) => /^on/i.test(name) || ['class', 'id', 'style', 'href', 'xlink:href'].includes(name))
        .forEach(({ name }) => el.removeAttribute(name));
    });
    svg.classList.add('specs-drawing');
    if (img.alt) {
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', img.alt);
    } else {
      svg.setAttribute('aria-hidden', 'true');
    }
    svg.setAttribute('focusable', 'false');
    (img.closest('picture') || img).replaceWith(document.importNode(svg, true));
  } catch {
    // the image stays
  }
}

/**
 * Sets up a Showcase section once: car and drawing classes, brochure, reveal.
 * @param {Element} section
 */
export default function decorateShowcase(section) {
  if (section.dataset.specsDrawing) return;
  section.dataset.specsDrawing = 'true';
  const wrapper = section.querySelector(':scope > .default-content-wrapper');
  if (!wrapper) return;
  const editing = !!document.querySelector('[data-aue-resource]');
  const paragraphs = () => [...wrapper.querySelectorAll(':scope > p')];
  if (!editing) {
    // one paragraph per image
    paragraphs().filter(pictureOnly).forEach((p) => {
      const pics = [...p.querySelectorAll(':scope > picture, :scope > img')];
      pics.slice(1).reverse().forEach((pic) => {
        const own = document.createElement('p');
        own.append(pic);
        p.after(own);
      });
    });
    paragraphs()
      .filter((p) => !p.textContent.trim() && !p.querySelector('picture, img, a'))
      .forEach((p) => p.remove());
  }
  const pictures = paragraphs().filter(pictureOnly);
  let drawings;
  const first = pictures[0]?.querySelector('img');
  const ratio = Number(first?.getAttribute('width')) / Number(first?.getAttribute('height'));
  if (pictures.length >= 4 || ratio < 1.6) {
    // two cars: the front view and its drawing, then the side view and its drawing
    section.classList.add('specs-two-cars');
    const [car1, dims1, car2, dims2] = pictures;
    drawings = [[car1, dims1], [car2, dims2]].map(([car, dims], i) => {
      car?.classList.add('specs-car', `specs-car-${i + 1}`);
      dims?.classList.add('specs-dims', `specs-dims-${i + 1}`);
      if (car) carRatio(section, car, i + 1);
      return dims;
    });
  } else {
    const [car, desk, phone] = pictures;
    car?.classList.add('specs-car');
    desk?.classList.add('specs-dims', phone ? 'specs-dims-desk' : 'specs-dims-all');
    phone?.classList.add('specs-dims', 'specs-dims-phone');
    drawings = [desk, phone];
  }
  // a removed image keeps its place, so the others stay where they belong, but shows nothing
  pictures.filter(emptyPicture).forEach((p) => {
    p.classList.add('specs-empty');
    if (!editing) p.replaceChildren();
  });
  // load drawings eagerly
  drawings.filter((p) => !p?.classList.contains('specs-empty')).forEach((p) => {
    const img = p?.querySelector('img');
    if (img) img.loading = 'eager';
    if (!editing) inlineDrawing(p);
  });
  // brochure button (not in Universal Editor)
  const closing = section.querySelector(':scope > .spec-table-wrapper ~ .default-content-wrapper:last-child');
  if (closing && !editing) decorateBrochure(closing, 'specs-brochure-links');
  wireReveal(section);
}
