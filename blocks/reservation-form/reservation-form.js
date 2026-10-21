/*
 * reservation-form: the JSW reservation page ("Opt 2 / Reserve 1280x720"): a full-page
 * landscape and a card: the car on its left half, on its right the heading, subheading, the
 * form (first and last name, +91 mobile, email, city) with its button, and the small print.
 * The navigation is the one authored on /jsw-phase-3 (loadJswNav), the same on every JSW page.
 * Rows (field groups of the model, _reservation-form.json):
 *   media   — background image, foreground image
 *   content — heading, subheading, disclaimer
 *   form    — form action URL, city options (a multi-value field: a list, or comma-separated
 *             text where multi-field rendering is off), button (link + text)
 *   fields  — the placeholders of first name, last name, mobile, email and the city list
 *   (rows after these are City Option items of the earlier model: used when the city options
 *   field is empty)
 * In Universal Editor each placeholder field's instrumentation is on its input (the city list
 * placeholder on the select, the city options on the select's box), so picking the field in
 * the content tree outlines that input.
 * The button checks the form, keeps the visitor's first name and email in sessionStorage (for
 * a later personalised confirmation page) and opens the button link.
 */

import { loadJswNav } from '../../scripts/jsw-pill-nav.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

// where the visitor's first name and email are kept for the confirmation page
const RESERVATION_KEY = 'jsw-reservation';

// placeholders when the author has left them empty
const PLACEHOLDERS = {
  firstName: 'First Name*',
  lastName: 'Last Name*',
  mobile: 'Mobile Number*',
  email: 'Email Address',
  city: 'Select City',
};

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

/**
 * the button link as it works where the page is open: on the AEM author pages live at
 * /content/{site}/….html, so a site path (/jsw-confirmed) gets the site root and .html there;
 * on aem.page / aem.live the link is used as authored
 */
