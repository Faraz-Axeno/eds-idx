import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const OPTION_CLASSES = [];
const THEMES = ['day', 'night'];
const SLIDE_MS = 300; // matches the .mg-vehicles-slide-media transition
const AUTOPLAY_MS = 4000; // source: data-delay="4000"
let instanceId = 0;

function hasText(el) {
  return [...el.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, a')]
    .some((node) => !node.querySelector('picture') && node.textContent.trim());
}

function isScene7(src) {
  try {
    return new URL(src, window.location.href).pathname.startsWith('/is/image/');
  } catch {
    return false;
  }
}

// Rebuild a Scene7 rendition URL verbatim (keeps `$`-params intact),
// replacing only width and format.
function scene7Url(src, width, format) {
  const qIdx = src.indexOf('?');
  const base = qIdx >= 0 ? src.slice(0, qIdx) : src;
  const params = (qIdx >= 0 ? src.slice(qIdx + 1) : '').split('&')
    .filter((p) => p && !/^(wid|fmt)=/.test(p));
  params.push(`wid=${width}`, `fmt=${format}`);
  return `${base}?${params.join('&')}`;
}

// Car cut-outs are transparent: Scene7 must serve an alpha format,
// otherwise the car renders inside a white box over the background.
function alphaPicture(img) {
  const src = img.getAttribute('src');
  const picture = document.createElement('picture');
  [{ media: '(min-width: 600px)', width: 1920 }, { width: 750 }].forEach(({ media, width }) => {
    const source = document.createElement('source');
    source.type = 'image/webp';
    if (media) source.media = media;
    source.srcset = scene7Url(src, width, 'webp-alpha');
    picture.append(source);
  });
  const fallback = document.createElement('img');
  fallback.src = scene7Url(src, 750, 'png-alpha');
  fallback.alt = img.alt;
  picture.append(fallback);
  return picture;
}

function optimize(picture, eager, width, alpha) {
  const img = picture.querySelector('img');
  if (!img) return picture;
  let optimized = picture;
  if (!isScene7(img.src)) {
    optimized = createOptimizedPicture(img.src, img.alt, eager, [{ width }]);
  } else if (alpha) {
    optimized = alphaPicture(img);
  }
  const optimizedImg = optimized.querySelector('img');
  optimizedImg.loading = eager ? 'eager' : 'lazy';
  if (optimized !== picture) moveInstrumentation(img, optimizedImg);
  return optimized;
}

function themedPicture(picture, theme, eager, width, className, alpha = false) {
  const pic = optimize(picture, eager, width, alpha);
  pic.classList.add(className);
  pic.dataset.themeImage = theme;
  return pic;
}

function createSlide(row, index, id) {
  const slide = document.createElement('li');
  slide.className = 'mg-vehicles-slide';
  slide.id = `mg-vehicles-${id}-slide-${index}`;
  slide.dataset.slideIndex = index;
  slide.dataset.active = 'false';
  slide.setAttribute('role', 'group');
  slide.setAttribute('aria-roledescription', 'slide');
  moveInstrumentation(row, slide);

  const pictures = [...row.querySelectorAll('picture')];
  const media = document.createElement('div');
  media.className = 'mg-vehicles-slide-media';
  pictures.slice(0, 2).forEach((pic, i) => {
    const eager = index === 0 && i === 0;
    media.append(themedPicture(pic, THEMES[i], eager, '1920', 'mg-vehicles-slide-image', true));
  });
  slide.dataset.hasNight = pictures.length > 1 ? 'true' : 'false';

  const content = document.createElement('div');
  content.className = 'mg-vehicles-slide-content';
  const textCell = [...row.querySelectorAll(':scope > div')].find(hasText) || row;
  // Remove pictures that were authored inline in the text cell.
  textCell.querySelectorAll('picture').forEach((pic) => (pic.closest('p') || pic).remove());

  const actions = document.createElement('div');
  actions.className = 'mg-vehicles-slide-actions';
  [...textCell.querySelectorAll('a[href]')].forEach((link, i) => {
    const wrapper = link.closest('p, li');
    link.classList.add(i === 0 ? 'mg-vehicles-cta' : 'mg-vehicles-link');
    link.dataset.ctaIndex = i;
    actions.append(link);
    if (wrapper && !wrapper.textContent.trim()) wrapper.remove();
  });

  [...textCell.children].forEach((el) => {
    if (!el.textContent.trim()) return;
    if (/^H[1-6]$/.test(el.tagName)) el.classList.add('mg-vehicles-slide-title');
    else el.classList.add('mg-vehicles-slide-text');
    content.append(el);
  });
  if (actions.children.length) content.append(actions);

  const title = content.querySelector('.mg-vehicles-slide-title');
  if (title) {
    if (!title.id) title.id = `${slide.id}-title`;
    slide.setAttribute('aria-labelledby', title.id);
  }

  slide.append(media, content);
  return slide;
}

function button(className, label) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.setAttribute('aria-label', label);
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
  // Leading rows with pictures but no text = day/night background config.
  const bgPictures = [];
  const slideRows = [];
  rows.forEach((row) => {
    if (!slideRows.length && !hasText(row) && row.querySelector('picture')) {
      bgPictures.push(...row.querySelectorAll('picture'));
    } else if (hasText(row) || row.querySelector('picture')) {
      slideRows.push(row);
    }
  });

  block.id = block.id || `mg-vehicles-${id}`;
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'carousel');
  block.dataset.theme = 'day';
  block.dataset.activeSlide = '0';
  block.dataset.slideCount = slideRows.length;

  const backgrounds = document.createElement('div');
  backgrounds.className = 'mg-vehicles-backgrounds';
  backgrounds.setAttribute('aria-hidden', 'true');
  bgPictures.slice(0, 2).forEach((pic, i) => {
    backgrounds.append(themedPicture(pic, THEMES[i], i === 0, '2000', 'mg-vehicles-background'));
  });
  block.dataset.hasNightBackground = bgPictures.length > 1 ? 'true' : 'false';

  const viewport = document.createElement('div');
  viewport.className = 'mg-vehicles-viewport';
  viewport.tabIndex = 0;
  viewport.setAttribute('aria-label', 'Vehicles');
  const track = document.createElement('ul');
  track.className = 'mg-vehicles-slides';
  const slides = slideRows.map((row, i) => createSlide(row, i, id));
  track.append(...slides);
  viewport.append(track);

  const nav = document.createElement('div');
  nav.className = 'mg-vehicles-nav';
  const prev = button('mg-vehicles-prev', 'Previous vehicle');
  const next = button('mg-vehicles-next', 'Next vehicle');
  nav.append(prev, next);

  const controls = document.createElement('div');
  controls.className = 'mg-vehicles-controls';
  const toggle = button('mg-vehicles-theme-toggle', 'Switch to night view');
  toggle.setAttribute('aria-pressed', 'false');
  toggle.dataset.theme = 'day';
  // progress bar: one clickable segment per vehicle (source: clickable Swiper pagination)
  const progress = document.createElement('div');
  progress.className = 'mg-vehicles-progress';
  progress.setAttribute('role', 'group');
  progress.setAttribute('aria-label', 'Choose vehicle');
  progress.innerHTML = '<span class="mg-vehicles-progress-bar" aria-hidden="true"></span>';
  const segments = slides.map((slide, i) => {
    const title = slide.querySelector('.mg-vehicles-slide-title')?.textContent.trim();
    const segment = button('mg-vehicles-progress-segment', `Show vehicle ${i + 1}${title ? `: ${title}` : ''}`);
    segment.dataset.slideIndex = i;
    progress.append(segment);
    return segment;
  });
  controls.append(toggle, progress);

  const status = document.createElement('div');
  status.className = 'mg-vehicles-status';
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');

  block.replaceChildren(backgrounds, viewport, nav, controls, status);
  block.style.setProperty('--mg-vehicles-count', Math.max(slides.length, 1));
  if (slides.length < 2) block.dataset.single = 'true';

  let current = 0;
  const show = (index, announce = true) => {
    if (!slides.length) return;
    current = (index + slides.length) % slides.length;
    block.dataset.activeSlide = current;
    block.style.setProperty('--mg-vehicles-index', current);
    slides.forEach((slide, i) => {
      const isActive = i === current;
      slide.dataset.active = isActive ? 'true' : 'false';
      slide.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      slide.querySelectorAll('a, button').forEach((el) => {
        if (isActive) el.removeAttribute('tabindex');
        else el.setAttribute('tabindex', '-1');
      });
    });
    segments.forEach((segment, i) => {
      if (i === current) segment.setAttribute('aria-current', 'true');
      else segment.removeAttribute('aria-current');
    });
    if (announce) {
      const title = slides[current].querySelector('.mg-vehicles-slide-title');
      status.textContent = `Slide ${current + 1} of ${slides.length}${title ? `: ${title.textContent.trim()}` : ''}`;
    }
  };

  // source: the night view switches the header to its light version (white logo + strokes)
  const section = block.closest('.section');
  const dayHeader = section?.dataset.header;
  const setTheme = (theme) => {
    block.dataset.theme = theme;
    if (section) {
      if (theme === 'night') section.dataset.header = 'light';
      else if (dayHeader) section.dataset.header = dayHeader;
      else delete section.dataset.header;
    }
    toggle.dataset.theme = theme;
    toggle.setAttribute('aria-pressed', theme === 'night' ? 'true' : 'false');
    toggle.setAttribute('aria-label', theme === 'night' ? 'Switch to day view' : 'Switch to night view');
  };

  // Autoplay like the source (Swiper autoplay, loop): next slide 4s after each slide lands,
  // only while at least half on screen, paused (keeping the remaining time) on mouse hover.
  let timer = null;
  let remaining = AUTOPLAY_MS;
  let armedAt = 0;
  // reasons the timer is held; it only runs while all are false
  const hold = {
    offscreen: true, hover: false, focus: false, hidden: false,
  };
  const autoplay = slides.length > 1 && !block.closest('[data-aue-resource]')
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stopTimer = () => {
    clearTimeout(timer);
    timer = null;
  };
  // eslint-disable-next-line no-use-before-define -- go() is declared below and re-arms the timer
  const fire = () => { timer = null; go(1); };
  const arm = (ms = AUTOPLAY_MS) => {
    stopTimer();
    remaining = ms;
    if (!autoplay || Object.values(hold).some(Boolean)) return;
    armedAt = performance.now();
    timer = setTimeout(fire, ms);
  };
  const pause = (reason) => {
    if (timer) remaining = Math.max(0, remaining - (performance.now() - armedAt));
    stopTimer();
    hold[reason] = true;
  };
  const resume = (reason) => {
    hold[reason] = false;
    if (!timer) arm(remaining);
  };

  // Directional slide like the source's looping Swiper: next pushes the car out to the left
  // while the new one enters from the right, prev the other way, also when wrapping around.
  let sliding = false;
  const mediaOf = (slide) => slide.querySelector('.mg-vehicles-slide-media');
  const place = (media, percent, animate) => {
    media.style.transition = animate ? '' : 'none';
    media.style.transform = percent === null ? '' : `translateX(${percent}%)`;
  };
  // steps: +1 / -1 for the arrows, or the signed distance to a progress segment
  const go = (steps) => {
    if (sliding || slides.length < 2 || !steps) return;
    const direction = Math.sign(steps);
    const from = mediaOf(slides[current]);
    const to = mediaOf(slides[(current + steps + slides.length) % slides.length]);
    place(to, direction * 100, false);
    to.getBoundingClientRect(); // commit the start position before animating
    place(to, 0, true);
    place(from, direction * -100, true);
    show(current + steps);
    sliding = true;
    stopTimer();
    setTimeout(() => {
      // hand both layers back to the stylesheet without animating the reset
      place(from, null, false);
      place(to, null, false);
      sliding = false;
      // manual or automatic, the next autoplay step is a full delay after this one lands
      arm();
    }, SLIDE_MS);
  };

  if (autoplay) {
    new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio >= 0.5) {
        hold.offscreen = false;
        arm(); // entering the viewport restarts the full delay
      } else {
        pause('offscreen');
        remaining = AUTOPLAY_MS;
      }
    }, { threshold: [0, 0.5] }).observe(block);
    // the strip behind the fixed header is not part of the carousel (source: .header__overlay);
    // looked up per event because the header is decorated after this block
    const overCarousel = (e) => {
      const bar = document.querySelector('header .header-bar');
      return e.clientY >= (bar ? bar.getBoundingClientRect().bottom : 0);
    };
    const trackHover = (e) => {
      if (e.pointerType !== 'mouse') return;
      if (overCarousel(e) && !hold.hover) pause('hover');
      else if (!overCarousel(e) && hold.hover) resume('hover');
    };
    block.addEventListener('pointerenter', trackHover);
    block.addEventListener('pointermove', trackHover);
    block.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') resume('hover'); });
    // keyboard users get a still carousel while they are inside it
    block.addEventListener('focusin', (e) => { if (e.target.matches(':focus-visible')) pause('focus'); });
    block.addEventListener('focusout', (e) => { if (!block.contains(e.relatedTarget)) resume('focus'); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) pause('hidden');
      else resume('hidden');
    });
  }

  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  // like the source's slideToLoop: a later segment enters from the right, an earlier from the left
  segments.forEach((segment, i) => segment.addEventListener('click', () => go(i - current)));
  toggle.addEventListener('click', () => setTheme(block.dataset.theme === 'night' ? 'day' : 'night'));
  viewport.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
  });

  // Basic swipe support.
  let startX = null;
  viewport.addEventListener('pointerdown', (e) => { startX = e.clientX; });
  viewport.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const delta = e.clientX - startX;
    startX = null;
    if (Math.abs(delta) > 50) go(delta < 0 ? 1 : -1);
  });

  show(0, false);
  block.dataset.ready = 'true';
}
