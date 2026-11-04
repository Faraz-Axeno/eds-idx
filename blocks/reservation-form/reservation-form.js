/*
 * reservation-form: the JSW reservation page ("Opt 2 / Reserve 1280x720"): a full-page
 * landscape and a card: the car on its left half, on its right the heading, subheading, the
 * form (first and last name, +91 mobile, email, city) with its button, and the small print.
 * The navigation is the one authored on /jsw-phase-3 (loadPillNav), the same on every JSW page.
 * Rows (field groups of the model, _reservation-form.json):
 *   media   — background image, foreground image; the pricing panel over the car: label,
 *             amount (₹, also what Razorpay charges), badge, note
 *   content — heading, subheading, disclaimer, pending title, pending description
 *   form    — form action URL, city options (a multi-value field: a list, or comma-separated
 *             text where multi-field rendering is off), Razorpay Key ID, name and description
 *             for the Razorpay window, button (link + text: the page after a successful
 *             payment), failure page link
 *   fields  — the placeholders of first name, last name, mobile, email and the city list
 *   (rows after these are City Option items of the earlier model: used when the city options
 *   field is empty)
 * In Universal Editor each placeholder field's instrumentation is on its input (the city list
 * placeholder on the select, the city options on the select's box), so picking the field in
 * the content tree outlines that input.
 * The button checks and cleans every field (RULES below; a field that fails gets .is-invalid
 * until it is corrected), builds the payload from the cleaned values (HTML tags stripped),
 * announces it (a "reservation:submit" event on the block, for a later backend), keeps the first
 * name and email in sessionStorage (FIRST_NAME_KEY, EMAIL_KEY: the confirmation and failure
 * pages show them), then shows the pending state (the form gives its place to
 * a spinner and the pending title and description) and takes the payment in Razorpay's window
 * (razorpay.js, in this block), which shows its loading, verification and error steps itself:
 *   paid      — the button link (confirmation page)
 *   failed    — the failure page link (also when Razorpay cannot be loaded or is not set up)
 *   closed    — back to the form (also when no page is set for the outcome)
 * In Universal Editor's edit mode the pending state is shown under the form, to be edited.
 * The outcome is kept in sessionStorage (PAYMENT_KEY) for those pages. Test mode only needs the
 * public Key ID: no backend creates orders or verifies payments yet.
 */

import { loadPillNav } from '../jsw-nav/pill-nav.js';
import { KEY_ID, loadRazorpay, payWithRazorpay } from './razorpay.js';
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

// where the visitor's first name and email are kept (sessionStorage) for the confirmation and
// failure pages (the reservation-confirmation block reads, then clears them)
const FIRST_NAME_KEY = 'reservationFirstName';
const EMAIL_KEY = 'reservationEmail';

// where the payment's outcome is kept: { status, paymentId } or { status, code, description, … }
const PAYMENT_KEY = 'reservation-payment';

// the pending state's texts when the author has left them empty
const PENDING = {
  title: 'Processing your reservation',
  description: 'Please wait while we process your request.',
};

// the most characters each authored text shows, as the fields' maxLength (_reservation-form.json):
// a longer text, saved before a limit or imported, is cut with "..." on the page and named in a
// console warning; in the editor it stays whole (limitText, limitString below). The amount
// is not cut (a cut number would be a wrong price): it keeps to one line (reservation-form.css)
const LIMITS = {
  heading: 64,
  subheading: 200,
  disclaimer: 300,
  priceLabel: 32,
  priceBadge: 16,
  priceNote: 200,
  pendingTitle: 64,
  pendingDescription: 200,
  buttonText: 24,
  placeholder: 32,
  city: 40,
  checkoutName: 64,
  checkoutDescription: 200,
};

// the block, as named in its console warnings
const BLOCK = 'reservation-form';

// placeholders when the author has left them empty
const PLACEHOLDERS = {
  firstName: 'First Name*',
  lastName: 'Last Name*',
  mobile: 'Mobile Number*',
  email: 'Email Address',
  city: 'Select City',
};

