import { createOptimizedPicture, getMetadata } from '../../scripts/aem.js';
import {
  createPayment, getPaymentStatus, redirectToPayU, normaliseStatus,
} from './reserve-payment.js';
import {
  dropIn, drawer, glitchButtons, intro, leave, reservedIn, reveal, shake,
} from './reserve-motion.js';

const OTP_LENGTH = 4;
const RESEND_SECONDS = 30;
const STORAGE_KEY = 'jsw-reserve-order';
const ITEM_IDS = ['reserve-flow-content', 'reserve-flow-option'];

/* -------------------------------------------------------------------------
 * Integration stubs — replace with the real OTP and dealer-locator services.
 * Payment goes through PayU via JSW's reservation API (reserve-payment.js),
 * configured with the page metadata "Reserve API". Without it the page runs
 * in demo mode and payments always succeed.
 * ---------------------------------------------------------------------- */

/** Send an OTP to the given mobile number. */
async function sendOtp(/* mobile */) {
  return true;
}

/** Verify an OTP. Demo: any 4 digits pass except 0000. */
async function verifyOtp(code) {
  await new Promise((r) => { setTimeout(r, 900); });
  return /^\d{4}$/.test(code) && code !== '0000';
}

/** Look up dealers near a pincode, nearest first. */
async function findDealers(pincode) {
  await new Promise((r) => { setTimeout(r, 300); });
  if (!/^[1-9]\d{5}$/.test(pincode)) return null;
  return {
    city: 'Delhi, Delhi',
    total: 27,
    dealers: [
      { id: 'mathura-road', name: 'JSW Motors, Matura Road, Delhi', distance: 2.5 },
      { id: 'okhla-3', name: 'JSW Motors, Okhla Phase 3', distance: 4.1 },
      { id: 'nehru-place', name: 'JSW Motors, Nehru Place', distance: 5.8 },
      { id: 'lajpat-nagar', name: 'JSW Motors, Lajpat Nagar', distance: 7.2 },
      { id: 'noida-62', name: 'JSW Motors, Noida Sector 62', distance: 12.4 },
    ],
  };
}

/** Demo-mode payment (no "Reserve API" configured): always succeeds. */
async function demoPayment() {
  await new Promise((r) => { setTimeout(r, 1200); });
  return { status: 'success' };
}

/* ---------------------------------------------------------------------- */

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (v === false || v === null || v === undefined) return;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v === true ? '' : v);
  });
  node.append(...children.filter(Boolean));
  return node;
};

const cellText = (cell) => (cell ? cell.textContent.trim() : '');

const maskMobile = (digits) => {
  const d = digits.replace(/\D/g, '');
  if (d.length < 5) return d;
  return `${d.slice(0, 2)}XXX XX${d.slice(-3)}`;
};

const readOrder = () => {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
};

const saveOrder = (order) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch (e) { /* storage unavailable */ }
};

const clearOrder = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) { /* storage unavailable */ }
};

// the parts of a step that come in one after another (reserve-motion.js reveal)
const STEP_PARTS = [
  ':scope > .reserve-flow-group > .reserve-flow-head',
  ':scope > .reserve-flow-head',
  '.reserve-flow-form > .reserve-flow-fields > *',
  '.reserve-flow-form > .reserve-flow-consent',
  '.reserve-flow-form > .reserve-flow-actions',
  ':scope > .reserve-flow-config > *',
  ':scope > .reserve-flow-actions',
  ':scope > .reserve-flow-legal',
].join(', ');

/** The visible parts of a step, in page order. */
const stepParts = (step) => (step
  ? [...step.querySelectorAll(STEP_PARTS)].filter((n) => !n.closest('[hidden]'))
  : []);

/**
 * The reservation journey's path: this page on the journey, its parent on the status page
 * (/reserve/status -> /reserve).
 * @param {boolean} onStatusPage
 */
function journeyPath(onStatusPage) {
  const path = window.location.pathname.replace(/\/$/, '');
  return (onStatusPage ? path.replace(/\/[^/]*$/, '') : path) || '';
}

// the payment status page and its ?payment= values (failed is "error" there)
const STATUS_PATH = 'status';
const STATUS_PARAM = { success: 'success', pending: 'pending', failed: 'error' };

/**
 * The status page's URL: /reserve/status?payment=<status>&txnid=<id>. The payment value is
 * only a hint (and the demo mode's choice): the page shows what the payment API confirms.
 * @param {string} base the journey path
 * @param {string} [status] success | pending | failed
 * @param {string} [txnid]
 */
function statusUrl(base, status, txnid) {
  const url = new URL(`${base}/${STATUS_PATH}`, window.location.origin);
  if (status) url.searchParams.set('payment', STATUS_PARAM[status] || 'pending');
  if (txnid) url.searchParams.set('txnid', txnid);
  return url.href;
}

/**
 * Split authored rich text (a cell) into its heading, paragraphs and link.
 * @param {Element} cell
 */
function parseRich(cell) {
  const out = {
    tag: '', heading: null, subheading: null, body: [], button: '', note: '',
  };
  if (!cell) return out;
  const root = cell.querySelector(':scope > div') || cell;
  let seenHeading = false;
  [...root.children].forEach((child) => {
    // skip empty paragraphs (rich text from AEM can wrap headings in <p>)
    if (child.tagName === 'P' && !child.textContent.trim() && !child.querySelector('img')) return;
    if (/^H[1-6]$/.test(child.tagName)) {
      if (!out.heading) out.heading = child;
      else out.subheading = child;
      seenHeading = true;
      return;
    }
    const link = child.querySelector('a');
    if (link && !out.button && seenHeading) {
      out.button = link.textContent.trim();
      return;
    }
    if (!seenHeading) {
      out.tag = child.textContent.trim();
      return;
    }
    if (out.button) out.note = child.innerHTML;
    else out.body.push(child);
  });
  return out;
}

