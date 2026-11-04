/*
 * reservation-confirmation: the JSW confirmation page: the full-page landscape and a dark card
 * with the car, CONFIRMED, the personalised subheading (YOU'RE IN, NAME.) and the message.
 * The navigation is the one authored on /jsw-phase-3 (loadPillNav), the same on every JSW page.
 * Rows (fields and field groups of the model, _reservation-confirmation.json):
 *   layout  — layoutVariant: layout-centered (default) or layout-split (car left, text right);
 *             pages made before the option existed have no such row
 *   media   — background image, foreground image
 *   content — heading, subheading, message
 * Authors type {NAME} and {email} in the subheading and message. Each one is kept in the page
 * as a span holding the token as authored (data-token="{NAME}"), filled in with the first name
 * and email the visitor typed in the reservation form (kept in sessionStorage across the payment
 * redirect: FIRST_NAME_KEY, EMAIL_KEY), read when the block loads, then cleared. Without them
 * (the page opened directly, or reloaded) the name is FALLBACK_NAME and a sentence with {email}
 * is left out.
 */

import { loadPillNav } from '../jsw-nav/pill-nav.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

// the file types the block's media accept, by the asset's extension (published images keep
// their file's: media_….jpg): an asset of another type is not shown, a console warning instead
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png']; // general images: backgrounds, photos

/** an asset's file extension, from its URL's path ('' when it has none) */
function extensionOf(url) {
  try {
    const name = new URL(url, window.location.href).pathname.split('/').pop();
    return name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  } catch (e) {
    return '';
  }
}

/**
 * whether an asset's file type is accepted for its field; if not, a warning (it is not shown)
 * @param {string} url the asset
 * @param {string[]} allowed the field's extensions (IMAGE_EXTENSIONS…)
 * @param {string} field the field, for the warning (e.g. 'background image')
 * @param {string} block the block, for the warning
 */
function acceptedType(url, allowed, field, block) {
  const ext = extensionOf(url);
  if (allowed.includes(ext)) return true;
  // eslint-disable-next-line no-console
  console.warn(`${block}: the ${field} ${url} is not shown: its file type (${ext ? `.${ext}` : 'none'}) is not .${allowed.join(', .')}`);
  return false;
}

/** a picture whose image is of an accepted file type for its field, else null (not shown) */
function acceptedPicture(picture, allowed, field, block) {
  const src = picture?.querySelector('img')?.getAttribute('src');
  if (!picture || !src) return picture || null;
  return acceptedType(src, allowed, field, block) ? picture : null;
}

// the block, as named in its console warnings
const BLOCK = 'reservation-confirmation';

// the most characters each text shows, as the fields' maxLength (_reservation-confirmation.json),
// counted as shown (the name and email filled in): a longer text is cut with "..." on the page
// and named in a console warning; in the editor it stays whole (limitText below)
const LIMITS = {
  heading: 64,
  subheading: 64,
  message: 200,
};

// where the reservation form keeps the visitor's first name and email (sessionStorage)
const FIRST_NAME_KEY = 'reservationFirstName';
const EMAIL_KEY = 'reservationEmail';

// the name shown when none is kept
const FALLBACK_NAME = 'Customer';

/** the visitor's first name and email from the reservation form (the fallback name, no email) */
function readVisitor() {
  let name = '';
  let email = '';
  try {
    name = (sessionStorage.getItem(FIRST_NAME_KEY) || '').trim();
    email = (sessionStorage.getItem(EMAIL_KEY) || '').trim();
  } catch (error) { /* storage unavailable: the fallbacks */ }
  return { name: name || FALLBACK_NAME, email };
}

/** the stored first name and email cleared once shown, so a later visit shows none stale */
function forgetVisitor() {
  try {
    sessionStorage.removeItem(FIRST_NAME_KEY);
    sessionStorage.removeItem(EMAIL_KEY);
  } catch (error) { /* storage unavailable */ }
}

const LAYOUTS = ['layout-centered', 'layout-split'];

