import { moveInstrumentation } from '../../scripts/scripts.js';

/*
 * Accordion: one Accordion Item per row, [title] [content]. Each item is a <details>, numbered
 * 01, 02...; all start closed and one is open at a time. In Universal Editor, selecting an item,
 * or one of its fields, on the page or in the content tree opens it. Dark theme (block option
 * "dark") puts the block on a black band across the page, in white.
 */

// the most characters each text may have: enough for any title and content, not for a wall of
// pasted text (_accordion.json limits the title field to the same). Longer text, saved before
// the limits or in the rich text content, is shortened on the page, and listed in the editor
const MAX_CHARS = {
  title: 120,
  content: 600,
};

const length = (node) => node.textContent.replace(/\s+/g, ' ').trim().length;

/** text cut to at most `max` characters, at a word where it can, ending in an ellipsis */
function clip(text, max) {
  const cut = text.slice(0, Math.max(0, max - 1));
  const atWord = cut.replace(/\s+\S*$/, '');
  return `${(atWord.length >= max / 2 ? atWord : cut).replace(/[\s.,;:–-]+$/, '')}…`;
}

/**
 * Cuts the text in an element (a plain title, or rich text content with its paragraphs,
 * lists and links) to `max` characters: the text past the limit, and the elements left empty,
 * are removed. Returns the text's length if it was cut, else 0
 * @param {Element} node
 * @param {number} max
 * @returns {number}
 */
function clipContent(node, max) {
  const full = length(node);
  if (full <= max) return 0;
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  const texts = [];
  while (walker.nextNode()) texts.push(walker.currentNode);
  let left = max;
  texts.forEach((text) => {
    const value = text.textContent.replace(/\s+/g, ' ');
    if (left <= 0) {
      text.remove();
    } else if (value.length <= left) {
      left -= value.length;
    } else {
      text.textContent = clip(value, left);
      left = 0;
    }
  });
  [...node.querySelectorAll('*')].reverse().forEach((el) => {
    if (!el.textContent.trim() && !el.querySelector('img, picture, br')) el.remove();
  });
  return full;
}

/**
 * @param {Element} row [title] [content]
 * @param {number} i
 * @returns {HTMLDetailsElement}
 */
function buildItem(row, i) {
  const [label, body] = row.children;

  const summary = document.createElement('summary');
  summary.className = 'accordion-item-label';
  const number = document.createElement('span');
  number.className = 'accordion-item-number';
  number.textContent = String(i + 1).padStart(2, '0');
  number.setAttribute('aria-hidden', 'true');
  const question = document.createElement('span');
  question.className = 'accordion-item-question';
  if (label) question.append(...label.childNodes);
  const icon = document.createElement('span');
  icon.className = 'accordion-item-icon';
  icon.setAttribute('aria-hidden', 'true');
  summary.append(number, question, icon);

  const answer = body || document.createElement('div');
  answer.className = 'accordion-item-body';

  const details = document.createElement('details');
  details.className = 'accordion-item';
  moveInstrumentation(row, details);
  details.append(summary, answer);

  // closed with a click, the question takes the closed colour at once, though the pointer is
  // still on it (accordion.css darkens hovered questions); hover works again once it leaves
  summary.addEventListener('click', () => {
    summary.classList.toggle('is-hover-off', details.open && !details.classList.contains('is-closing'));
  });
  summary.addEventListener('pointerleave', () => summary.classList.remove('is-hover-off'));
  return details;
}

/**
 * The button of the FAQ section (FAQ Columns or FAQ Center style): on hover its letters
 * flicker off and back, each at a random moment, a third of them twice, as on the design
 * prototype. The link keeps its text (and gets it as its label, the letters being split into
 * spans)
 * @param {Element} block
 */
