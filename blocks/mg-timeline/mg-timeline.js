import { createPicture, moveInstrumentation } from '../../scripts/scripts.js';
import enableDrag from '../../scripts/drag-slider.js';

const OPTION_CLASSES = [];
const YEAR_RE = /^\s*(\d{3,4}s?)\s*$/;
const CLONE_COUNT = 2;
let instanceId = 0;

function optimize(picture, eager) {
  const img = picture.querySelector('img');
  if (!img) return picture;
  const optimized = createPicture(img.src, img.alt, eager, [
    { media: '(width >= 900px)', width: '900' },
    { width: '600' },
  ]);
  moveInstrumentation(img, optimized.querySelector('img'));
  return optimized;
}

/** Collects the text elements of all non-picture cells, wrapping bare text in <p>. */
function textElements(row) {
  const out = [];
  const cells = [...row.querySelectorAll(':scope > div')];
  (cells.length ? cells : [row]).forEach((cell) => {
    if (cell.querySelector('picture') && !cell.textContent.trim()) return;
    if (!cell.children.length && cell.textContent.trim()) {
      const p = document.createElement('p');
      p.textContent = cell.textContent.trim();
      out.push(p);
      return;
    }
    [...cell.children].forEach((el) => {
      if (el.querySelector('picture') && !el.textContent.trim()) return;
      if (el.textContent.trim()) out.push(el);
    });
  });
  return out;
}