/**
 * Authored structure:
 *   rows 1-4 (one cell each): car image, price label, price, price note
 *   item rows may start with the component id (reserve-flow-content or
 *   reserve-flow-option), which is ignored
 *   content rows (key | text | image), keys:
 *     details     heading + intro of step 1
 *     consent     consent checkbox text
 *     legal       data-protection notice
 *     configure   heading + "Select your variant" label of step 2
 *     pending     tag, heading, text, button link, note
 *     failed      tag, heading, text, button link, note
 *     reserved    heading, sub-heading ({firstName}), text ({email}),
 *                 background image
 *     reserved-car  car image of the reserved screen
 *     price-mobile  price label on mobile
 *   option rows (type | name | swatch colours | image | code | exteriors),
 *     types: variant, exterior, interior
 *     code: sent with the reservation as variantCode / exteriorCode /
 *     interiorCode
 *     exteriors (interior rows): comma-separated exterior colour names or
 *     codes the interior is offered with; empty = offered with every exterior.
 *     The same interior name may be authored more than once (e.g. a different
 *     swatch per exterior colour).
 * @param {Element} block
 */
export default function decorate(block) {
  // the steps grow past one screen (OTP, Build your Combat, phones): the section scrolls
  // natively instead of snapping (scripts/section-snap.js reads the class later)
  block.closest('.section')?.classList.add('no-snap');
  // the reservation journey, or the payment status page (the Reserve Status block, which
  // hands its rows over in this block's shape with the class "status": reserve-status.js)
  const statusPage = block.classList.contains('status');
  const journey = journeyPath(statusPage);
  const fieldRows = [];
  const authored = {};
  const options = { variant: [], exterior: [], interior: [] };

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    // authored/imported item rows may start with the child component id
    // (needed by md2jcr); the published markup has no such cell
    if (cells.length > 2 && ITEM_IDS.includes(cellText(cells[0]).toLowerCase())) cells.shift();
    if (cells.length < 2) {
      fieldRows.push(cells[0]);
      return;
    }
    const key = cellText(cells[0]).toLowerCase();
    if (options[key]) {
      options[key].push({
        name: cellText(cells[1]),
        swatch: cellText(cells[2]).split(/[\s,/]+/).filter(Boolean),
        img: cells[3] ? cells[3].querySelector('img') : null,
        code: cellText(cells[4]),
        exteriors: cellText(cells[5]).split(/\s*[,;]\s*/)
          .map((n) => n.toLowerCase()).filter(Boolean),
      });
    } else if (key) {
      authored[key] = { text: cells[1], img: cells[2] ? cells[2].querySelector('img') : null };
    }
  });

  const [imageCell, priceLabelCell, priceCell, priceNoteCell] = fieldRows;
  const textOf = (key) => (authored[key] ? authored[key].text : null);
  const imgOf = (key) => (authored[key] ? authored[key].img : null);
  const priceLabelMobileCell = textOf('price-mobile');
  const consentCell = textOf('consent');
  const legalCell = textOf('legal');

  const details = parseRich(textOf('details'));
  const configure = parseRich(textOf('configure'));
  const pending = parseRich(textOf('pending'));
  const failed = parseRich(textOf('failed'));
  const reserved = parseRich(textOf('reserved'));
  const consentHtml = consentCell ? (consentCell.querySelector('p') || consentCell).innerHTML : '';
  const legalHtml = legalCell ? (legalCell.querySelector('p') || legalCell).innerHTML : '';

  /* ---------------- media column ---------------- */
  const media = el('div', { class: 'reserve-flow-media' });
  const defaultImg = imageCell && imageCell.querySelector('img');
  const pictures = new Map();
  const addPicture = (img, eager) => {
    if (!img || pictures.has(img.src)) return;
    const pic = createOptimizedPicture(img.src, img.alt || '', eager, [
      { media: '(min-width: 900px)', width: '1200' }, { width: '750' },
    ]);
    pic.classList.add('reserve-flow-car');
    pictures.set(img.src, pic);
    media.append(pic);
  };
  addPicture(defaultImg, true);
  options.exterior.forEach((o) => addPicture(o.img, false));
  const showCar = (src) => {
    if (!src || !pictures.has(src)) return;
    pictures.forEach((pic, key) => pic.classList.toggle('is-active', key === src));
  };
  showCar(defaultImg ? defaultImg.src : [...pictures.keys()][0]);

  const priceLabel = cellText(priceLabelCell);
  const priceLabelMobile = cellText(priceLabelMobileCell) || priceLabel;
  media.append(el(
    'div',
    { class: 'reserve-flow-price' },
    el(
      'p',
      { class: 'reserve-flow-price-label' },
      el('span', { class: 'reserve-flow-desktop-only', text: priceLabel }),
      el('span', { class: 'reserve-flow-mobile-only', text: priceLabelMobile }),
    ),
    el('p', { class: 'reserve-flow-price-amount', text: cellText(priceCell) }),
    cellText(priceNoteCell) && el('p', { class: 'reserve-flow-price-note', text: cellText(priceNoteCell) }),
  ));

  /* ---------------- step 1: details + OTP ---------------- */
  const otpBoxes = Array.from({ length: OTP_LENGTH }, (_, i) => el('input', {
    class: 'reserve-flow-otp-box',
    type: 'text',
    inputmode: 'numeric',
    maxlength: '1',
    placeholder: '-',
    'aria-label': `Digit ${i + 1} of ${OTP_LENGTH}`,
    autocomplete: i === 0 ? 'one-time-code' : 'off',
  }));

  const field = (name, attrs, error) => el(
    'div',
    { class: `reserve-flow-field reserve-flow-field-${name}` },
    el('input', { name, ...attrs }),
    el('p', { class: 'reserve-flow-error', id: `rf-${name}-error`, text: error }),
  );

  const detailsStep = el('section', { class: 'reserve-flow-step', 'data-step': 'details' });
  const detailsHead = el('div', { class: 'reserve-flow-head' });
  if (details.heading) {
    const h = el('h2');
    h.innerHTML = details.heading.innerHTML;
    detailsHead.append(h);
  }
  details.body.forEach((p) => { p.classList.add('reserve-flow-intro'); detailsHead.append(p); });

  const form = el('form', { class: 'reserve-flow-form', novalidate: true });
  form.innerHTML = `
    <div class="reserve-flow-fields">
      <div class="reserve-flow-row reserve-flow-row-name"></div>
      <div class="reserve-flow-row reserve-flow-row-phone">
        <input class="reserve-flow-code" name="code" value="+91" readonly aria-label="Country code" tabindex="-1">
      </div>
    </div>
    <label class="reserve-flow-consent">
      <input type="checkbox" name="consent">
      <span class="reserve-flow-check" aria-hidden="true"></span>
      <span class="reserve-flow-consent-text"></span>
    </label>
    <div class="reserve-flow-actions">
      <button type="submit" class="reserve-flow-btn" data-action="get-otp">Get OTP</button>
    </div>`;
  const nameRow = form.querySelector('.reserve-flow-row-name');
  nameRow.append(
    field('firstName', {
      type: 'text', placeholder: 'First Name*', autocomplete: 'given-name', required: true,
    }, 'Enter your first name'),
    field('lastName', {
      type: 'text', placeholder: 'Last Name*', autocomplete: 'family-name', required: true,
    }, 'Enter your last name'),
  );
  form.querySelector('.reserve-flow-row-phone').append(field('mobile', {
    type: 'tel', placeholder: 'Mobile Number*', autocomplete: 'tel-national', inputmode: 'numeric', maxlength: '11', required: true,
  }, 'Enter a valid 10-digit mobile number'));
  form.querySelector('.reserve-flow-fields').append(field('email', {
    type: 'email', placeholder: 'Email Address*', autocomplete: 'email', required: true,
  }, 'Enter a valid email address'));
  form.querySelector('.reserve-flow-consent-text').innerHTML = consentHtml;

  const otpNumber = el('button', { type: 'button', class: 'reserve-flow-otp-number', 'aria-label': 'Change mobile number' });
  const otpStatus = el('p', { class: 'reserve-flow-otp-status', role: 'status', 'aria-live': 'polite' });
  const resendRow = el('p', { class: 'reserve-flow-resend' });
  const otpSection = el(
    'div',
    { class: 'reserve-flow-otp', hidden: true },
    el(
      'div',
      { class: 'reserve-flow-head' },
      el('h3', { text: 'Enter your OTP' }),
      el('p', { class: 'reserve-flow-intro' }, `Enter the ${OTP_LENGTH} Digit code sent on `, otpNumber),
    ),
    el('div', { class: 'reserve-flow-otp-group' }, el('div', { class: 'reserve-flow-otp-boxes', role: 'group', 'aria-label': 'One-time password' }, ...otpBoxes), otpStatus),
    resendRow,
  );
  const legal = el('p', { class: 'reserve-flow-legal' });
  legal.innerHTML = legalHtml;
  detailsStep.append(el('div', { class: 'reserve-flow-group' }, detailsHead, form), otpSection, legal);

  /* ---------------- step 2: configure ---------------- */
  const configureStep = el('section', { class: 'reserve-flow-step', 'data-step': 'configure', hidden: true });
  const configureHead = el('div', { class: 'reserve-flow-head' });
  if (configure.heading) {
    const h = el('h2');
    h.innerHTML = configure.heading.innerHTML;
    configureHead.append(h);
  }
  const variantLabel = configure.body[0] ? configure.body[0].textContent.trim() : 'Select your variant';

  const variantTabs = el('div', { class: 'reserve-flow-tabs', role: 'radiogroup', 'aria-label': variantLabel });
  options.variant.forEach((v, i) => {
    variantTabs.append(el('button', {
      type: 'button',
      role: 'radio',
      'aria-checked': i === 0 ? 'true' : 'false',
      'data-value': v.name,
      'data-code': v.code || false,
      text: v.name,
    }));
  });

  const swatchGroup = (type, label) => {
    const list = options[type];
    if (!list.length) return null;
    const current = el('span', { class: 'reserve-flow-swatch-name', text: list[0].name });
    const swatches = el('div', { class: 'reserve-flow-swatches', role: 'radiogroup', 'aria-label': label });
    list.forEach((o, i) => {
      const [c1, c2] = o.swatch.length ? o.swatch : ['#808080'];
      const btn = el('button', {
        type: 'button',
        role: 'radio',
        class: `reserve-flow-swatch${c2 ? ' is-split' : ''}`,
        'aria-checked': i === 0 ? 'true' : 'false',
        'aria-label': o.name,
        title: o.name,
        'data-value': o.name,
        'data-code': o.code || false,
        'data-img': o.img ? o.img.src : '',
        'data-exteriors': o.exteriors && o.exteriors.length ? o.exteriors.join('|') : false,
      });
      btn.style.setProperty('--swatch-1', c1);
      btn.style.setProperty('--swatch-2', c2 || c1);
      swatches.append(btn);
    });
    return el(
      'div',
      { class: 'reserve-flow-colour', 'data-type': type },
      el('p', { class: 'reserve-flow-label' }, `${label} `, current),
      swatches,
    );
  };

  const pincode = field('pincode', {
    type: 'text', placeholder: 'Pincode*', inputmode: 'numeric', maxlength: '6', autocomplete: 'postal-code',
  }, 'Enter a valid 6-digit pincode');
  const pincodeHint = el('p', { class: 'reserve-flow-hint', 'aria-live': 'polite' });
  pincode.append(pincodeHint);

  const dealerButton = el(
    'button',
    {
      type: 'button',
      class: 'reserve-flow-select',
      'aria-haspopup': 'listbox',
      'aria-expanded': 'false',
      'aria-controls': 'rf-dealer-list',
      disabled: true,
    },
    el('span', { class: 'reserve-flow-select-value', text: 'Select dealership*' }),
    el('span', { class: 'reserve-flow-chevron', 'aria-hidden': 'true' }),
  );
  const dealerList = el('ul', {
    class: 'reserve-flow-listbox', id: 'rf-dealer-list', role: 'listbox', 'aria-label': 'Dealership', tabindex: '-1', hidden: true,
  });
  const dealerField = el(
    'div',
    { class: 'reserve-flow-field reserve-flow-field-dealer' },
    dealerButton,
    dealerList,
    el('p', { class: 'reserve-flow-hint', text: 'Nearest dealer is pre-selected. You can change it.' }),
  );

  const backBtn = el('button', {
    type: 'button', class: 'reserve-flow-btn is-outline', 'data-action': 'back', text: 'Go back',
  });
  const payBtn = el('button', {
    type: 'button', class: 'reserve-flow-btn', 'data-action': 'pay', disabled: true, text: 'Proceed to pay',
  });

  configureStep.append(
    configureHead,
    el(
      'div',
      { class: 'reserve-flow-config' },
      options.variant.length ? el('div', { class: 'reserve-flow-variant' }, el('p', { class: 'reserve-flow-label is-muted', text: variantLabel }), variantTabs) : null,
      el('div', { class: 'reserve-flow-colours' }, swatchGroup('exterior', 'Exterior Colour'), swatchGroup('interior', 'Interior Colour')),
      el('div', { class: 'reserve-flow-location' }, pincode, dealerField),
    ),
    el('div', { class: 'reserve-flow-actions' }, backBtn, payBtn),
    el('p', {
      class: 'reserve-flow-alert', role: 'alert', 'data-for': 'pay', hidden: true,
    }),
    legal.cloneNode(true),
  );

  /* ---------------- payment status ---------------- */
  const statusStep = (name, content, tone) => {
    const step = el('section', {
      class: 'reserve-flow-step reserve-flow-status', 'data-step': name, hidden: true,
    });
    const head = el('div', { class: 'reserve-flow-head' });
    if (content.tag) head.append(el('p', { class: `reserve-flow-tag is-${tone}`, text: content.tag }));
    if (content.heading) {
      const h = el('h2');
      h.innerHTML = content.heading.innerHTML;
      head.append(h);
    }
    content.body.forEach((p) => { p.classList.add('reserve-flow-intro'); head.append(p); });
    step.append(head);
    if (content.button) {
      step.append(el('div', { class: 'reserve-flow-actions' }, el('button', {
        type: 'button', class: 'reserve-flow-btn', 'data-action': `${name}-retry`, text: content.button,
      })));
      step.append(el('p', { class: 'reserve-flow-alert', role: 'alert', hidden: true }));
    }
    if (content.note) {
      const note = el('p', { class: 'reserve-flow-legal' });
      note.innerHTML = content.note;
      step.append(note);
    }
    return step;
  };
  const pendingStep = statusStep('pending', pending, 'warning');
  const failedStep = statusStep('failed', failed, 'error');

  const panel = el('div', { class: 'reserve-flow-panel' }, detailsStep, configureStep, pendingStep, failedStep);

  /* ---------------- reserved ---------------- */
  const reservedScreen = el('section', { class: 'reserve-flow-reserved', 'data-step': 'reserved', hidden: true });
  const reservedBg = imgOf('reserved');
  if (reservedBg) {
    const bg = createOptimizedPicture(reservedBg.src, '', false, [{ width: '1600' }]);
    bg.classList.add('reserve-flow-reserved-bg');
    reservedScreen.append(bg);
  }
  const reservedHero = el('div', { class: 'reserve-flow-reserved-hero' });
  if (reserved.heading) reservedHero.append(el('h2', { text: reserved.heading.textContent.trim() }));
  const reservedCar = imgOf('reserved-car');
  if (reservedCar) {
    const car = createOptimizedPicture(reservedCar.src, reservedCar.alt || '', false, [{ width: '1600' }]);
    car.classList.add('reserve-flow-reserved-car');
    reservedHero.append(car);
  }
  const reservedTitle = el('h3');
  const reservedBody = el('p');
  reservedScreen.append(reservedHero, el('div', { class: 'reserve-flow-reserved-text' }, reservedTitle, reservedBody));
  const reservedTitleTpl = reserved.subheading ? reserved.subheading.textContent.trim() : "You're in, {firstName}.";
  const reservedBodyTpl = reserved.body.map((p) => p.innerHTML).join('<br>');

  block.replaceChildren(media, panel, reservedScreen);

  /* ======================= behaviour ======================= */
  const state = {
    otpSent: false,
    verified: false,
    variant: options.variant[0] ? options.variant[0].name : '',
    exterior: options.exterior[0] ? options.exterior[0].name : '',
    interior: options.interior[0] ? options.interior[0].name : '',
    variantCode: options.variant[0] ? options.variant[0].code : '',
    exteriorCode: options.exterior[0] ? options.exterior[0].code : '',
    interiorCode: options.interior[0] ? options.interior[0].code : '',
    dealers: [],
    dealer: null,
  };
  const inputs = {
    firstName: form.elements.firstName,
    lastName: form.elements.lastName,
    mobile: form.elements.mobile,
    email: form.elements.email,
  };
  const getOtpBtn = form.querySelector('[data-action="get-otp"]');

  const showStep = (name) => {
    block.dataset.step = name;
    panel.querySelectorAll('.reserve-flow-step').forEach((s) => { s.hidden = s.dataset.step !== name; });
    reservedScreen.hidden = name !== 'reserved';
    // step 2 previews the chosen exterior colour; other steps show the hero car
    const chosen = configureStep.querySelector('[data-type="exterior"] [aria-checked="true"]');
    if (name === 'configure' && chosen && chosen.dataset.img) showCar(chosen.dataset.img);
    else if (defaultImg) showCar(defaultImg.src);
    if (name === 'reserved') {
      [media, panel].forEach((n) => { n.hidden = true; });
    } else {
      [media, panel].forEach((n) => { n.hidden = false; });
    }
    const focusTarget = block.querySelector(`[data-step="${name}"] h2`);
    if (focusTarget) {
      focusTarget.setAttribute('tabindex', '-1');
      focusTarget.focus({ preventScroll: true });
    }
    if (block.getBoundingClientRect().top < 0) block.scrollIntoView({ behavior: 'smooth' });
  };

  // a step change: the current step leaves (12px up, into a blur), the next arrives part by
  // part; the Reserved screen has its own entrance. The first step of a page shows at once
  // (the page's intro brings it in)
  let leaving = null;
  const setStep = (name, { animate = true } = {}) => {
    const prev = block.dataset.step;
    const from = prev && prev !== name && panel.querySelector(`.reserve-flow-step[data-step="${prev}"]:not([hidden])`);
    const arrive = () => {
      showStep(name);
      if (!animate || !prev || prev === name) return;
      if (name === 'reserved') {
        reservedIn({
          bg: reservedScreen.querySelector('.reserve-flow-reserved-bg'),
          car: reservedScreen.querySelector('.reserve-flow-reserved-car'),
          word: reservedScreen.querySelector('.reserve-flow-reserved-hero h2'),
          text: [...reservedScreen.querySelectorAll('.reserve-flow-reserved-text > *')],
        });
      } else {
        reveal(stepParts(panel.querySelector(`.reserve-flow-step[data-step="${name}"]`)));
      }
    };
    if (!animate || !from) {
      arrive();
      return;
    }
    const token = {};
    leaving = token;
    leave(from).then(() => { if (leaving === token) arrive(); });
  };

  /* ---- validation ---- */
  const validators = {
    firstName: (v) => !!v.trim(),
    lastName: (v) => !!v.trim(),
    mobile: (v) => /^[6-9]\d{9}$/.test(v.replace(/\s/g, '')),
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
  };
  const setInvalid = (input, invalid) => {
    const wrap = input.closest('.reserve-flow-field');
    wrap.classList.toggle('has-error', invalid);
    if (invalid) {
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', `rf-${input.name}-error`);
    } else {
      input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
    }
  };
  const validateAll = () => {
    let first = null;
    Object.entries(inputs).forEach(([name, input]) => {
      const ok = validators[name](input.value);
      setInvalid(input, !ok);
      if (!ok && !first) first = input;
    });
    return first;
  };

  /* ---- resend timer ---- */
  let timerId = null;
  const stopTimer = () => { clearInterval(timerId); timerId = null; };
  const renderResend = (remaining) => {
    resendRow.replaceChildren();
    if (state.verified) return;
    if (remaining > 0) {
      resendRow.append('Resend code in ', el('span', { class: 'reserve-flow-link', text: `${remaining} sec` }));
    } else {
      resendRow.append("Didn't get the code? ", el('button', {
        type: 'button', class: 'reserve-flow-link', 'data-action': 'resend', text: 'Resend code',
      }));
    }
  };
  const startTimer = () => {
    stopTimer();
    let remaining = RESEND_SECONDS;
    renderResend(remaining);
    timerId = setInterval(() => {
      remaining -= 1;
      renderResend(remaining);
      if (remaining <= 0) stopTimer();
    }, 1000);
  };

  /* ---- OTP ---- */
  const otpValue = () => otpBoxes.map((b) => b.value).join('');
  const setOtpState = (name, message = '') => {
    otpSection.dataset.state = name;
    otpStatus.textContent = message;
    otpStatus.hidden = !message;
    otpBoxes.forEach((b) => {
      b.classList.toggle('is-error', name === 'error');
      b.classList.toggle('is-verified', name === 'verified');
      b.readOnly = name === 'verified' || name === 'verifying';
    });
  };
  const resetOtp = () => {
    stopTimer();
    state.otpSent = false;
    state.verified = false;
    otpBoxes.forEach((b) => { b.value = ''; });
    setOtpState('empty');
    otpSection.hidden = true;
    getOtpBtn.textContent = 'Get OTP';
    block.classList.remove('is-verified');
  };

  const requestOtp = async () => {
    otpBoxes.forEach((b) => { b.value = ''; });
    setOtpState('empty');
    otpNumber.textContent = `+91 ${maskMobile(inputs.mobile.value)}`;
    otpSection.hidden = false;
    drawer(otpSection, [...otpSection.querySelectorAll(':scope > *')]);
    state.otpSent = true;
    startTimer();
    await sendOtp(inputs.mobile.value.replace(/\s/g, ''));
    otpBoxes[0].focus({ preventScroll: true });
    otpSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const tryVerify = async () => {
    const code = otpValue();
    if (code.length !== OTP_LENGTH) return;
    setOtpState('verifying', 'Verifying your code...');
    const ok = await verifyOtp(code);
    if (ok) {
      stopTimer();
      state.verified = true;
      setOtpState('verified');
      otpStatus.hidden = false;
      otpStatus.replaceChildren(el('span', { class: 'reserve-flow-verified', text: 'Number verified' }));
      renderResend(0);
      getOtpBtn.textContent = 'Continue';
      block.classList.add('is-verified');
      reveal([otpStatus], { y: 6, duration: 0.45 });
      // as the prototype, the flow moves on by itself a moment later (Continue does the same)
      setTimeout(() => {
        if (state.verified && block.dataset.step === 'details') form.requestSubmit(getOtpBtn);
      }, 950);
    } else {
      setOtpState('error', "That code isn't right. Check and try again.");
      shake(otpSection.querySelector('.reserve-flow-otp-boxes'));
      if (!timerId) renderResend(0);
    }
  };

  otpBoxes.forEach((box, i) => {
    // a box's digit is selected when it gets the focus, so typing replaces it (after a wrong
    // code the digits stay, in red, as the design shows)
    box.addEventListener('focus', () => box.select());
    box.addEventListener('input', () => {
      box.value = box.value.replace(/\D/g, '').slice(0, 1);
      if (otpSection.dataset.state === 'error') setOtpState('empty');
      if (box.value && i < OTP_LENGTH - 1) otpBoxes[i + 1].focus();
      tryVerify();
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && i > 0) otpBoxes[i - 1].focus();
    });
    box.addEventListener('paste', (e) => {
      e.preventDefault();
      if (box.readOnly) return;
      const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, OTP_LENGTH);
      digits.split('').forEach((d, idx) => { otpBoxes[idx].value = d; });
      (otpBoxes[digits.length] || otpBoxes[OTP_LENGTH - 1]).focus();
      tryVerify();
    });
  });

  otpNumber.addEventListener('click', () => {
    resetOtp();
    inputs.mobile.focus();
  });

  resendRow.addEventListener('click', async (e) => {
    if (!e.target.closest('[data-action="resend"]')) return;
    otpBoxes.forEach((b) => { b.value = ''; });
    setOtpState('empty');
    startTimer();
    await sendOtp(inputs.mobile.value.replace(/\s/g, ''));
    otpBoxes[0].focus();
  });

  Object.entries(inputs).forEach(([name, input]) => {
    input.addEventListener('input', () => {
      if (name === 'mobile') {
        input.value = input.value.replace(/[^\d\s]/g, '');
        if (state.otpSent) resetOtp();
      }
      if (input.closest('.has-error')) setInvalid(input, !validators[name](input.value));
    });
    input.addEventListener('blur', () => {
      if (input.value) setInvalid(input, !validators[name](input.value));
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const invalid = validateAll();
    if (invalid) {
      invalid.focus();
      return;
    }
    if (state.verified) {
      setStep('configure');
      return;
    }
    requestOtp();
  });

  /* ---- configure ---- */
  const radioGroup = (group, onChange) => {
    const allRadios = () => [...group.querySelectorAll('[role="radio"]')];
    const radios = () => allRadios().filter((r) => !r.hidden);
    const select = (btn) => {
      allRadios().forEach((r) => {
        r.setAttribute('aria-checked', r === btn ? 'true' : 'false');
        r.tabIndex = r === btn ? 0 : -1;
      });
      onChange(btn);
    };
    radios().forEach((r) => { r.tabIndex = r.getAttribute('aria-checked') === 'true' ? 0 : -1; });
    group.addEventListener('click', (e) => {
      const btn = e.target.closest('[role="radio"]');
      if (btn) select(btn);
    });
    group.addEventListener('keydown', (e) => {
      const list = radios();
      const idx = list.indexOf(document.activeElement);
      if (idx < 0) return;
      let next = null;
      if (['ArrowRight', 'ArrowDown'].includes(e.key)) next = list[(idx + 1) % list.length];
      if (['ArrowLeft', 'ArrowUp'].includes(e.key)) next = list[(idx - 1 + list.length) % list.length];
      if (next) {
        e.preventDefault();
        next.focus();
        select(next);
      }
    });
    return select;
  };

  /* interior colours offered depend on the chosen exterior colour */
  const interiorGroup = configureStep.querySelector('.reserve-flow-colour[data-type="interior"]');
  let selectInterior = null;
  const filterInteriors = (exteriorBtn) => {
    if (!interiorGroup || !options.exterior.length) return;
    // an interior lists the exteriors it is offered with by name or by code
    const ext = exteriorBtn
      ? [exteriorBtn.dataset.value, exteriorBtn.dataset.code]
        .filter(Boolean).map((v) => v.toLowerCase())
      : [];
    const all = [...interiorGroup.querySelectorAll('[role="radio"]')];
    all.forEach((b) => {
      const allowed = b.dataset.exteriors ? b.dataset.exteriors.split('|') : [];
      b.hidden = allowed.length > 0 && !allowed.some((a) => ext.includes(a));
    });
    const available = all.filter((b) => !b.hidden);
    interiorGroup.hidden = !available.length;
    if (!available.length) {
      state.interior = '';
      state.interiorCode = '';
      return;
    }
    const current = all.find((b) => b.getAttribute('aria-checked') === 'true');
    // keep the shopper's interior if it is also offered with this exterior
    // (re-selecting also restores it after an exterior with no interiors)
    const same = current && (current.hidden
      ? available.find((b) => b.dataset.value === current.dataset.value)
      : current);
    selectInterior(same || available[0]);
  };

  radioGroup(variantTabs, (btn) => {
    state.variant = btn.dataset.value;
    state.variantCode = btn.dataset.code || '';
  });
  configureStep.querySelectorAll('.reserve-flow-colour').forEach((group) => {
    const { type } = group.dataset;
    const nameEl = group.querySelector('.reserve-flow-swatch-name');
    const select = radioGroup(group.querySelector('.reserve-flow-swatches'), (btn) => {
      state[type] = btn.dataset.value;
      state[`${type}Code`] = btn.dataset.code || '';
      nameEl.textContent = btn.dataset.value;
      if (type === 'exterior') {
        if (btn.dataset.img) showCar(btn.dataset.img);
        filterInteriors(btn);
      }
    });
    if (type === 'interior') selectInterior = select;
  });
  filterInteriors(configureStep.querySelector('[data-type="exterior"] [aria-checked="true"]'));

  const refreshPay = () => { payBtn.disabled = !state.dealer; };
  const closeDealers = () => {
    dealerList.hidden = true;
    dealerButton.setAttribute('aria-expanded', 'false');
  };
  const selectDealer = (dealer) => {
    state.dealer = dealer;
    dealerButton.querySelector('.reserve-flow-select-value').textContent = dealer
      ? `${dealer.name} · ${dealer.distance} km` : 'Select dealership*';
    dealerList.querySelectorAll('[role="option"]').forEach((o) => {
      o.setAttribute('aria-selected', dealer && o.dataset.id === dealer.id ? 'true' : 'false');
    });
    refreshPay();
  };
  const openDealers = () => {
    if (dealerButton.disabled) return;
    dealerList.hidden = false;
    dropIn(dealerList);
    dealerButton.setAttribute('aria-expanded', 'true');
    const current = dealerList.querySelector('[aria-selected="true"]') || dealerList.firstElementChild;
    if (current) current.focus();
  };

  dealerButton.addEventListener('click', () => {
    if (dealerList.hidden) openDealers(); else closeDealers();
  });
  dealerList.addEventListener('click', (e) => {
    const opt = e.target.closest('[role="option"]');
    if (!opt) return;
    selectDealer(state.dealers.find((d) => d.id === opt.dataset.id));
    closeDealers();
    dealerButton.focus();
  });
  dealerList.addEventListener('keydown', (e) => {
    const list = [...dealerList.children];
    const idx = list.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      list[(idx + step + list.length) % list.length].focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (list[idx]) list[idx].click();
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      closeDealers();
      if (e.key === 'Escape') dealerButton.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (!dealerField.contains(e.target)) closeDealers();
  });

  const pincodeInput = pincode.querySelector('input');
  let lookupId = 0;
  pincodeInput.addEventListener('input', async () => {
    pincodeInput.value = pincodeInput.value.replace(/\D/g, '').slice(0, 6);
    setInvalid(pincodeInput, false);
    pincodeHint.textContent = '';
    if (pincodeInput.value.length < 6) {
      state.dealers = [];
      dealerList.replaceChildren();
      dealerButton.disabled = true;
      selectDealer(null);
      return;
    }
    lookupId += 1;
    const id = lookupId;
    pincodeHint.textContent = 'Finding dealerships near you...';
    const result = await findDealers(pincodeInput.value);
    if (id !== lookupId) return;
    if (!result || !result.dealers.length) {
      pincodeHint.textContent = '';
      setInvalid(pincodeInput, true);
      return;
    }
    pincodeHint.textContent = `${result.city} · ${result.total} dealerships found near ${pincodeInput.value}`;
    state.dealers = result.dealers;
    dealerList.replaceChildren(...result.dealers.map((d, i) => el(
      'li',
      {
        role: 'option', tabindex: '-1', 'data-id': d.id, 'aria-selected': 'false',
      },
      el('span', { text: d.name }),
      el('span', { class: 'reserve-flow-distance', text: `${d.distance} km${i === 0 ? ', nearest' : ''}` }),
    )));
    dealerButton.disabled = false;
    selectDealer(result.dealers[0]);
  });

  backBtn.addEventListener('click', () => setStep('details'));

  const orderFromState = () => ({
    firstName: inputs.firstName.value.trim(),
    lastName: inputs.lastName.value.trim(),
    email: inputs.email.value.trim(),
    mobile: inputs.mobile.value.replace(/\s/g, ''),
    variant: state.variant,
    variantCode: state.variantCode,
    exterior: state.exterior,
    exteriorCode: state.exteriorCode,
    interior: state.interior,
    interiorCode: state.interiorCode,
    pincode: pincodeInput.value,
    dealer: state.dealer ? state.dealer.id : '',
  });

  /* ---- status screens ---- */
  const fillReserved = (order) => {
    const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
    const title = order.firstName
      ? reservedTitleTpl.replace('{firstName}', order.firstName)
      : reservedTitleTpl.replace(/,?\s*\{firstName\}/, '');
    reservedTitle.textContent = title;
    reservedBody.innerHTML = order.email
      ? reservedBodyTpl.replace('{email}', `<span class="reserve-flow-highlight">${esc(order.email)}</span>`)
      : reservedBodyTpl.replace(/\s*to\s*\{email\}/, '').replace('{email}', '');
  };

  const api = getMetadata('reserve-api');

  // the journey's result (demo mode): on to the status page
  const showStatus = (status) => {
    window.location.assign(statusUrl(journey, status, readOrder().txnid));
  };

  const setBusy = (btn, busy, label) => {
    btn.disabled = busy;
    btn.classList.toggle('is-busy', busy);
    if (label) btn.textContent = label;
  };

  const showAlert = (scope, message) => {
    const alert = scope.querySelector('.reserve-flow-alert');
    if (!alert) return;
    alert.textContent = message || '';
    alert.hidden = !message;
  };

  payBtn.addEventListener('click', async () => {
    const order = orderFromState();
    saveOrder(order);
    showAlert(configureStep, '');
    const label = payBtn.textContent;
    setBusy(payBtn, true, 'Processing...');
    if (!api) {
      const { status } = await demoPayment(order);
      setBusy(payBtn, false, label);
      showStatus(status);
      return;
    }
    try {
      const returnUrl = new URL(`${journey}/${STATUS_PATH}`, window.location.origin).href;
      const { txnid, action, params } = await createPayment(api, order, returnUrl);
      saveOrder({ ...order, txnid });
      setBusy(payBtn, true, 'Redirecting to PayU...');
      redirectToPayU(action, params);
    } catch (err) {
      setBusy(payBtn, false, label);
      showAlert(configureStep, "We couldn't start the payment. Please check your connection and try again.");
    }
  });

  const UNREACHABLE = "We couldn't check your payment just now. Please try again in a moment.";

  // the status page's display of an answer from the payment API (set in the initial state)
  let display = () => {};

  /** Retry on the pending screen: the API's answer now. */
  const refreshStatus = async (btn) => {
    const label = btn.textContent;
    setBusy(btn, true, 'Checking...');
    showAlert(pendingStep, '');
    try {
      const data = api ? await getPaymentStatus(api, readOrder().txnid) : await demoPayment();
      setBusy(btn, false, label);
      display(data);
    } catch (err) {
      setBusy(btn, false, label);
      showAlert(pendingStep, UNREACHABLE);
    }
  };

  pendingStep.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="pending-retry"]');
    if (btn) refreshStatus(btn);
  });

  /** Restore details and choices saved before the PayU redirect. */
  const restoreOrder = (order) => {
    Object.keys(inputs).forEach((k) => { if (order[k]) inputs[k].value = order[k]; });
    ['variant', 'exterior', 'interior'].forEach((key) => {
      if (!order[key]) return;
      const btn = [...configureStep.querySelectorAll('[role="radio"]')]
        .find((r) => r.dataset.value === order[key] && !r.hidden
          && (!order[`${key}Code`] || r.dataset.code === order[`${key}Code`])
          && (key === 'variant' ? r.closest('.reserve-flow-tabs') : r.closest(`[data-type="${key}"]`)));
      if (btn) btn.click();
    });
    if (order.pincode) {
      pincodeInput.value = order.pincode;
      pincodeInput.dispatchEvent(new Event('input'));
      const waitForDealers = setInterval(() => {
        if (!state.dealers.length) return;
        clearInterval(waitForDealers);
        const saved = state.dealers.find((d) => d.id === order.dealer);
        if (saved) selectDealer(saved);
      }, 100);
      setTimeout(() => clearInterval(waitForDealers), 5000);
    }
  };

  failedStep.addEventListener('click', (e) => {
    if (!e.target.closest('[data-action="failed-retry"]')) return;
    // the status page sends the buyer back to the journey, which reopens Build your Combat
    // with the saved order
    if (statusPage) {
      window.location.assign(`${journey || '/'}?resume=1`);
      return;
    }
    if (!inputs.firstName.value) restoreOrder(readOrder());
    setStep('configure');
  });

  /* ---- initial state ----
   * PayU returns via the API to the status page, /reserve/status?payment=<status>&txnid=<id>.
   * Its Reserve Status block asks the payment API about the txnid and shows the screen of the
   * confirmed status: changing ?payment= in the address changes nothing. Without a
   * "Reserve API" (demo mode) ?payment= picks the screen. */
  setOtpState('empty');
  const params = new URLSearchParams(window.location.search);
  const returned = params.get('payment');
  const txnid = params.get('txnid') || '';
  const editing = !!document.querySelector('[data-aue-resource]');
  // the page's arrival: the car panel, the car, the price card and the step (or the Reserved
  // screen's own entrance)
  const arrive = () => {
    const firstStep = block.dataset.step;
    if (firstStep === 'reserved') {
      reservedIn({
        bg: reservedScreen.querySelector('.reserve-flow-reserved-bg'),
        car: reservedScreen.querySelector('.reserve-flow-reserved-car'),
        word: reservedScreen.querySelector('.reserve-flow-reserved-hero h2'),
        text: [...reservedScreen.querySelectorAll('.reserve-flow-reserved-text > *')],
      });
    } else if (firstStep) {
      intro({
        media,
        car: media.querySelector('.reserve-flow-car.is-active'),
        price: media.querySelector('.reserve-flow-price'),
        parts: stepParts(panel.querySelector(`.reserve-flow-step[data-step="${firstStep}"]`)),
      });
    }
  };
  glitchButtons(block, '.reserve-flow-btn');

  if (statusPage) {
    let shown = false;
    display = (result) => {
      const status = normaliseStatus(result.status);
      if (status === 'success') {
        fillReserved({ ...readOrder(), ...result });
        clearOrder();
      }
      // the first answer arrives with the page's entrance, a later one (Retry) as a step change
      setStep(status === 'success' ? 'reserved' : status, { animate: shown });
      showAlert(pendingStep, result.unreachable ? UNREACHABLE : '');
      block.style.visibility = '';
      if (!shown) arrive();
      shown = true;
    };

    const known = txnid || readOrder().txnid;
    if (editing) {
      // authors see the pending screen (every screen's text is in the block's fields)
      setStep('pending');
    } else if (api && known) {
      // hidden until the API answers; an unreachable API reads as pending (don't pay again)
      block.style.visibility = 'hidden';
      saveOrder({ ...readOrder(), txnid: known });
      getPaymentStatus(api, known)
        .catch(() => ({ status: 'pending', unreachable: true }))
        .then(display);
    } else if (!api) {
      // demo mode: ?payment= (success, pending or error) picks the screen
      display({ status: normaliseStatus(returned || 'pending') });
    } else {
      // no transaction to check: back to the journey
      window.location.replace(journey || '/');
    }
    return;
  }

  if (editing) {
    block.dataset.step = 'details';
  } else if (txnid) {
    // back from PayU on the journey itself: on to the status page, which confirms it
    saveOrder({ ...readOrder(), txnid });
    window.location.replace(statusUrl(journey, returned ? normaliseStatus(returned) : '', txnid));
    return;
  } else if (!api && returned) {
    // demo mode: ?payment= opens the status page with that screen
    window.location.replace(statusUrl(journey, normaliseStatus(returned)));
    return;
  } else if (params.get('resume') && readOrder().firstName) {
    // from the failed page's Try again: Build your Combat with the saved order
    restoreOrder(readOrder());
    state.verified = true;
    setStep('configure');
  } else {
    block.dataset.step = 'details';
  }
  if (!editing) arrive();

  // the media column is 100vh tall; while the header is still on screen, lift
  // the price card by the amount of the column hidden below the fold
  const updateOffset = () => {
    const top = Math.max(0, Math.round(media.getBoundingClientRect().top));
    block.style.setProperty('--rf-header-offset', `${top}px`);
  };
  new ResizeObserver(updateOffset).observe(media);
  window.addEventListener('scroll', updateOffset, { passive: true });
  window.addEventListener('resize', updateOffset, { passive: true });
  window.addEventListener('pagehide', stopTimer, { once: true });
}
