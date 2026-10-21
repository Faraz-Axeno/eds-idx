/*
 * reservation-confirmation: the JSW confirmation page ("Confirmed"): the full-page landscape,
 * the JSW pill navigation, and a dark card filled by the car with CONFIRMED over it, then the
 * personalised subheading (YOU'RE IN, NAME.) and the confirmation message.
 * Rows (fields and field groups of the model, _reservation-confirmation.json):
 *   layout  — layoutVariant: layout-centered (default) or layout-split (car left, text right);
 *             pages made before the option existed have no such row
 *   media   — background image, foreground image
 *   content — heading, subheading, message, the name used when none is known
 *   nav     — logo text, two links, the navigation button
 * The visitor's first name and email come from the reservation form (sessionStorage, see
 * reservation-form) or the page URL (?name=…&email=…); {name} and {email} are replaced.
 */

import buildPillNav from '../../scripts/jsw-pill-nav.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

// written by reservation-form.js
const RESERVATION_KEY = 'jsw-reservation';

const LAYOUTS = ['layout-centered', 'layout-split'];

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

/**
 * a grouped cell's fields: in Universal Editor each names its field (data-aue-prop),
 * published they come in model order (pictures, text paragraphs and links each in order)
 */
function fieldsOf(cell) {
  const named = (name) => cell?.querySelector(`[data-aue-prop="${name}"]`);
  const pictures = [...(cell?.querySelectorAll('picture') || [])];
  const links = [...(cell?.querySelectorAll('a') || [])];
  const texts = [...(cell?.querySelectorAll('p') || [])]
    .filter((p) => !p.querySelector('picture, a') && p.textContent.trim());
  return {
    picture: (name, i) => named(name)?.closest('picture') || pictures[i] || null,
    text: (name, i) => named(name) || texts[i] || null,
    link: (name, i) => {
      const a = named(name);
      return (a?.tagName === 'A' ? a : a?.querySelector('a')) || links[i] || null;
    },
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

/** the visitor from the form (or the URL); empty strings when unknown */
function visitor() {
  let stored = {};
  try {
    stored = JSON.parse(sessionStorage.getItem(RESERVATION_KEY) || '{}') || {};
  } catch (error) { /* storage blocked or unreadable: the URL or the fallback name */ }
  const params = new URLSearchParams(window.location.search);
  return {
    name: (params.get('name') || stored.firstName || '').trim(),
    email: (params.get('email') || stored.email || '').trim(),
  };
}

/** the message, one sentence per line; {email} in white, its sentence left out without one */
function writeMessage(node, email) {
  const sentences = node.textContent.match(/[^.!?]+[.!?]*(?=\s|$)/g) || [];
  node.replaceChildren();
  sentences.map((s) => s.trim()).filter(Boolean).forEach((sentence) => {
    if (sentence.includes('{email}') && !email) return;
    // a space between the sentences, for the split layout where they run on as one paragraph
    if (node.childNodes.length) node.append(' ');
    const line = el('span', 'reservation-confirmation-line');
    sentence.split('{email}').forEach((part, i) => {
      if (i) {
        const address = el('span', 'reservation-confirmation-email');
        address.textContent = email;
        line.append(address);
      }
      line.append(part);
    });
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
  // the layout row: the first of four rows, or one holding just a layout value
  const layoutRow = (rows.length > 3 || /^layout-/.test(rows[0]?.textContent.trim() || ''))
    ? rows.shift() : null;
  const chosen = layoutRow?.textContent.trim();
  const layout = LAYOUTS.includes(chosen) ? chosen : LAYOUTS[0];
  const [mediaCell, contentCell, navCell] = rows
    .map((row) => row.querySelector(':scope > div') || row);
  const media = fieldsOf(mediaCell);
  const content = fieldsOf(contentCell);
  const navFields = fieldsOf(navCell);

  // the full-page landscape behind everything
  const frame = el('div', 'reservation-confirmation-frame');
  const background = media.picture('media_background', 0);
  if (background) {
    background.classList.add('reservation-confirmation-background');
    background.querySelector('img')?.setAttribute('loading', 'eager');
    frame.append(background);
  }

  const nav = buildPillNav({
    brand: navFields.text('nav_brand', 0),
    links: [navFields.link('nav_link1', 0), navFields.link('nav_link2', 1)],
    cta: navFields.link('nav_cta', 2),
  });

  // the card: the car fills it, the text over it
  const card = el('div', 'reservation-confirmation-card');
  const foreground = media.picture('media_foreground', 1);
  if (foreground) {
    foreground.classList.add('reservation-confirmation-visual');
    foreground.querySelector('img')?.setAttribute('loading', 'eager');
    card.append(foreground);
  }

  const headingField = content.text('content_heading', 0);
  const subheadingField = content.text('content_subheading', 1);
  const messageField = content.text('content_message', 2);
  const fallbackField = content.text('content_fallbackName', 3);
  const fallbackName = fallbackField?.textContent.trim() || 'THERE';

  const heading = retag(headingField, 'h1', 'reservation-confirmation-heading');
  const details = el('div', 'reservation-confirmation-details');
  const subheading = retag(subheadingField, 'p', 'reservation-confirmation-subheading');
  const message = retag(messageField, 'p', 'reservation-confirmation-message');

  // published: the visitor's name and email; in the editor the authored text as written
  if (!editing) {
    const { name, email } = visitor();
    subheading.textContent = subheading.textContent.replace(/\{name\}/g, name || fallbackName);
    writeMessage(message, email);
  }
  details.append(subheading, message);

  // the fallback name is not shown: in the editor it lies invisibly over the subheading
  const settings = el('div', 'reservation-confirmation-settings', { 'aria-hidden': 'true' });
  if (fallbackField?.isConnected) settings.append(fallbackField);
  details.append(settings);

  card.append(heading, details);
  frame.append(nav, card);
  block.replaceChildren(frame);
  block.classList.remove(...LAYOUTS);
  block.classList.add(layout);
  if (editing) block.classList.add('reservation-confirmation-editing');
}
