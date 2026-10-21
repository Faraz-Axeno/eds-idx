/*
 * reservation-confirmation: the JSW confirmation page: the full-page landscape and a dark card
 * with the car, CONFIRMED, the personalised subheading (YOU'RE IN, NAME.) and the message.
 * The navigation is the JSW Navbar block, added to the page next to this block.
 * Rows (fields and field groups of the model, _reservation-confirmation.json):
 *   layout  — layoutVariant: layout-centered (default) or layout-split (car left, text right);
 *             pages made before the option existed have no such row
 *   media   — background image, foreground image
 *   content — heading, subheading, message
 * Authors type {NAME} and {email} in the subheading and message. Each one is kept in the page
 * as a span holding the token as authored (data-token="{NAME}"), so other code can find and
 * replace it; for now it shows VISITOR_NAME / VISITOR_EMAIL below.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';

// the visitor shown on the page, as in the Figma, until the real name and email are provided
const VISITOR_NAME = 'Sanjay';
const VISITOR_EMAIL = 'sanjay@email.com';

const LAYOUTS = ['layout-centered', 'layout-split'];

// {NAME} and {email}, in any letter case
const TOKEN = /\{(name|email)\}/gi;

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
function withTokens(text) {
  const frag = document.createDocumentFragment();
  let last = 0;
  text.replace(TOKEN, (token, key, at) => {
    frag.append(text.slice(last, at));
    const isEmail = key.toLowerCase() === 'email';
    const span = el('span', isEmail
      ? 'reservation-confirmation-token reservation-confirmation-email'
      : 'reservation-confirmation-token', { 'data-token': token });
    span.textContent = isEmail ? VISITOR_EMAIL : VISITOR_NAME;
    frag.append(span);
    last = at + token.length;
    return token;
  });
  frag.append(text.slice(last));
  return frag;
}

/** the message, one sentence per line; a sentence with {email} is left out without an email */
function writeMessage(node) {
  const sentences = node.textContent.match(/[^.!?]+[.!?]*(?=\s|$)/g) || [];
  node.replaceChildren();
  sentences.map((s) => s.trim()).filter(Boolean).forEach((sentence) => {
    if (/\{email\}/i.test(sentence) && !VISITOR_EMAIL) return;
    // a space between the sentences, for the split layout where they run on as one paragraph
    if (node.childNodes.length) node.append(' ');
    const line = el('span', 'reservation-confirmation-line');
    line.append(withTokens(sentence));
    node.append(line);
  });
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
  const frame = el('div', 'reservation-confirmation-frame');
  const background = media.picture('media_background', 0);
  if (background) {
    background.classList.add('reservation-confirmation-background');
    background.querySelector('img')?.setAttribute('loading', 'eager');
    frame.append(background);
  }

  // the card: the car behind the text
  const card = el('div', 'reservation-confirmation-card');
  const foreground = media.picture('media_foreground', 1);
  if (foreground) {
    foreground.classList.add('reservation-confirmation-visual');
    foreground.querySelector('img')?.setAttribute('loading', 'eager');
    card.append(foreground);
  }

  const heading = retag(content.text('content_heading', 0), 'h1', 'reservation-confirmation-heading');
  const details = el('div', 'reservation-confirmation-details');
  const subheading = retag(content.text('content_subheading', 1), 'p', 'reservation-confirmation-subheading');
  const message = retag(content.text('content_message', 2), 'p', 'reservation-confirmation-message');

  // published: the tokens filled in; in the editor the authored text exactly as typed
  if (!editing) {
    subheading.replaceChildren(withTokens(subheading.textContent));
    writeMessage(message);
  }
  details.append(subheading, message);

  card.append(heading, details);
  frame.append(card);
  block.replaceChildren(frame);
  block.classList.remove(...LAYOUTS);
  block.classList.add(layout);
  if (editing) block.classList.add('reservation-confirmation-editing');
}