function wireCtaGlitch(block) {
  const link = block.closest('.section:is(.faq-columns, .faq-center)')
    ?.querySelector(':scope > .default-content-wrapper > p > a:only-child');
  if (!link || link.classList.contains('accordion-cta-glitch')) return;
  link.classList.add('accordion-cta-glitch');
  link.setAttribute('aria-label', link.textContent.trim());
  // every text in the link (also inside a span or strong it may hold) split into letters
  const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
  const texts = [];
  while (walker.nextNode()) texts.push(walker.currentNode);
  const letters = [];
  texts.forEach((text) => {
    const split = [...text.data].map((char) => {
      const letter = document.createElement('span');
      letter.textContent = char;
      letter.setAttribute('aria-hidden', 'true');
      letters.push(letter);
      return letter;
    });
    text.replaceWith(...split);
  });

  let running = [];
  // a mouse hover only: a tap on a touch screen also "enters" the link, and must not glitch
  link.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse') return;
    running.forEach((animation) => animation.cancel());
    running = [];
    if (!window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return;
    running = letters.filter((letter) => letter.textContent.trim()).map((letter) => {
      // [seconds, opacity]: off in 0.04s at a moment in the first 0.22s, back in 0.06s
      const off = Math.random() * 0.22;
      const back = off + 0.06 + Math.random() * 0.1;
      const stops = [[0, 1], [off, 1], [off + 0.04, 0], [back, 0], [back + 0.06, 1]];
      if (Math.random() < 0.35) {
        const again = off + 0.24 + Math.random() * 0.1;
        stops.push([again, 1], [again + 0.03, 0.15], [again + 0.05, 0.15], [again + 0.1, 1]);
      }
      const end = stops[stops.length - 1][0];
      return letter.animate(
        stops.map(([at, opacity]) => ({ offset: at / end, opacity })),
        { duration: end * 1000, easing: 'linear' },
      );
    });
  });
}

/* ---------- Combat motion ----------
 * On the Combat page (body.combat), and in the FAQ of a Light section, an answer opens and
 * closes as on the design prototype, in
 * every browser: the item's height eases open in 0.55s and closed in 0.4s (power3.inOut), the
 * answer fading in 6px down after 0.12s (0.45s) and out in 0.2s. The item stays open while it
 * closes, so its answer can be seen going; opening one closes the one open. Only with motion
 * allowed (checked at each click); otherwise, and for anything else that opens an item (find in
 * page, a link), the details open and close at once as everywhere else.
 */
// how long an item takes to close (Combat motion)
const CLOSE_MS = 400;
const COMBAT_EASE = {
  power2In: 'cubic-bezier(0.32, 0, 0.67, 0)',
  power3Out: 'cubic-bezier(0.25, 1, 0.5, 1)',
  power3InOut: 'cubic-bezier(0.76, 0, 0.24, 1)',
};

/**
 * While an item opens, keeps it in view: the list it scrolls in (the section's list, when it
 * scrolls inside a screen-tall section) or, without one, the page follows it as it grows, so
 * its question and its whole answer show; an answer taller than the room keeps its question
 * at the top. It eases after the item as it opens, for about as long as the opening lasts
 * @param {HTMLDetailsElement} details
 */
function keepInView(details) {
  let scroller = null;
  for (let el = details.parentElement; el && el !== document.body; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if (overflowY === 'auto' || overflowY === 'scroll') {
      scroller = el;
      break;
    }
  }
  const smooth = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
  // follow it only once another item has closed (both at once shook the list)
  const closing = [...details.parentElement.children]
    .some((item) => item !== details && item.classList?.contains('is-closing'));
  const wait = closing && smooth ? CLOSE_MS + 20 : 0;
  const until = performance.now() + wait + 900;
  let cancelled = false;
  const cancel = () => { cancelled = true; };
  const stops = [[window, 'wheel'], [window, 'touchstart'], [document, 'snap:start']];
  stops.forEach(([target, type]) => {
    target.addEventListener(type, cancel, { once: true, passive: true });
  });
  const step = () => {
    if (cancelled || !details.open || details.classList.contains('is-closing')
      || performance.now() >= until) {
      stops.forEach(([target, type]) => target.removeEventListener(type, cancel));
      return;
    }
    const box = details.getBoundingClientRect();
    let top = 0;
    let bottom = window.innerHeight;
    if (scroller) {
      const room = scroller.getBoundingClientRect();
      top = Math.max(top, room.top);
      bottom = Math.min(bottom, room.bottom);
    }
    // below the room: up by what is hidden, but never the question above the top
    let by = box.top < top
      ? box.top - top
      : Math.max(0, Math.min(box.bottom - bottom, box.top - top));
    if (Math.abs(by) > 0.5) {
      if (smooth) by = Math.sign(by) * Math.max(1, Math.abs(by) * 0.3);
      if (scroller) scroller.scrollTop += by;
      else window.scrollBy(0, by);
    }
    requestAnimationFrame(step);
  };
  setTimeout(() => requestAnimationFrame(step), wait);
}