// {NAME} and {email}, in any letter case
const TOKEN = /\{(name|email)\}/gi;

/** a console warning for the author: a text over its limit (cut on the page, whole in editor) */
function warnLimit(field, length, limit) {
  // eslint-disable-next-line no-console
  console.warn(`${BLOCK}: the ${field} is ${length} characters, over its ${limit}: it is cut with "..." on the page`);
}

/**
 * an element's text within its limit (LIMITS), in place: its elements (e.g. a filled-in {NAME})
 * are kept up to the cut, the rest removed; the whole wording becomes the element's tooltip. In
 * Universal Editor kept whole (cutting it there could save the cut text), with the warning only
 * @param {Element} node the element
 * @param {number} limit its most characters
 * @param {string} field the field, for the warning
 * @param {boolean} [editing] in Universal Editor
 * @returns {boolean} whether the text was over its limit
 */
function limitText(node, limit, field, editing = false) {
  const whole = node?.textContent || '';
  if (whole.length <= limit) return false;
  warnLimit(field, whole.length, limit);
  if (editing) return true;
  node.title = whole.replace(/\s+/g, ' ').trim();
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  const texts = [];
  while (walker.nextNode()) texts.push(walker.currentNode);
  let left = Math.max(0, limit - 3);
  let cut = false;
  const emptied = new Set();
  texts.forEach((text) => {
    if (cut) {
      emptied.add(text.parentElement);
      text.remove();
    } else if (text.data.length <= left) {
      left -= text.data.length;
    } else {
      text.data = `${text.data.slice(0, left).trimEnd()}...`;
      cut = true;
    }
  });
  // the elements the cut left empty (e.g. a {NAME} after it), up to the node itself
  emptied.forEach((start) => {
    let empty = start;
    while (empty && empty !== node && !empty.hasChildNodes()) {
      const parent = empty.parentElement;
      empty.remove();
      empty = parent;
    }
  });
  return true;
}

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

/**
 * a grouped cell's fields: in Universal Editor each names its field (data-aue-prop),
 * published they come in model order (pictures and text paragraphs each in order)
 */
function fieldsOf(cell) {
  const named = (name) => cell?.querySelector(`[data-aue-prop="${name}"]`);
  const pictures = [...(cell?.querySelectorAll('picture') || [])];
  const texts = [...(cell?.querySelectorAll('p') || [])]
    .filter((p) => !p.querySelector('picture, a') && p.textContent.trim());
  return {
    picture: (name, i) => named(name)?.closest('picture') || pictures[i] || null,
    text: (name, i) => named(name) || texts[i] || null,
  };
}

/** an element of another tag, with the authored element's content and editor instrumentation */
function retag(node, tag, className) {
  const out = el(tag, className);
  if (!node) return out;
  moveInstrumentation(node, out);
  out.append(...node.childNodes);
  node.replaceWith(out);
  return out;
}

/** text with each {NAME} / {email} as a span keeping the authored token (data-token) */
function withTokens(text, visitor) {
  const frag = document.createDocumentFragment();
  let last = 0;
  text.replace(TOKEN, (token, key, at) => {
    frag.append(text.slice(last, at));
    const isEmail = key.toLowerCase() === 'email';
    const span = el('span', isEmail
      ? 'token email'
      : 'token', { 'data-token': token });
    span.textContent = isEmail ? visitor.email : visitor.name;
    frag.append(span);
    last = at + token.length;
    return token;
  });
  frag.append(text.slice(last));
  return frag;
}

/** the message, one sentence per line; a sentence with {email} is left out without an email */
function writeMessage(node, visitor) {
  const sentences = node.textContent.match(/[^.!?]+[.!?]*(?=\s|$)/g) || [];
  node.replaceChildren();
  sentences.map((s) => s.trim()).filter(Boolean).forEach((sentence) => {
    if (/\{email\}/i.test(sentence) && !visitor.email) return;
    // a space between the sentences, for the split layout where they run on as one paragraph
    if (node.childNodes.length) node.append(' ');
    const line = el('span', 'line');
    line.append(withTokens(sentence, visitor));
    node.append(line);
  });
}

