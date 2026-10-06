import { createPicture, moveInstrumentation } from '../../scripts/scripts.js';
import enableDrag from '../../scripts/drag-slider.js';

const OPTION_CLASSES = [];
// Source swiper: autoplay delay 5000ms, no loop, horizontal slide effect.
const AUTOPLAY_DELAY = 5000;
const ARROW_SVG = '<svg viewBox="0 0 23 17" width="22" height="15" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" d="M.75 8.5h21.5m0 0L14.75 1m7.5 7.5-7.5 7.5"/></svg>';
let instanceId = 0;

function hasText(el) {
  return [...el.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, a')]
    .some((node) => !node.querySelector('picture') && node.textContent.trim());
}

function optimize(picture) {
  const img = picture.querySelector('img');
  if (!img) return picture;
  // Scene7 URLs keep their query (resMode, qlt...); wid/fmt are regenerated per breakpoint.
  const optimized = createPicture(img.src, img.alt, false, [{ width: '2000' }]);
  const optimizedImg = optimized.querySelector('img');
  if (!optimizedImg) return picture;
  optimizedImg.decoding = 'async';
  moveInstrumentation(img, optimizedImg);
  return optimized;
}

function createCard(row, index, id) {
  const card = document.createElement('li');
  card.className = 'mg-cards-card';
  card.id = `mg-cards-${id}-card-${index}`;
  card.dataset.slideIndex = index;
  card.dataset.active = 'false';
  card.setAttribute('role', 'group');
  card.setAttribute('aria-roledescription', 'slide');
  moveInstrumentation(row, card);

  const picture = row.querySelector('picture');
  const bodyCell = [...row.querySelectorAll(':scope > div')].find(hasText);
  const link = bodyCell?.querySelector('a[href]');
  const label = (link?.textContent || picture?.querySelector('img')?.alt || '').trim();

  const media = document.createElement('div');
  media.className = 'mg-cards-card-image';
  if (picture) media.append(optimize(picture));

  if (link) {
    // Whole artwork is clickable; the authored link text stays as an accessible caption.
    const anchor = document.createElement('a');
    anchor.className = 'mg-cards-card-link';
    anchor.href = link.href;
    if (link.target) anchor.target = link.target;
    if (link.title) anchor.title = link.title;
    moveInstrumentation(link, anchor);
    anchor.append(media);
    const caption = document.createElement('span');
    caption.className = 'mg-cards-card-title';
    caption.textContent = label;
    anchor.append(caption);
    card.append(anchor);
    const wrapper = link.closest('p, li');
    link.remove();
    if (wrapper && !wrapper.textContent.trim()) wrapper.remove();
  } else {
    card.append(media);
  }

  // Extra authored copy (heading, description) stays available below the artwork.
  if (bodyCell && hasText(bodyCell)) {
    const body = document.createElement('div');
    body.className = 'mg-cards-card-body';
    body.append(...bodyCell.childNodes);
    card.append(body);
  }

  if (label) card.setAttribute('aria-label', label);
  return card;
}

function arrow(className, label) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.setAttribute('aria-label', label);
  btn.innerHTML = ARROW_SVG;
  return btn;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  instanceId += 1;
  const id = instanceId;
  const active = [...block.classList].filter((c) => OPTION_CLASSES.includes(c));
  block.dataset.options = active.join(' ');

  const rows = [...block.querySelectorAll(':scope > div')];
  const cardRows = [];
  let background;
  rows.forEach((row) => {
    // A leading image-only row (no link/text) is the city map background.
    if (!cardRows.length && !background && !hasText(row) && row.querySelector('picture')) {
      background = row.querySelector('picture');
    } else if (row.querySelector('picture') || hasText(row)) {
      cardRows.push(row);
    }
  });

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'carousel');
  block.setAttribute('aria-label', block.getAttribute('aria-label') || 'Experience centres');

  const children = [];
  if (background) {
    const bg = document.createElement('div');
    bg.className = 'mg-cards-background';
    bg.setAttribute('aria-hidden', 'true');
    bg.append(optimize(background));
    children.push(bg);
    block.dataset.hasBackground = 'true';
  }

  const viewport = document.createElement('div');
  viewport.className = 'mg-cards-viewport';
  const stage = document.createElement('ul');
  stage.className = 'mg-cards-slides';
  const slides = cardRows.map((row, i) => createCard(row, i, id));
  stage.append(...slides);
  viewport.append(stage);

  const prev = arrow('mg-cards-prev', 'Previous experience centre');
  const next = arrow('mg-cards-next', 'Next experience centre');
  const nav = document.createElement('div');
  nav.className = 'mg-cards-nav';
  nav.append(prev, next);

  const markers = document.createElement('ol');
  markers.className = 'mg-cards-markers';
  markers.setAttribute('aria-label', 'Choose experience centre');
  const markerButtons = slides.map((card, i) => {
    const li = document.createElement('li');
    li.className = 'mg-cards-marker';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.targetSlide = i;
    btn.setAttribute('aria-controls', card.id);
    btn.setAttribute('aria-label', `Show ${card.getAttribute('aria-label') || `slide ${i + 1}`}`);
    li.append(btn);
    markers.append(li);
    return btn;
  });

  const status = document.createElement('div');
  status.className = 'mg-cards-status';
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');

  children.push(viewport, nav, markers, status);
  block.replaceChildren(...children);
  block.dataset.slideCount = slides.length;
  if (slides.length < 2) block.dataset.single = 'true';

  // Off-screen slides sit inside an overflow-clipped track, where native lazy loading
  // never fires; promote the neighbours so they are decoded before they slide in.
  let near = false;
  const warm = (index) => {
    if (!near) return;
    [index - 1, index, index + 1].forEach((i) => {
      const img = slides[i]?.querySelector('img');
      if (img && img.loading === 'lazy') img.loading = 'eager';
    });
  };

  let current = 0;
  const show = (index, announce = true) => {
    if (!slides.length) return;
    current = Math.max(0, Math.min(index, slides.length - 1));
    block.dataset.activeSlide = current;
    stage.style.setProperty('--mg-cards-index', current);
    slides.forEach((card, i) => {
      const isActive = i === current;
      card.dataset.active = isActive ? 'true' : 'false';
      card.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      card.querySelectorAll('a, button').forEach((el) => {
        if (isActive) el.removeAttribute('tabindex');
        else el.setAttribute('tabindex', '-1');
      });
    });
    markerButtons.forEach((btn, i) => {
      btn.dataset.active = i === current ? 'true' : 'false';
      if (i === current) btn.setAttribute('aria-current', 'true');
      else btn.removeAttribute('aria-current');
    });
    // aria-disabled (not disabled) keeps keyboard focus on the arrow at either end.
    prev.setAttribute('aria-disabled', current === 0 ? 'true' : 'false');
    next.setAttribute('aria-disabled', current === slides.length - 1 ? 'true' : 'false');
    warm(current);
    if (announce) {
      status.textContent = `${current + 1} of ${slides.length}: ${slides[current].getAttribute('aria-label') || ''}`;
    }
  };

  // Autoplay mirrors the source: advance every 5s, rewind to the first slide after the last.
  let timer;
  let inView = false;
  let paused = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const stop = () => { clearTimeout(timer); timer = undefined; };
  const schedule = () => {
    stop();
    if (slides.length < 2 || !inView || paused || reducedMotion.matches) return;
    timer = setTimeout(() => {
      show(current === slides.length - 1 ? 0 : current + 1, false);
      schedule();
    }, AUTOPLAY_DELAY);
  };
  const go = (index) => { show(index); schedule(); };

  prev.addEventListener('click', () => go(current - 1));
  next.addEventListener('click', () => go(current + 1));
  markerButtons.forEach((btn) => {
    btn.addEventListener('click', () => go(parseInt(btn.dataset.targetSlide, 10)));
  });
  block.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') go(current - 1);
    if (e.key === 'ArrowRight') go(current + 1);
  });

  const pause = () => { paused = true; stop(); };
  const resume = () => { paused = false; schedule(); };
  block.addEventListener('mouseenter', pause);
  block.addEventListener('mouseleave', resume);
  block.addEventListener('focusin', pause);
  block.addEventListener('focusout', (e) => {
    if (!block.contains(e.relatedTarget)) resume();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      schedule();
    }, { threshold: 0.5 }).observe(block);
    const nearObserver = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      near = true;
      warm(current);
      nearObserver.disconnect();
    }, { rootMargin: '100% 0px' });
    nearObserver.observe(block);
  } else {
    near = true;
  }

  // Click-and-drag / swipe: the track follows the pointer (resisting past either end),
  // release settles on a city; autoplay waits while dragging.
  if (slides.length > 1) {
    enableDrag(viewport, {
      onStart: stop,
      onMove: (dx) => {
        const atEdge = (current === 0 && dx > 0) || (current === slides.length - 1 && dx < 0);
        stage.style.setProperty('--mg-drag-x', `${atEdge ? dx * 0.35 : dx}px`);
      },
      onEnd: (dx, velocity) => {
        stage.style.removeProperty('--mg-drag-x');
        if (Math.abs(dx) > viewport.clientWidth * 0.15 || Math.abs(velocity) > 0.45) {
          go(current + (dx < 0 ? 1 : -1));
        } else {
          schedule();
        }
      },
    });
  }

  show(0, false);
  block.dataset.ready = 'true';
}