/** text without HTML tags (<script>, <div>, …) */
const stripTags = (value) => String(value).replace(/<[^>]*>?/g, '');

// letters (any script, with accents), spaces, hyphens and apostrophes; starting with a letter
const NAME = /^[\p{L}\p{M}][\p{L}\p{M}' -]*$/u;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const MOBILE = /^[6-9]\d{9}$/;

function nameRule(label) {
  return (raw) => {
    // phone keyboards type the curly apostrophe (O’Brien)
    const value = raw.trim().replace(/[\u2018\u2019]/g, "'");
    let error = '';
    if (!value) error = `Enter your ${label}.`;
    else if (value.length < 2 || value.length > 50) error = 'Use 2 to 50 characters.';
    else if (!NAME.test(value)) error = 'Use letters, spaces, - and \' only.';
    return { value, error };
  };
}

/**
 * the reservation rules, one per field: the cleaned value and an error message ('' if valid)
 * city: the context holds the authored cities and the placeholder text
 */
const RULES = {
  firstName: nameRule('first name'),
  lastName: nameRule('last name'),
  mobile: (raw) => {
    // without spaces, dashes, dots, parentheses and the +91 (or 91) country code
    const value = stripTags(raw).replace(/[\s\-().]/g, '').replace(/^\+?91(?=\d{10}$)/, '');
    let error = '';
    if (!value) error = 'Enter your mobile number.';
    else if (!MOBILE.test(value)) error = 'Enter a 10-digit number starting with 6, 7, 8 or 9.';
    return { value, error };
  },
  email: (raw) => {
    const value = stripTags(raw.trim()).toLowerCase();
    let error = '';
    if (!value) error = 'Enter your email address.';
    else if (!EMAIL.test(value)) error = 'Enter a valid email address.';
    return { value, error };
  },
  city: (raw, { cities, placeholder }) => {
    const value = raw;
    const error = (!value || value === placeholder || !cities.has(value)) ? 'Select your city.' : '';
    return { value, error };
  },
};

// ids of the error messages under the fields
let errorCount = 0;

/** a console warning for the author: a text over its limit (cut on the page, whole in editor) */
function warnLimit(field, length, limit) {
  // eslint-disable-next-line no-console
  console.warn(`${BLOCK}: the ${field} is ${length} characters, over its ${limit}: it is cut with "..." on the page`);
}

/** a text at most `limit` characters, cut with "..." when longer */
const truncate = (text, limit) => (text.length > limit
  ? `${text.slice(0, Math.max(0, limit - 3)).trimEnd()}...` : text);

/**
 * a text value (a placeholder, an option, a setting) within its limit (LIMITS); in Universal
 * Editor kept whole, with the warning only
 * @param {string} text the authored text
 * @param {number} limit its most characters
 * @param {string} field the field, for the warning (e.g. 'button text')
 * @param {boolean} [editing] in Universal Editor
 */
function limitString(text, limit, field, editing = false) {
  const value = String(text ?? '');
  if (value.length <= limit) return value;
  warnLimit(field, value.length, limit);
  return editing ? value : truncate(value, limit);
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

/**
 * an input, without any of the browser's HTML validation (required, pattern, type=email…):
 * only RULES decide. aria-required tells assistive technology which fields are needed
 */
function input(name, placeholder, attrs = {}) {
  return el('input', 'input', {
    name, placeholder, 'aria-label': placeholder.replace(/\*\s*$/, '').trim() || name, 'aria-required': 'true', ...attrs,
  });
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
  const frame = el('div', 'frame');
  // the background and foreground images: JPG, JPEG or PNG (else not shown, a warning)
  const background = acceptedPicture(media.picture('media_background', 0), IMAGE_EXTENSIONS, 'background image', 'reservation-form');
  if (background) {
    background.classList.add('background');
    background.querySelector('img')?.setAttribute('loading', 'eager');
    frame.append(background);
  }

  // the card: the car on the left, the form on the right
  const card = el('div', 'card');
  const visual = el('div', 'visual');
  const foreground = acceptedPicture(media.picture('media_foreground', 1), IMAGE_EXTENSIONS, 'foreground image', 'reservation-form');
  if (foreground) {
    foreground.querySelector('img')?.setAttribute('loading', 'eager');
    visual.append(foreground);
  }

  // the pricing panel at the foot of the car; published, the amount is the text of digits, the
  // note the long one, then label and badge in model order
  const mediaNamed = (name) => mediaCell?.querySelector(`[data-aue-prop="${name}"]`);
  const mediaTexts = [...(mediaCell?.querySelectorAll('p') || [])]
    .filter((p) => !p.querySelector('picture, a') && p.textContent.trim());
  const isAmount = (p) => /^[₹\s\d,.]+$/.test(p.textContent.trim()) && /\d/.test(p.textContent);
  const amountField = mediaNamed('media_priceAmount') || mediaTexts.find(isAmount) || null;
  const pricingTexts = mediaTexts.filter((p) => p !== amountField);
  const labelField = mediaNamed('media_priceLabel') || pricingTexts[0] || null;
  const others = pricingTexts.filter((p) => p !== labelField);
  const noteField = mediaNamed('media_priceNote')
    || others.find((p) => p.textContent.trim().length > 24) || null;
  const badgeField = mediaNamed('media_priceBadge') || others.find((p) => p !== noteField) || null;
  // the amount in rupees (10000, 10,000 or ₹10,000), shown in the Indian style (₹10,000)
  const rupees = Number((amountField?.textContent || '').replace(/[^\d.]/g, '')) || 0;
  const paise = Math.round(rupees * 100);
  if (labelField || amountField || badgeField || noteField) {
    const pricing = el('div', 'pricing');
    const top = el('div', 'pricing-top');
    if (labelField) {
      const label = retag(labelField, 'p', 'pricing-label');
      limitText(label, LIMITS.priceLabel, 'pricing label', editing);
      top.append(label);
    }
    if (badgeField) {
      const badge = retag(badgeField, 'p', 'pricing-badge');
      limitText(badge, LIMITS.priceBadge, 'pricing badge', editing);
      top.append(badge);
    }
    if (top.children.length) pricing.append(top);
    if (amountField) {
      const amount = retag(amountField, 'p', 'pricing-amount');
      if (rupees) amount.textContent = `₹${rupees.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
      pricing.append(amount);
    }
    if (noteField) {
      const note = retag(noteField, 'p', 'pricing-note');
      limitText(note, LIMITS.priceNote, 'pricing note', editing);
      pricing.append(note);
    }
    visual.append(pricing);
  }
  const body = el('div', 'body');
  const heading = retag(content.text('content_heading', 0), 'h1', 'heading');
  const subheading = retag(content.text('content_subheading', 1), 'p', 'subheading');
  const disclaimer = retag(content.text('content_disclaimer', 2), 'p', 'disclaimer');
  limitText(heading, LIMITS.heading, 'heading', editing);
  limitText(subheading, LIMITS.subheading, 'subheading', editing);
  limitText(disclaimer, LIMITS.disclaimer, 'disclaimer', editing);

  // the pending state, shown from the payment's start until the visitor is taken to its
  // outcome's page: the spinner, then the pending title and description (after the disclaimer
  // in the content group); a role="status" region, its title focused when it is shown
  const pendingView = el('div', 'pending-view', { role: 'status' });
  const spinner = el('div', 'spinner', { 'aria-hidden': 'true' });
  spinner.append(el('span', 'glow'));
  const statusTitle = retag(content.text('content_pendingHeading', 3), 'h2', 'status-title');
  const statusText = retag(content.text('content_pendingDescription', 4), 'p', 'status-text');
  statusTitle.setAttribute('tabindex', '-1');
  [[statusTitle, 'title', 'pendingTitle'], [statusText, 'description', 'pendingDescription']]
    .forEach(([node, key, limit]) => {
      if (!node.textContent.trim()) node.textContent = PENDING[key];
      else limitText(node, LIMITS[limit], `pending ${key}`, editing);
    });
  pendingView.append(spinner, statusTitle, statusText);

  // the form; the authored button link is where it leads, the action URL is kept for later
  // published the action URL and comma-separated city options are told apart by their text
  const configTexts = [...(formCell?.querySelectorAll('p') || [])]
    .filter((p) => !p.querySelector('a') && p.textContent.trim());
  const isUrl = (p) => /^(https?:\/\/|\/)\S*$/.test(p.textContent.trim());
  const named = (name) => formCell?.querySelector(`[data-aue-prop="${name}"]`);
  const actionField = named('form_action') || configTexts.find(isUrl) || null;
  // a key: one word of letters, digits and _ (rzp_test_…; also a Key Secret pasted by mistake)
  const isKey = (p) => /^[A-Za-z0-9_]{14,}$/.test(p.textContent.trim());
  const citiesField = named('form_cities') || formCell?.querySelector('ul, ol')
    || configTexts.find((p) => p !== actionField && !isKey(p) && p.textContent.includes(',')) || null;
  const buttonLink = config.link('form_button', 0);
  // Razorpay: the Key ID (rzp_…), then the name and description of its window in model order
  const keyField = named('form_razorpayKey') || configTexts.find(isKey) || null;
  const checkoutTexts = configTexts
    .filter((p) => ![actionField, citiesField, keyField].includes(p));
  const checkoutNameField = named('form_checkoutName') || checkoutTexts[0] || null;
  const checkoutDescriptionField = named('form_checkoutDescription')
    || checkoutTexts.find((p) => p !== checkoutNameField) || null;
  const failureLink = config.link('form_failure', 1);
  const keyId = keyField?.textContent.trim() || '';
  // published, a value that is not a Key ID (a pasted Key Secret?) is not kept in the page
  if (!editing && keyField && !KEY_ID.test(keyId)) keyField.textContent = '';
  const checkoutName = limitString(checkoutNameField?.textContent.trim() || 'JSW Motors', LIMITS.checkoutName, 'Razorpay name', editing);
  const checkoutDescription = limitString(checkoutDescriptionField?.textContent.trim() || '', LIMITS.checkoutDescription, 'Razorpay description', editing);
  const failurePage = failureLink?.getAttribute('href') || '';
  // the browser's own form checks are off: the fields are checked by RULES only
  const form = el('form', 'fields', { novalidate: '' });
  const action = actionField?.textContent.trim();
  if (action) form.setAttribute('action', action);

  // the placeholders, in model order (an empty one falls back to its default)
  const placeholderNodes = ['firstName', 'lastName', 'mobile', 'email', 'city']
    .map((key, i) => [key, placeholderFields.text(`fields_${key}Placeholder`, i)]);
  const placeholderText = Object.fromEntries(placeholderNodes
    .map(([key, node]) => [key, limitString(node?.textContent.trim() || PLACEHOLDERS[key], LIMITS.placeholder, `${key} placeholder`, editing)]));

  // each field with the line below it where its error message shows (empty until then)
  const errors = new Map();
  const withError = (field, wrapper = el('div', 'field')) => {
    errorCount += 1;
    const message = el('p', 'error', { id: `reservation-form-error-${errorCount}`, 'aria-live': 'polite' });
    field.setAttribute('aria-describedby', message.id);
    if (!wrapper.contains(field)) wrapper.append(field);
    wrapper.append(message);
    errors.set(field, message);
    return wrapper;
  };

  const names = el('div', 'row');
  const firstName = input('firstName', placeholderText.firstName, { autocomplete: 'given-name' });
  const lastName = input('lastName', placeholderText.lastName, { autocomplete: 'family-name' });
  names.append(withError(firstName), withError(lastName));
  const phone = el('div', 'row phone');
  const prefix = el('span', 'prefix', { 'aria-hidden': 'true' });
  prefix.textContent = '+91';
  // at most 10 digits, as typed; a number pasted or filled in with spaces, dashes or +91 is
  // cut down to its 10 digits (the browser's own limit would cut the pasted text instead)
  const mobile = input('mobile', placeholderText.mobile, {
    type: 'tel', inputmode: 'numeric', autocomplete: 'tel-national',
  });
  mobile.addEventListener('input', () => {
    let digits = mobile.value.replace(/\D/g, '');
    if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2);
    digits = digits.slice(0, 10);
    if (mobile.value !== digits) mobile.value = digits;
  });
  phone.append(prefix, withError(mobile));
  // a plain text field (the email keyboard on phones), checked by RULES.email
  const email = input('email', placeholderText.email, {
    type: 'text', inputmode: 'email', autocomplete: 'email', autocapitalize: 'off', spellcheck: 'false',
  });

  const cityWrap = el('div', 'select field');
  const city = el('select', 'input', { name: 'city', 'aria-label': 'City' });
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
  // each word starting with a capital letter, whatever the author typed (navi mumbai: Navi Mumbai)
  const capitalised = (name) => name.replace(/(^|\s)(\S)/g, (m, space, letter) => space + letter.toUpperCase());
  const cityNames = (cities.length ? cities : rowCities).map(capitalised)
    .map((name) => limitString(name, LIMITS.city, 'city option', editing));
  cityNames
    .forEach((name) => {
      const option = el('option', '', { value: name });
      option.textContent = name;
      city.append(option);
    });
  city.addEventListener('change', () => city.classList.toggle('is-chosen', Boolean(city.value)));
  cityWrap.append(city);
  withError(city, cityWrap);

  const submit = el('button', 'submit', { type: 'submit' });
  submit.textContent = limitString(buttonLink?.textContent.trim() || 'PROCEED', LIMITS.buttonText, 'button text', editing);
  const destination = buttonLink?.getAttribute('href') || '';
  if (buttonLink) moveInstrumentation(buttonLink, submit);
  form.append(names, phone, withError(email), cityWrap, submit);

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
  const settings = el('div', 'settings', { 'aria-hidden': 'true' });
  [actionField, buttonLink?.closest('p') || buttonLink, keyField, checkoutNameField,
    checkoutDescriptionField, failureLink?.closest('p') || failureLink, ...cityRows]
    .filter((node) => node && node.isConnected).forEach((node) => settings.append(node));
  form.append(settings);

  // checking: a field breaking its rule is marked (.is-invalid, aria-invalid) with its message
  // on the line below it, until the visitor corrects it; the browser shows no bubble
  const fields = {
    firstName, lastName, mobile, email, city,
  };
  const context = { cities: new Set(cityNames), placeholder: placeholderText.city };
  const check = (key) => {
    const field = fields[key];
    const result = RULES[key](field.value, context);
    const { error } = result;
    field.classList.toggle('is-invalid', Boolean(error));
    if (error) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
    errors.get(field).textContent = error;
    return result;
  };
  Object.entries(fields).forEach(([key, field]) => {
    const recheck = () => {
      if (field.classList.contains('is-invalid')) check(key);
    };
    field.addEventListener('input', recheck);
    field.addEventListener('change', recheck);
  });

  // to a page (the confirmation or failure page); false when none is set
  const go = (href) => {
    if (!href) return false;
    window.location.href = authorUrl(href);
    return true;
  };
  const remember = (key, value) => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) { /* private browsing: nothing is kept */ }
  };
  const busy = (on) => {
    submit.disabled = on;
    if (on) submit.setAttribute('aria-busy', 'true');
    else submit.removeAttribute('aria-busy');
  };
  // the pending state (.is-pending): the form keeps its place, hidden, with the spinner and the
  // status texts over it; its title is focused, so screen readers announce it
  const pending = (on) => {
    block.classList.toggle('is-pending', on);
    busy(on);
    if (on) statusTitle.focus({ preventScroll: true });
  };
  // back from the outcome's page, the browser may show this page as it was left (its
  // back/forward cache): the form again, not the pending state
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && block.classList.contains('is-pending')) pending(false);
  });
  // Razorpay's script fetched as soon as the visitor starts on the form, so its window opens
  // at once on the button (not with the page: it is not needed to show it)
  if (!editing && KEY_ID.test(keyId)) {
    form.addEventListener('focusin', () => loadRazorpay().catch(() => {}), { once: true });
  }

  form.addEventListener('submit', async (e) => {
    // never sent by the browser: checked here, then paid in Razorpay's window
    e.preventDefault();
    // in Universal Editor the button only works in its Preview mode
    if (editing && !document.documentElement.classList.contains('adobe-ue-preview')) return;
    const results = Object.fromEntries(Object.keys(fields).map((key) => [key, check(key)]));
    // any failure: stop, with the visitor taken to the first field to correct
    const failed = Object.keys(fields).find((key) => results[key].error);
    if (failed) {
      fields[failed].focus();
      return;
    }
    // the payload: the cleaned values, no HTML tags in any of them
    const payload = Object.fromEntries(Object.entries(results)
      .map(([key, { value }]) => [key, stripTags(value)]));
    block.dispatchEvent(new CustomEvent('reservation:submit', { detail: payload, bubbles: true }));
    // the visitor's first name and email (cleaned), for the outcome's page across the redirect
    try {
      sessionStorage.setItem(FIRST_NAME_KEY, payload.firstName);
      sessionStorage.setItem(EMAIL_KEY, payload.email);
    } catch (error) { /* private browsing: the outcome's page shows its fallback */ }

    // pending from here: behind Razorpay's window while the visitor pays, then until the
    // outcome's page opens
    pending(true);
    if (!KEY_ID.test(keyId) || !paise) {
      // eslint-disable-next-line no-console
      console.error('reservation-form: the block needs a Razorpay Key ID (rzp_…) and an amount');
      remember(PAYMENT_KEY, { status: 'failed', code: 'NOT_CONFIGURED' });
      if (!go(failurePage)) pending(false);
      return;
    }

    // Razorpay's final response: paid (its handler), failed (payment.failed), closed without
    // paying (ondismiss), or its window not opening within 15s (a failure), razorpay.js
    let outcome;
    try {
      outcome = await payWithRazorpay({
        key: keyId,
        amount: paise,
        currency: 'INR',
        name: checkoutName,
        description: checkoutDescription,
        prefill: {
          name: `${payload.firstName} ${payload.lastName}`,
          email: payload.email,
          contact: `+91${payload.mobile}`,
        },
        notes: { firstName: payload.firstName, lastName: payload.lastName, city: payload.city },
        theme: { color: '#000000' },
        // a failed payment goes to the failure page rather than a retry in Razorpay's window
        retry: { enabled: false },
      });
    } catch (error) {
      outcome = { status: 'failed', error: { code: 'CHECKOUT_UNAVAILABLE', description: error.message } };
    }

    // paid: the confirmation page (the button link); failed: the failure page
    if (outcome.status === 'success') {
      remember(PAYMENT_KEY, { status: 'success', paymentId: outcome.response.razorpay_payment_id });
      if (go(destination)) return;
    }
    if (outcome.status === 'failed') {
      const {
        code, description, reason, step, source,
      } = outcome.error;
      remember(PAYMENT_KEY, {
        status: 'failed', code, description, reason, step, source,
      });
      if (go(failurePage)) return;
    }
    // closed without paying (or no page set for the outcome): back to the form
    pending(false);
    submit.focus();
  });

  // the form and the pending view in one place (.views), so the card keeps its size
  const views = el('div', 'views');
  views.append(form, pendingView);
  body.append(heading, subheading, views, disclaimer);
  card.append(visual, body);
  frame.append(card);
  // the JSW navigation over the landscape, once read from /jsw-phase-3
  loadPillNav().then((nav) => card.before(nav));
  block.replaceChildren(frame);
  if (editing) block.classList.add('editing');
  // the page scrolls freely: no eased wheel steps from section to section (scripts/delayed.js)
  document.body.dataset.nativeScroll = 'true';
}
