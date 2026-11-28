/*
 * Motion for the reserve flow, from the reserve prototype: things arrive 12px low, out of a
 * 3px blur, on an expo-out curve, a few at a time; a step leaves 12px up before the next one
 * arrives. Web Animations only (no library). Everything is skipped when the visitor asks for
 * reduced motion, leaving the plain show / hide the block does anyway.
 */

const EXPO_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
const EXPO_IN_OUT = 'cubic-bezier(0.87, 0, 0.13, 1)';
const POWER2_IN = 'cubic-bezier(0.55, 0.085, 0.68, 0.53)';

export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const imgOf = (node) => (node && (node.matches('img') ? node : node.querySelector('img'))) || node;

/**
 * Brings elements in, one after another: up 12px, out of a 3px blur.
 * @param {Iterable<Element>} nodes
 * @param {{delay?: number, stagger?: number, y?: number, duration?: number}} [options] seconds
 */
export function reveal(nodes, {
  delay = 0, stagger = 0.06, y = 12, duration = 0.6,
} = {}) {
  if (reduced()) return;
  [...nodes].forEach((node, i) => {
    node.animate([
      { transform: `translateY(${y}px)`, opacity: 0, filter: 'blur(3px)' },
      { transform: 'translateY(0)', opacity: 1, filter: 'blur(0)' },
    ], {
      duration: duration * 1000, delay: (delay + i * stagger) * 1000, easing: EXPO_OUT, fill: 'backwards',
    });
  });
}

/**
 * Sends a step away (12px up, into a blur); resolves when it has gone. The caller hides it.
 * @param {Element} node
 * @returns {Promise<void>}
 */
export function leave(node) {
  if (reduced() || !node) return Promise.resolve();
  const anim = node.animate([
    { transform: 'translateY(0)', opacity: 1, filter: 'blur(0)' },
    { transform: 'translateY(-12px)', opacity: 0, filter: 'blur(3px)' },
  ], { duration: 350, easing: POWER2_IN, fill: 'forwards' });
  return anim.finished.then(() => anim.cancel(), () => {});
}

/**
 * The page's arrival: the car panel unrolls from the top, the car settles out of a zoom and a
 * blur, the price card rises, then the step's parts come in.
 * @param {{media: Element, car: Element, price: Element, parts: Element[]}} parts
 */
export function intro({
  media, car, price, parts,
}) {
  if (reduced()) return;
  media?.animate([
    { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)' },
  ], { duration: 1100, easing: EXPO_IN_OUT });
  imgOf(car)?.animate([
    { transform: 'scale(1.12)', filter: 'blur(8px)' }, { transform: 'scale(1)', filter: 'blur(0)' },
  ], { duration: 1500, easing: EXPO_OUT });
  price?.animate([
    { transform: 'translateY(16px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 },
  ], {
    duration: 900, delay: 500, easing: EXPO_OUT, fill: 'backwards',
  });
  reveal(parts, { delay: 0.25 });
}

/**
 * Opens a drawer (the OTP section) from no height to its own, then brings its parts in.
 * @param {HTMLElement} node
 * @param {Element[]} parts
 */
export function drawer(node, parts) {
  if (reduced()) return;
  const height = node.offsetHeight;
  const { overflow } = node.style;
  node.style.overflow = 'hidden';
  const anim = node.animate([
    { height: '0px', opacity: 0 }, { height: `${height}px`, opacity: 1 },
  ], { duration: 700, easing: EXPO_OUT });
  anim.finished.finally(() => { node.style.overflow = overflow; });
  reveal(parts, { delay: 0.12 });
}

/** A short sideways shake (a wrong code). */
export function shake(node) {
  if (reduced() || !node) return;
  node.animate([
    { transform: 'translateX(-7px)' },
    { transform: 'translateX(4px)', offset: 0.25 },
    { transform: 'translateX(-2px)', offset: 0.5 },
    { transform: 'translateX(1px)', offset: 0.75 },
    { transform: 'translateX(0)' },
  ], { duration: 500, easing: 'ease-out' });
}

/** A dropdown list dropping into place. */
export function dropIn(node) {
  if (reduced() || !node) return;
  node.animate([
    { transform: 'translateY(-6px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 },
  ], { duration: 280, easing: EXPO_OUT });
}

/**
 * The Reserved screen: the light comes up, the car settles out of a zoom and a blur, the word
 * fades in, then the greeting and its text.
 * @param {{bg: Element, car: Element, word: Element, text: Element[]}} parts
 */
export function reservedIn({
  bg, car, word, text,
}) {
  if (reduced()) return;
  imgOf(bg)?.animate([
    { opacity: 0, transform: 'scale(1.08)' }, { opacity: 1, transform: 'scale(1)' },
  ], { duration: 1600, easing: EXPO_OUT });
  imgOf(car)?.animate([
    { opacity: 0, transform: 'scale(1.18)', filter: 'blur(6px)' },
    { opacity: 1, transform: 'scale(1)', filter: 'blur(0)' },
  ], {
    duration: 1500, delay: 180, easing: EXPO_OUT, fill: 'backwards',
  });
  if (word) {
    word.animate([{ opacity: 0 }, { opacity: getComputedStyle(word).opacity }], {
      duration: 1200, delay: 100, easing: 'ease-out', fill: 'backwards',
    });
  }
  reveal(text, { delay: 0.75 });
}

/**
 * The buttons' hover: each letter blinks out and back at its own moment within about 0.3s
 * (buttons never move). The letters are put back as one text afterwards, so the label stays
 * plain text for screen readers and for the code that changes it.
 * @param {Element} root
 * @param {string} selector the buttons
 */
export function glitchButtons(root, selector) {
  const run = (btn) => {
    if (reduced() || btn.dataset.glitching || btn.disabled || btn.children.length) return;
    const text = btn.textContent;
    if (!text.trim()) return;
    btn.dataset.glitching = 'true';
    const letters = [...text].map((ch) => {
      const span = document.createElement('span');
      span.className = 'reserve-flow-glitch';
      span.textContent = ch;
      return span;
    });
    btn.replaceChildren(...letters);
    letters.filter((l) => l.textContent.trim()).forEach((l) => l.animate([
      { opacity: 1, offset: 0 }, { opacity: 0, offset: 0.02 },
      { opacity: 0, offset: 0.98 }, { opacity: 1, offset: 1 },
    ], { duration: 60 + Math.random() * 60, delay: Math.random() * 180 }));
    setTimeout(() => {
      // put the label back as text, unless the code has changed it meanwhile
      if (btn.querySelector(':scope > .reserve-flow-glitch')) btn.textContent = text;
      delete btn.dataset.glitching;
    }, 320);
  };
  root.addEventListener('pointerover', (e) => {
    const btn = e.target.closest(selector);
    if (btn && e.pointerType === 'mouse' && !btn.contains(e.relatedTarget)) run(btn);
  });
  root.addEventListener('focusin', (e) => {
    const btn = e.target.closest(selector);
    if (btn && btn.matches(':focus-visible')) run(btn);
  });
}