function createSlide(row, index, id) {
  const slide = document.createElement('li');
  slide.className = 'mg-timeline-slide';
  slide.id = `mg-timeline-${id}-slide-${index}`;
  slide.dataset.slideIndex = index;
  slide.dataset.active = 'false';
  slide.setAttribute('role', 'group');
  slide.setAttribute('aria-roledescription', 'slide');
  moveInstrumentation(row, slide);

  const picture = row.querySelector('picture');
  const elements = textElements(row);

  // Year: first element that is just a year, else first element.
  let yearEl = elements.find((el) => YEAR_RE.test(el.textContent));
  if (!yearEl && elements.length > 1) [yearEl] = elements;
  const year = yearEl ? yearEl.textContent.trim() : String(index + 1);
  const rest = elements.filter((el) => el !== yearEl);

  // Title: first heading, else first <strong>-only paragraph, else first element.
  let titleEl = rest.find((el) => /^H[1-6]$/.test(el.tagName))
    || rest.find((el) => el.querySelector('strong') && el.textContent.trim() === el.querySelector('strong').textContent.trim())
    || rest[0];
  const descriptions = rest.filter((el) => el !== titleEl);

  slide.dataset.year = year;
  const yearNode = document.createElement('p');
  yearNode.className = 'mg-timeline-slide-year';
  yearNode.textContent = year;
  if (yearEl) moveInstrumentation(yearEl, yearNode);

  const media = document.createElement('div');
  media.className = 'mg-timeline-slide-image';
  if (picture) media.append(optimize(picture, index === 0));

  const content = document.createElement('div');
  content.className = 'mg-timeline-slide-content';
  if (titleEl) {
    if (!/^H[1-6]$/.test(titleEl.tagName)) {
      const h = document.createElement('h3');
      moveInstrumentation(titleEl, h);
      h.textContent = titleEl.textContent.trim();
      titleEl = h;
    }
    titleEl.classList.add('mg-timeline-slide-title');
    titleEl.id = titleEl.id || `${slide.id}-title`;
    slide.setAttribute('aria-labelledby', titleEl.id);
    content.append(titleEl);
  }
  descriptions.forEach((el) => {
    el.classList.add('mg-timeline-slide-text');
    content.append(el);
  });

  slide.append(yearNode, media, content);
  return { slide, year, title: titleEl ? titleEl.textContent.trim() : '' };
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

  const rows = [...block.querySelectorAll(':scope > div')]
    .filter((row) => row.querySelector('picture') || row.textContent.trim());
  const items = rows.map((row, i) => createSlide(row, i, id));
  const slides = items.map((item) => item.slide);

  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'timeline');
  block.setAttribute('aria-label', block.getAttribute('aria-label') || 'Heritage timeline');

  // Ruler under the cards, like the source scale: a major tick per milestone with minor
  // ticks between (no visible year labels). The active milestone's tick is the tall dark
  // marker, kept centred. The tick set repeats 3x so the ruler looks endless; only the
  // middle copy is focusable (years / titles are exposed as accessible labels).
  const bar = document.createElement('nav');
  bar.className = 'mg-timeline-bar';
  bar.setAttribute('aria-label', 'Timeline years');
  const ruler = document.createElement('div');
  ruler.className = 'mg-timeline-ruler';
  const yearButtons = [];
  for (let copy = 0; copy < 3; copy += 1) {
    items.forEach((item, i) => {
      const tick = document.createElement('button');
      tick.type = 'button';
      tick.className = 'mg-timeline-tick';
      tick.dataset.targetSlide = i;
      tick.dataset.year = item.year;
      tick.dataset.active = 'false';
      tick.style.setProperty('--mg-timeline-tick-index', copy * items.length + i);
      const label = document.createElement('span');
      label.className = 'mg-timeline-tick-label';
      label.textContent = `${item.year}${item.title ? `: ${item.title}` : ''}`;
      tick.append(label);
      if (copy === 1) {
        tick.setAttribute('aria-controls', item.slide.id);
        yearButtons.push(tick);
      } else {
        tick.tabIndex = -1;
        tick.setAttribute('aria-hidden', 'true');
      }
      ruler.append(tick);
    });
  }
  bar.append(ruler);

  const viewport = document.createElement('div');
  viewport.className = 'mg-timeline-viewport';
  // focusable so keyboard users can move through milestones with the arrow keys
  viewport.tabIndex = 0;
  viewport.setAttribute('aria-label', 'Milestones, use left and right arrow keys');
  const list = document.createElement('ul');
  list.className = 'mg-timeline-slides';
  list.append(...slides);
  viewport.append(list);

  // Decorative copies of the last / first milestones so the ends of the strip
  // wrap visually like the source carousel. Hidden from AT; clicking selects the original.
  const cloneOf = (slide, i) => {
    const copy = slide.cloneNode(true);
    copy.classList.add('mg-timeline-slide-clone');
    [copy, ...copy.querySelectorAll('*')].forEach((el) => {
      el.removeAttribute('id');
      [...el.attributes].forEach(({ name }) => {
        if (name.startsWith('data-aue') || name.startsWith('data-richtext')) el.removeAttribute(name);
      });
    });
    ['role', 'aria-roledescription', 'aria-labelledby', 'data-slide-index'].forEach((a) => copy.removeAttribute(a));
    copy.dataset.active = 'false';
    copy.dataset.cloneOf = i;
    copy.setAttribute('aria-hidden', 'true');
    return copy;
  };
  if (slides.length > CLONE_COUNT * 2) {
    const head = slides.slice(-CLONE_COUNT).map((s) => cloneOf(s, slides.indexOf(s)));
    const tail = slides.slice(0, CLONE_COUNT).map((s, i) => cloneOf(s, i));
    list.prepend(...head);
    list.append(...tail);
  }

  const status = document.createElement('div');
  status.className = 'mg-timeline-status';
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');

  block.replaceChildren(viewport, bar, status);
  block.dataset.slideCount = slides.length;
  block.style.setProperty('--mg-timeline-count', Math.max(slides.length, 1));
  if (slides.length < 2) block.dataset.single = 'true';

  let current = 0;

  // Centre the active slide in the viewport.
  let offset = 0;
  const position = () => {
    const slide = slides[current];
    if (!slide) return;
    offset = viewport.clientWidth / 2 - (slide.offsetLeft + slide.offsetWidth / 2);
    list.style.transform = `translateX(${offset}px)`;
  };

  const show = (index, announce = true) => {
    if (!slides.length) return;
    current = Math.max(0, Math.min(index, slides.length - 1));
    block.dataset.activeSlide = current;
    block.style.setProperty('--mg-timeline-progress', slides.length > 1 ? current / (slides.length - 1) : 1);
    slides.forEach((slide, i) => {
      const isActive = i === current;
      slide.dataset.active = isActive ? 'true' : 'false';
      slide.dataset.position = String(i - current);
      slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      slide.querySelectorAll('a, button').forEach((el) => {
        if (isActive) el.removeAttribute('tabindex');
        else el.setAttribute('tabindex', '-1');
      });
    });
    yearButtons.forEach((btn, i) => {
      btn.dataset.active = i === current ? 'true' : 'false';
      if (i === current) btn.setAttribute('aria-current', 'step');
      else btn.removeAttribute('aria-current');
    });
    // centre the active (middle-copy) tick under the ruler
    block.style.setProperty('--mg-timeline-ruler-index', slides.length + current);
    position();
    if (announce) status.textContent = `${items[current].year}${items[current].title ? `: ${items[current].title}` : ''}`;
  };

  ruler.querySelectorAll('.mg-timeline-tick').forEach((btn) => {
    btn.addEventListener('click', () => show(parseInt(btn.dataset.targetSlide, 10)));
  });
  block.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
  slides.forEach((slide, i) => {
    slide.addEventListener('click', () => { if (i !== current) show(i); });
  });
  list.querySelectorAll('.mg-timeline-slide-clone').forEach((copy) => {
    copy.addEventListener('click', () => show(parseInt(copy.dataset.cloneOf, 10)));
  });

  // Click-and-drag / swipe: the strip follows the pointer; on release it settles on the
  // milestone the drag reached (at least one step for a deliberate flick).
  if (slides.length > 1) {
    enableDrag(viewport, {
      onMove: (dx) => { list.style.transform = `translateX(${offset + dx}px)`; },
      onEnd: (dx, velocity) => {
        const step = (slides[1].offsetLeft - slides[0].offsetLeft) || viewport.clientWidth;
        let moved = Math.round(-dx / step);
        if (!moved && (Math.abs(dx) > 50 || Math.abs(velocity) > 0.45)) moved = dx < 0 ? 1 : -1;
        if (moved) show(current + moved);
        else position();
      },
    });
  }

  if ('ResizeObserver' in window) new ResizeObserver(position).observe(viewport);
  else window.addEventListener('resize', position);
  // Images change slide widths once loaded.
  list.querySelectorAll('img').forEach((img) => img.addEventListener('load', position, { once: true }));

  show(0, false);
  block.dataset.ready = 'true';
}