/**
 * @param {Element} block
 * @param {HTMLDetailsElement[]} items
 */
function wireCombatMotion(block, items) {
  const motionOk = () => window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
  block.classList.add('combat-accordion');
  // the items' order, for their arrival one after another (accordion.css)
  items.forEach((details, i) => details.style.setProperty('--accordion-i', i));
  const running = new Map();
  const stop = (details) => {
    const anims = running.get(details);
    running.delete(details);
    anims?.forEach((a) => a.cancel());
    details.classList.remove('is-animating');
  };

  /** eases an item open or closed from where it is (also part way, when interrupted) */
  const animate = (details, open) => {
    const summary = details.querySelector('summary');
    const answer = details.querySelector('.accordion-item-body');
    // border-box heights (the item is border-box while it animates, accordion.css)
    const { height } = details.getBoundingClientRect();
    const fade = answer ? getComputedStyle(answer) : null;
    const answerFrom = fade && { opacity: fade.opacity, translate: fade.translate === 'none' ? '0 0' : fade.translate };
    stop(details);
    details.classList.toggle('is-closing', !open);
    details.open = true;
    const borders = details.offsetHeight - details.clientHeight;
    const to = open ? details.offsetHeight : summary.offsetHeight + borders;
    details.classList.add('is-animating');
    const size = details.animate([{ height: `${height}px` }, { height: `${to}px` }], {
      duration: open ? 550 : CLOSE_MS, easing: COMBAT_EASE.power3InOut,
    });
    const anims = [size];
    if (answer) {
      anims.push(open
        ? answer.animate([{ opacity: 0, translate: '0 -6px' }, { opacity: 1, translate: '0 0' }], {
          duration: 450, delay: 120, easing: COMBAT_EASE.power3Out, fill: 'backwards',
        })
        : answer.animate([answerFrom, { opacity: 0, translate: '0 -6px' }], {
          duration: 200, easing: COMBAT_EASE.power2In, fill: 'forwards',
        }));
    }
    running.set(details, anims);
    size.finished.then(() => {
      if (running.get(details) !== anims) return;
      if (!open) {
        details.classList.remove('is-closing');
        details.open = false;
      }
      stop(details);
    }).catch(() => {
      // interrupted: the next animation takes over from where this one was
    });
  };

  items.forEach((details) => {
    const summary = details.querySelector('summary');
    summary.addEventListener('click', (e) => {
      if (!motionOk()) return;
      e.preventDefault();
      const opening = !details.open || details.classList.contains('is-closing');
      if (opening) {
        items.forEach((other) => {
          if (other !== details && other.open && !other.classList.contains('is-closing')) {
            animate(other, false);
          }
        });
      }
      animate(details, opening);
    });
  });
}

/**
 * @param {Element} section
 */