function authorUrl(href) {
  const root = window.location.pathname.match(/^\/content\/[^/]+(?=\/)/)?.[0];
  if (!root || !href.startsWith('/') || href.startsWith('//')) return href;
  const [, path, rest] = href.match(/^([^?#]*)(.*)$/);
  const full = path.startsWith('/content/') ? path : `${root}${path}`;
  return /\.[a-z0-9]+$/i.test(full) ? `${full}${rest}` : `${full}.html${rest}`;
}

/** an input; which ones are required is fixed here, whatever the authored placeholder says */
function input(name, placeholder, required, attrs = {}) {
  const field = el('input', 'reservation-form-input', {
    name, placeholder, 'aria-label': placeholder.replace(/\*\s*$/, '').trim() || name, ...attrs,
  });
  field.required = required;
  return field;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const editing = Boolean(block.closest('[data-aue-resource]'));
  const [mediaRow, contentRow, formRow, fieldsRow, ...cityRows] = [...block.children];
  const [mediaCell, contentCell, formCell, fieldsCell] = [mediaRow, contentRow, formRow, fieldsRow]
    .map((row) => row?.querySelector(':scope > div') || row);
  const media = fieldsOf(mediaCell);
  const content = fieldsOf(contentCell);
  const config = fieldsOf(formCell);
  const placeholderFields = fieldsOf(fieldsCell);

  // the full-page landscape behind everything
  const frame = el('div', 'reservation-form-frame');
  const background = media.picture('media_background', 0);
  if (background) {
    background.classList.add('reservation-form-background');
    background.querySelector('img')?.setAttribute('loading', 'eager');
    frame.append(background);
  }

  // the card: the car on the left, the form on the right
  const card = el('div', 'reservation-form-card');
  const visual = el('div', 'reservation-form-visual');
  const foreground = media.picture('media_foreground', 1);
  if (foreground) {
    foreground.querySelector('img')?.setAttribute('loading', 'eager');
    visual.append(foreground);
  }
  const body = el('div', 'reservation-form-body');
  const heading = retag(content.text('content_heading', 0), 'h1', 'reservation-form-heading');
  const subheading = retag(content.text('content_subheading', 1), 'p', 'reservation-form-subheading');
  const disclaimer = retag(content.text('content_disclaimer', 2), 'p', 'reservation-form-disclaimer');

  // the form; the authored button link is where it leads, the action URL is kept for later
  // published the action URL and comma-separated city options are told apart by their text
  const configTexts = [...(formCell?.querySelectorAll('p') || [])]
    .filter((p) => !p.querySelector('a') && p.textContent.trim());
  const isUrl = (p) => /^(https?:\/\/|\/)\S*$/.test(p.textContent.trim());
  const named = (name) => formCell?.querySelector(`[data-aue-prop="${name}"]`);
  const actionField = named('form_action') || configTexts.find(isUrl) || null;
  const citiesField = named('form_cities') || formCell?.querySelector('ul, ol')
    || configTexts.find((p) => p !== actionField) || null;
  const buttonLink = config.link('form_button', 0);
  const form = el('form', 'reservation-form-fields', { novalidate: '' });
  const action = actionField?.textContent.trim();
  if (action) form.setAttribute('action', action);

  // the placeholders, in model order (an empty one falls back to its default)
  const placeholderNodes = ['firstName', 'lastName', 'mobile', 'email', 'city']
    .map((key, i) => [key, placeholderFields.text(`fields_${key}Placeholder`, i)]);
  const placeholderText = Object.fromEntries(placeholderNodes
    .map(([key, node]) => [key, node?.textContent.trim() || PLACEHOLDERS[key]]));

  const names = el('div', 'reservation-form-row');
  const firstName = input('firstName', placeholderText.firstName, true, { autocomplete: 'given-name' });
  const lastName = input('lastName', placeholderText.lastName, true, { autocomplete: 'family-name' });
  names.append(firstName, lastName);
  const phone = el('div', 'reservation-form-row reservation-form-phone');
  const prefix = el('span', 'reservation-form-prefix', { 'aria-hidden': 'true' });
  prefix.textContent = '+91';
  const mobile = input('mobile', placeholderText.mobile, true, {
    type: 'tel', inputmode: 'numeric', autocomplete: 'tel-national', pattern: '[6-9][0-9]{9}', maxlength: '10',
  });
  phone.append(prefix, mobile);
  const email = input('email', placeholderText.email, false, { type: 'email', autocomplete: 'email' });

  const cityWrap = el('div', 'reservation-form-select');
  const city = el('select', 'reservation-form-input', { name: 'city', 'aria-label': 'City' });
  const placeholder = el('option', '', { value: '' });
  placeholder.textContent = placeholderText.city;
  placeholder.selected = true;
  city.append(placeholder);
  // one option per city: the city options field, else City Option rows (none built in)
  const listed = citiesField?.querySelectorAll('li').length
    ? [...citiesField.querySelectorAll('li')].map((li) => li.textContent)
    : (citiesField?.textContent || '').split(',');
  const cities = listed.map((c) => c.trim()).filter(Boolean);
  const rowCities = cityRows.map((row) => row.textContent.trim()).filter(Boolean);
  (cities.length ? cities : rowCities)
    .forEach((name) => {
      const option = el('option', '', { value: name });
      option.textContent = name;
      city.append(option);
    });
  city.addEventListener('change', () => city.classList.toggle('is-chosen', Boolean(city.value)));
  cityWrap.append(city);

  const submit = el('button', 'reservation-form-submit', { type: 'submit' });
  submit.textContent = buttonLink?.textContent.trim() || 'PROCEED';
  const destination = buttonLink?.getAttribute('href') || '';
  if (buttonLink) moveInstrumentation(buttonLink, submit);
  form.append(names, phone, email, cityWrap, submit);

  // the editor instrumentation of the placeholders and city options onto what they set; the
  // authored elements themselves are then dropped
  const targets = {
    firstName, lastName, mobile, email, city,
  };
  placeholderNodes.forEach(([key, node]) => {
    if (!node) return;
    moveInstrumentation(node, targets[key]);
    node.remove();
  });
  if (citiesField) {
    moveInstrumentation(citiesField, cityWrap);
    citiesField.remove();
  }

  // the authored settings that are not shown (action URL, the button link itself, City Option
  // rows of the earlier model) stay in the block: in the editor they lie over the form
  const settings = el('div', 'reservation-form-settings', { 'aria-hidden': 'true' });
  [actionField, buttonLink?.closest('p') || buttonLink, ...cityRows]
    .filter((node) => node && node.isConnected).forEach((node) => settings.append(node));
  form.append(settings);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // in Universal Editor the button only works in its Preview mode
    if (editing && !document.documentElement.classList.contains('adobe-ue-preview')) return;
    form.classList.add('is-checked');
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form));
    try {
      sessionStorage.setItem(RESERVATION_KEY, JSON.stringify({
        firstName: data.firstName.trim(), email: data.email.trim(),
      }));
    } catch (error) { /* private browsing: nothing is kept */ }
    if (destination) window.location.href = authorUrl(destination);
  });

  body.append(heading, subheading, form, disclaimer);
  card.append(visual, body);
  frame.append(card);
  // the JSW navigation over the landscape, once read from /jsw-phase-3
  loadJswNav().then((nav) => card.before(nav));
  block.replaceChildren(frame);
  if (editing) block.classList.add('reservation-form-editing');
}