/**
 * Universal Editor: while the author types in the text on the page (the editor makes it
 * contenteditable) it shows {NAME} / {email} as authored, so they are saved, not the filled-in
 * name and email; once the editing ends the text is filled in again
 */
function keepTokensWhileEditing(node, authored, fill) {
  let raw = authored;
  let showingRaw = false;
  new MutationObserver(() => {
    const typing = node.isContentEditable;
    if (typing && !showingRaw) {
      showingRaw = true;
      node.textContent = raw;
    } else if (!typing && showingRaw) {
      showingRaw = false;
      raw = node.textContent;
      fill();
    }
  }).observe(node, { attributes: true, attributeFilter: ['contenteditable'] });
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const editing = Boolean(block.closest('[data-aue-resource]'));
  const rows = [...block.children];
  // the layout row: the first of three rows, or one holding just a layout value
  const layoutRow = (rows.length > 2 || /^layout-/.test(rows[0]?.textContent.trim() || ''))
    ? rows.shift() : null;
  const chosen = layoutRow?.textContent.trim();
  const layout = LAYOUTS.includes(chosen) ? chosen : LAYOUTS[0];
  const [mediaCell, contentCell] = rows
    .map((row) => row.querySelector(':scope > div') || row);
  const media = fieldsOf(mediaCell);
  const content = fieldsOf(contentCell);

  // the full-page landscape behind everything
  const frame = el('div', 'frame');
  // the background and foreground images: JPG, JPEG or PNG (else not shown, a warning)
  const background = acceptedPicture(media.picture('media_background', 0), IMAGE_EXTENSIONS, 'background image', 'reservation-confirmation');
  if (background) {
    background.classList.add('background');
    background.querySelector('img')?.setAttribute('loading', 'eager');
    frame.append(background);
  }

  // the card: the car behind the text
  const card = el('div', 'card');
  const foreground = acceptedPicture(media.picture('media_foreground', 1), IMAGE_EXTENSIONS, 'foreground image', 'reservation-confirmation');
  if (foreground) {
    foreground.classList.add('visual');
    foreground.querySelector('img')?.setAttribute('loading', 'eager');
    card.append(foreground);
  }

  const heading = retag(content.text('content_heading', 0), 'h1', 'heading');
  const details = el('div', 'details');
  const subheading = retag(content.text('content_subheading', 1), 'p', 'subheading');
  const message = retag(content.text('content_message', 2), 'p', 'message');

  // the tokens filled in with the visitor's name and email, published and in the editor alike
  const visitor = readVisitor();
  const rawSubheading = subheading.textContent;
  const rawMessage = message.textContent;
  const fillSubheading = () => subheading
    .replaceChildren(withTokens(subheading.textContent, visitor));
  fillSubheading();
  writeMessage(message, visitor);
  limitText(heading, LIMITS.heading, 'main heading', editing);
  limitText(subheading, LIMITS.subheading, 'subheading', editing);
  limitText(message, LIMITS.message, 'message', editing);
  if (editing) {
    keepTokensWhileEditing(subheading, rawSubheading, fillSubheading);
    keepTokensWhileEditing(message, rawMessage, () => writeMessage(message, visitor));
  }
  details.append(subheading, message);

  card.append(heading, details);
  frame.append(card);
  // the JSW navigation over the landscape, once read from /jsw-phase-3
  loadPillNav().then((nav) => card.before(nav));
  block.replaceChildren(frame);
  block.classList.remove(...LAYOUTS);
  block.classList.add(layout);
  if (editing) block.classList.add('editing');
  // shown: the stored details cleared (published only; the editor never uses them up)
  else forgetVisitor();
  // the page scrolls freely: no eased wheel steps from section to section (scripts/delayed.js)
  document.body.dataset.nativeScroll = 'true';
}