function wireFaqRunway(section) {
  if (section.dataset.faqRunway) return;
  section.dataset.faqRunway = 'true';
  section.classList.add('scroll-runway', 'runway-stop');
  let screen = 0;
  const screenHeight = () => {
    if (screen) return screen;
    const probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;top:0;width:0;height:100svh;visibility:hidden;pointer-events:none';
    document.body.append(probe);
    screen = probe.offsetHeight || window.innerHeight;
    probe.remove();
    return screen;
  };
  window.addEventListener('resize', () => { screen = 0; }, { passive: true });

  const tabLists = [...section.querySelectorAll('.tabs.faq > .tabs-list')];
  const recheckTabArrows = () => tabLists.forEach((list) => list.dispatchEvent(new Event('scroll')));
  const tabSizes = new ResizeObserver(recheckTabArrows);
  tabLists.forEach((list) => list.querySelectorAll('.tabs-tab').forEach((tab) => tabSizes.observe(tab)));
  document.addEventListener('snap:start', ({ detail: { to } }) => {
    if (to === section) recheckTabArrows();
  });

  const arrowTargets = new Map();
  section.addEventListener('click', (e) => {
    const arrow = e.target.closest?.('.tabs.faq > .tabs-scroll');
    const list = arrow?.parentElement.querySelector(':scope > .tabs-list');
    if (!list) return;
    e.stopPropagation();
    const room = Math.max(0, list.scrollWidth - list.clientWidth);
    const step = (arrow.classList.contains('tabs-scroll-next') ? 1 : -1) * list.clientWidth * 0.8;
    const pending = arrowTargets.get(list);
    clearTimeout(pending?.timer);
    const left = Math.min(room, Math.max(0, (pending?.left ?? list.scrollLeft) + step));
    const timer = setTimeout(() => arrowTargets.delete(list), 600);
    arrowTargets.set(list, { left, timer });
    const smooth = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    list.scrollTo({ left, behavior: smooth });
  }, true);

  const QUIET_MS = 200;
  let lastWheelAt = -Infinity;
  let arriving = false;
  let holdWheel = false;
  let touching = false;
  let holdTouch = false;
  window.addEventListener('wheel', (e) => {
    const now = e.timeStamp || performance.now();
    const quiet = now - lastWheelAt > QUIET_MS;
    lastWheelAt = now;
    if (arriving || !holdWheel) return;
    if (quiet) {
      holdWheel = false;
      return;
    }
    if (e.cancelable) e.preventDefault();
    e.stopImmediatePropagation();
  }, { capture: true, passive: false });
  window.addEventListener('touchstart', () => { touching = true; }, { capture: true, passive: true });
  ['touchend', 'touchcancel'].forEach((type) => window.addEventListener(type, (e) => {
    if (e.touches.length) return;
    touching = false;
    holdTouch = false;
  }, { capture: true, passive: true }));
  window.addEventListener('touchmove', (e) => {
    if (holdTouch && e.cancelable) e.preventDefault();
  }, { capture: true, passive: false });
  let snapping = false;
  document.addEventListener('snap:start', ({ detail: { to } }) => {
    snapping = true;
    if (to !== section) return;
    arriving = true;
    holdWheel = true;
    holdTouch = touching;
  });
  document.addEventListener('snap:end', () => {
    snapping = false;
    arriving = false;
  });

  // while items close the section keeps its height, then the page glides to the new end once
  const SETTLE_MS = 120;
  const GLIDE_MS = 350;
  let lastHeight = 0;
  let settle = 0;
  let glide = 0;
  let holding = false;
  const release = () => {
    holding = false;
    section.style.minHeight = '';
  };
  // the section's height without the hold
  const naturalHeight = () => {
    const held = section.style.minHeight;
    section.style.minHeight = '';
    const height = section.offsetHeight;
    section.style.minHeight = held;
    return height;
  };
  const glideTo = (y, done) => {
    cancelAnimationFrame(glide);
    const start = window.scrollY;
    const by = y - start;
    const begun = performance.now();
    const step = (now) => {
      if (snapping) {
        glide = 0;
        done();
        return;
      }
      // never below 0 (a frame can predate the start)
      const t = Math.min(1, Math.max(0, (now - begun) / GLIDE_MS));
      window.scrollTo({ top: start + by * (1 - (1 - t) ** 3), behavior: 'instant' });
      if (t < 1) {
        glide = requestAnimationFrame(step);
      } else {
        glide = 0;
        done();
      }
    };
    glide = requestAnimationFrame(step);
  };
  const settleDown = () => {
    const top = section.offsetTop;
    const end = Math.max(top, top + naturalHeight() - screenHeight());
    if (snapping || window.scrollY <= end + 0.5) {
      release();
      return;
    }
    glideTo(end, release);
  };
  const fit = new ResizeObserver(() => {
    if (!document.documentElement.classList.contains('snap-active') || glide) return;
    const top = section.offsetTop;
    const shown = section.offsetHeight;
    const height = naturalHeight();
    const before = lastHeight;
    const shrank = height < before - 0.5;
    lastHeight = height;
    if (holding) {
      // still closing
      clearTimeout(settle);
      settle = setTimeout(settleDown, SETTLE_MS);
      return;
    }
    const end = Math.max(top, top + height - screenHeight());
    const y = window.scrollY;
    if (snapping || !shrank || y <= end || y >= top + shown) return;
    // hold the height it had before the close
    holding = true;
    section.style.minHeight = `${Math.max(shown, before)}px`;
    clearTimeout(settle);
    settle = setTimeout(settleDown, SETTLE_MS);
  });
  [section, ...section.children].forEach((el) => fit.observe(el));

  document.addEventListener('snap:start', ({ detail: { from, to } }) => {
    const above = section.previousElementSibling;
    if (from !== section || to !== above || !above.classList.contains('scroll-runway')) return;
    queueMicrotask(() => {
      const tween = window.gsap?.getTweensOf(window).at(-1);
      const target = tween?.vars.scrollTo;
      if (!target || Math.abs(target.y - above.offsetTop) > 1) return;
      tween.vars.scrollTo = { ...target, y: above.offsetTop + above.offsetHeight - screenHeight() };
      tween.invalidate();
    });
  });
}

/**
 * @param {Element} block
 */
export default function decorate(block) {
  const editing = Boolean(block.closest('[data-aue-resource]'));
  const faqSection = block.closest('main > .section:is(.faq-columns, .faq-center)');
  if (faqSection && !editing) wireFaqRunway(faqSection);
  const items = [...block.children].map(buildItem);

  // texts over their limit (MAX_CHARS): shortened, and listed for the author in the editor
  const tooLong = [];
  items.forEach((details, i) => {
    const titleLength = clipContent(details.querySelector('.accordion-item-question'), MAX_CHARS.title);
    if (titleLength) tooLong.push(`item ${i + 1}: its title (${titleLength} of ${MAX_CHARS.title} characters)`);
    const contentLength = clipContent(details.querySelector('.accordion-item-body'), MAX_CHARS.content);
    if (contentLength) tooLong.push(`item ${i + 1}: its content (${contentLength} of ${MAX_CHARS.content} characters)`);
  });

  // Combat theme: the first question starts open, as on the source
  if (document.body.classList.contains('combat') && items.length) items[0].open = true;

  // one item open at a time (one still closing, Combat motion, closes when it is done)
  items.forEach((details) => details.addEventListener('toggle', () => {
    if (details.open) {
      items.forEach((other) => {
        if (other !== details && !other.classList.contains('is-closing')) other.open = false;
      });
      // the opened question and its answer come into view (not in the editor)
      if (!editing) keepInView(details);
    }
  }));
  const prototypeMotion = document.body.classList.contains('combat') || block.closest('.section.light');
  if (prototypeMotion && !editing && items.length) {
    wireCombatMotion(block, items);
  }
  if (!editing) wireCtaGlitch(block);

  // Universal Editor: selecting an item, or one of its fields, in the content tree or on the
  // page opens that item. Listened to while capturing, so it is heard wherever it is dispatched
  if (editing && items.length) {
    document.addEventListener('aue:ui-select', (e) => {
      if (!block.isConnected || !e.detail?.selected) return;
      const { resource } = e.detail;
      const item = items.find((details) => (resource && details.dataset.aueResource === resource)
        || (e.target instanceof Node && details.contains(e.target)));
      if (item) item.open = true;
    }, true);
  }

  const content = [...items];
  if (editing && tooLong.length) {
    const note = document.createElement('p');
    note.className = 'accordion-limit-note';
    note.textContent = `Too long, so shortened on the page: ${tooLong.join('; ')}. `
      + 'Shorten them in the properties.';
    content.unshift(note);
  }
  block.replaceChildren(...content);
}