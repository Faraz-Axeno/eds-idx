import { getMetadata } from '../../scripts/aem.js';
import decorateGlitch from '../../scripts/utils/glitch.js';
import { inEditor } from '../../scripts/utils/common.js';
import { getPageDealer } from '../../scripts/utils/dealer-api.js';

const ANCHORS = ['quote', 'test-drive'];
const FORM_TYPE = 'Dealer Form';
const MODAL_OPEN = 'is-modal-open'; // pauses the section snap (scripts/section-snap.js)
const CLOSE_ICON = '<svg viewBox="0 0 12 12" fill="none" aria-hidden="true" focusable="false">'
  + '<path d="M2 2l8 8M10 2L2 10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';

const mobileLabel = (digits) => (digits.length === 10 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits);

/**
 * The bold label a paragraph starts with, or null.
 * @param {HTMLParagraphElement} p
 * @returns {Element|null}
 */
function leadingLabel(p) {
  const first = [...p.childNodes]
    .find((n) => n.nodeType !== Node.TEXT_NODE || n.textContent.trim());
  return first?.nodeType === Node.ELEMENT_NODE && first.matches('strong, b') ? first : null;
}

/**
 * Reads the authored Request Sent field.
 * @param {Element|null} cell
 * @returns {{title: string, rows: Array<[string, string]>, status: string, link: Element|null}}
 */
function readRequestSent(cell) {
  const out = {
    title: '', rows: [], status: '', link: null,
  };
  if (!cell) return out;
  const heading = cell.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) out.title = heading.textContent.trim();
  cell.querySelectorAll('p').forEach((p) => {
    const text = p.textContent.trim();
    if (!text) return;
    const a = p.querySelector('a[href]');
    if (a && !out.link) {
      out.link = a;
      return;
    }
    const label = leadingLabel(p);
    if (label) {
      out.rows.push([label.textContent.trim(), text.slice(label.textContent.length).trim()]);
      return;
    }
    if (!out.title) out.title = text;
    else if (!out.status) out.status = text;
  });
  return out;
}

/**
 * The Map Coordinates as a Google Maps point ("28.433333,77.1"), or '' when there are none or
 * they can't be read. Each of the two comma-separated parts is degrees with optional minutes
 * and seconds and a hemisphere letter (28°26' N, 77°06'30" E) or a signed decimal (28.4333).
 * @param {string} text the authored coordinates
 * @returns {string}
 */
function mapPoint(text) {
  const parts = (text || '').split(',').map((x) => x.trim()).filter(Boolean);
  if (parts.length !== 2) return '';
  const values = parts.map((part) => {
    const nums = (part.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    if (!nums.length) return NaN;
    const [deg, min = 0, sec = 0] = nums;
    let value = Math.abs(deg) + min / 60 + sec / 3600;
    if (deg < 0 || /[SW]\s*$/i.test(part)) value = -value;
    return Math.round(value * 1e6) / 1e6;
  });
  const [lat, lng] = values;
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? `${lat},${lng}` : '';
}

const PIN_ICON = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">'
  + '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>'
  + '<circle cx="12" cy="10" r="2.4" stroke="currentColor" stroke-width="1.5"/></svg>';
const NAV_ICON = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">'
  + '<path d="M21 3 3 10.5l7.5 3 3 7.5L21 3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
const ARROW_ICON = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">'
  + '<path d="M4 12 12 4M5.5 4H12v6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ARROW_DOWN_ICON = '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">'
  + '<path d="M4 4l8 8M12 5.5V12H5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/**
 * The Find Us card, the Booking style's right side: "Our showroom" over a drawing of the
 * location (rings and crosshairs, the coordinates at its top corners, the region under the
 * pin), then "Find us", the dealer's name (Dealer Name), the address (Dealer Address: two
 * lines, split after its second comma), the city and PIN, a Get directions button (Google Maps
 * directions to the Map Coordinates, else the address, new tab)
 * and the closing line. Labels are placeholders (registerFormBookingWayfind*).
 * @param {Element} block the register form
 * @param {{name: string, address: string, coordinates: string}} map the authored map fields
 * @param {object} wayfind region, city, pin, note
 * @param {Function} createEl register-form.js's element helper
 * @param {Function} ph placeholder lookup
 */
function buildWayfind(block, map, wayfind, createEl, ph) {
  // the form moves the media into its layout once built, so a rebuild finds it there
  const media = block.querySelector('.media.has-wayfind') || block.querySelector(':scope > .media');
  if (!media) return;
  const name = map?.name || '';
  const address = map?.address || '';
  const html = (el, markup) => {
    el.insertAdjacentHTML('beforeend', markup);
    return el;
  };

  // the address on two lines: up to the second comma, then the rest
  const parts = address.split(',').map((x) => x.trim()).filter(Boolean);
  const lines = parts.length > 2 ? [parts.slice(0, 2).join(', '), parts.slice(2).join(', ')] : [parts.join(', ')];
  const [lat, long] = (map?.coordinates || '').split(',').map((x) => x.trim());
  // directions to the dealer's exact point (Map Coordinates), else to the address
  const destination = map?.point || mapPoint(map?.coordinates)
    || encodeURIComponent(map?.fullAddress || address);

  const head = createEl(
    'div',
    { class: 'wayfind-head' },
    createEl('p', { class: 'wayfind-eyebrow' }, ph('registerFormBookingWayfindTitle', 'Our showroom')),
  );
  const drawing = createEl(
    'div',
    { class: 'wayfind-map', 'aria-hidden': 'true' },
    lat ? createEl('span', { class: 'wayfind-lat' }, lat) : null,
    long ? createEl('span', { class: 'wayfind-long' }, long) : null,
    html(createEl('span', { class: 'wayfind-pin' }), PIN_ICON),
    wayfind?.region ? createEl('span', { class: 'wayfind-region' }, wayfind.region) : null,
  );

  const details = createEl(
    'div',
    { class: 'wayfind-details' },
    createEl('p', { class: 'wayfind-eyebrow wayfind-find' }, ph('registerFormBookingWayfindFind', 'Find us')),
    name ? createEl('h3', { class: 'wayfind-name' }, name) : null,
    address ? createEl('p', { class: 'wayfind-address' }, ...lines.flatMap((l, i) => (i ? [createEl('br'), l] : [l]))) : null,
  );
  if (wayfind?.city || wayfind?.pin) {
    let city = null;
    if (wayfind.city) {
      city = html(createEl('span', { class: 'wayfind-city' }), PIN_ICON);
      city.append(wayfind.city);
    }
    details.append(createEl(
      'div',
      { class: 'wayfind-meta' },
      city,
      wayfind.pin ? createEl('span', { class: 'wayfind-postcode' }, `${ph('registerFormBookingWayfindPin', 'PIN')} ${wayfind.pin}`) : null,
    ));
  }
  if (address) {
    const go = createEl('a', {
      class: 'wayfind-directions',
      href: `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
      target: '_blank',
      rel: 'noopener',
    });
    html(go, NAV_ICON);
    // cta-label: where the hover glitch finds the letters (scripts/utils/glitch.js), the
    // button also holding its two icons
    const label = createEl('span', { class: 'wayfind-directions-label cta-label' }, ph('registerFormBookingWayfindDirections', 'Get directions'));
    go.append(label);
    html(go, ARROW_ICON);
    details.append(go);
    // the form's black buttons' hover: the letter glitch on the label (scripts/utils/glitch.js)
    go.dataset.glitch = '';
    decorateGlitch(go, label);
  }
  const foot = wayfind?.note
    ? html(createEl('p', { class: 'wayfind-note' }, createEl('span', {}, wayfind.note)), ARROW_DOWN_ICON)
    : null;

  const card = createEl('div', { class: 'wayfind' }, head, drawing, details, foot);
  media.classList.add('has-wayfind');
  media.replaceChildren(card);
}

/**
 * @param {Element} block the register form
 * @param {object} ctx built by register-form.js
 */
export default function decorateBooking(block, {
  form, fields, ph, createEl, setScreen, requestSent, map, wayfind, setLeadExtras,
}) {
  const sent = readRequestSent(requestSent);
  // the dealer's exact point, for other links to the showroom (the footer's Open in maps)
  const point = mapPoint(map?.coordinates);
  if (point) block.dataset.mapPoint = point;
  // the right side: the Find Us card (its styles: .register-form.booking.wayfind)
  block.classList.add('wayfind');
  buildWayfind(block, map, wayfind, createEl, ph);
  // the Find Us card rebuilt from the Dealer API (by the page's Dealer Code), once it answers
  if (!inEditor()) {
    getPageDealer().then((dealer) => {
      if (!dealer) return;
      // the API dealer's own point only; never the authored one with the API's address
      if (dealer.point) block.dataset.mapPoint = dealer.point;
      else delete block.dataset.mapPoint;
      const [lat, lng] = dealer.point ? dealer.point.split(',').map(Number) : [];
      const degrees = (v, pos, neg) => `${Math.abs(v).toFixed(4)}° ${v < 0 ? neg : pos}`;
      buildWayfind(block, {
        name: dealer.name || map?.name,
        address: dealer.street || map?.address,
        fullAddress: dealer.full,
        point: dealer.point,
        coordinates: dealer.point ? `${degrees(lat, 'N', 'S')}, ${degrees(lng, 'E', 'W')}` : '',
      }, {
        ...wayfind,
        region: [dealer.city, dealer.state].filter(Boolean).join(' · ') || wayfind?.region,
        city: [dealer.city, dealer.state].filter(Boolean).join(', ') || wayfind?.city,
        pin: dealer.pin || wayfind?.pin,
      }, createEl, ph);
    });
  }

  const actions = (...buttons) => createEl('div', { class: 'booking-actions' }, ...buttons);

  // --- the details screen ---
  const fieldsScreen = form.querySelector('[data-screen="fields"]');
  const notice = block.querySelector('.content > .notice');
  fieldsScreen.prepend(createEl('h3', { class: 'booking-step-title' }, ph('registerFormBookingAbout', 'Tell us about you')));
  const getOtpBtn = fieldsScreen.querySelector('[data-action="get-otp"]');
  const fieldsActions = actions();
  if (getOtpBtn) {
    getOtpBtn.textContent = ph('registerFormBookingContinue', 'Continue');
    getOtpBtn.before(fieldsActions);
    fieldsActions.append(getOtpBtn);
  } else {
    fieldsScreen.append(fieldsActions);
  }
  // the notice goes with the details the visitor gives, above the button
  if (notice) fieldsActions.before(notice);

  // phones: the Find Us card sits under the details, above Continue, as the mobile design
  // orders them; desktop keeps it beside the form (first in the block, where register-form.js
  // put it)
  const media = block.querySelector(':scope > .media');
  const onPhone = window.matchMedia('(width < 900px)');
  const placeMap = () => {
    if (onPhone.matches) fieldsActions.before(media);
    else if (media.parentElement !== block) block.prepend(media);
  };
  if (media) {
    placeMap();
    onPhone.addEventListener('change', placeMap);
  }

  // --- the pop-ups: <dialog>s in the form, each holding one of its screens ---
  const modal = (screen, labelId) => {
    const dialog = createEl('dialog', { class: 'booking-modal', 'aria-labelledby': labelId });
    screen.after(dialog);
    dialog.append(screen);
    return dialog;
  };

  // OTP: "Verify your number", the code sent to …, the boxes, resend, Change number + Submit
  const otpScreen = form.querySelector('[data-screen="otp"]');
  const otpTitleId = `${block.id || 'register-form'}-otp-title`;
  const otpDialog = otpScreen ? modal(otpScreen, otpTitleId) : null;
  const changeBtn = otpScreen?.querySelector('[data-action="change-number"]');
  if (otpScreen) {
    otpScreen.prepend(createEl('h3', { class: 'booking-modal-title', id: otpTitleId }, ph('registerFormBookingOtpTitle', 'Verify your number')));
    const close = createEl('button', {
      type: 'button', class: 'booking-modal-close', 'aria-label': ph('registerFormBookingClose', 'Close'),
    });
    close.insertAdjacentHTML('beforeend', CLOSE_ICON);
    close.addEventListener('click', () => changeBtn?.click());
    otpScreen.prepend(close);
    const verifyBtn = otpScreen.querySelector('[data-action="verify-otp"]');
    if (verifyBtn) {
      const otpActions = actions();
      verifyBtn.before(otpActions);
      if (changeBtn) {
        changeBtn.classList.add('booking-back');
        otpActions.append(changeBtn);
      }
      otpActions.append(verifyBtn);
    }
    // the first box takes the focus when the pop-up opens
    otpScreen.querySelector('.otp-box')?.setAttribute('autofocus', '');
  }

  // Request sent: the authored title, the visitor's email, the rows, the status
  const successScreen = form.querySelector('[data-screen="success"]');
  const sentTitleId = `${block.id || 'register-form'}-sent-title`;
  const sentDialog = successScreen ? modal(successScreen, sentTitleId) : null;
  const sentSub = createEl('p', { class: 'booking-modal-sub' });
  const sentRows = createEl('dl', { class: 'booking-summary booking-sent-rows' });
  const doneBtn = createEl('button', { type: 'button', class: 'submit booking-done', autofocus: true }, ph('registerFormBookingDone', 'Done'));
  if (successScreen) {
    let alt = null;
    if (sent.link) {
      alt = createEl('a', { class: 'booking-back booking-sent-alt', href: sent.link.getAttribute('href') }, sent.link.textContent.trim());
    }
    successScreen.replaceChildren(
      createEl('h3', { class: 'booking-modal-title', id: sentTitleId }, sent.title || ph('registerFormBookingSuccessTitle', 'Request sent')),
      sentSub,
      sentRows,
      sent.status ? createEl('p', { class: 'booking-sent-status' }, sent.status) : null,
      actions(alt, doneBtn),
    );
  }

  const fillSent = () => {
    const email = fields.email?.value.trim() || '';
    const digits = fields.mobile?.value.replace(/\D/g, '') || '';
    const phone = digits ? `+91 ${mobileLabel(digits)}` : '';
    const name = `${fields.firstname?.value.trim() || ''} ${fields.lastname?.value.trim() || ''}`.trim();
    const where = email
      ? `${ph('registerFormBookingSentCopy', 'A copy is on its way to')} ${email}.`
      : `${ph('registerFormBookingSentCall', 'We will call you on')} ${phone}.`;
    sentSub.textContent = where;
    const rows = [...sent.rows, [ph('registerFormBookingContactTerm', 'Contact'), [name, phone].filter(Boolean).join(', ')]];
    sentRows.replaceChildren(...rows.filter(([, value]) => value)
      .flatMap(([term, value]) => [createEl('dt', {}, term), createEl('dd', {}, value)]));
  };

  // open / close the pop-up of the screen the form is on (register-form.js sets data-screen)
  const root = document.documentElement;
  const show = (dialog) => {
    if (dialog && !dialog.open) dialog.showModal();
  };
  const hide = (dialog) => {
    if (dialog?.open) dialog.close();
  };
  const sync = () => {
    const { screen } = block.dataset;
    if (screen === 'success') {
      hide(otpDialog);
      fillSent();
      show(sentDialog);
    } else if (screen === 'otp') {
      // the number as the design writes it, "+91 98765 43210" (display only)
      const number = otpScreen?.querySelector('.otp-number');
      if (number) number.textContent = number.textContent.replace(/^(\+91)\s*(\d{5})(\d{5})$/, '$1 $2 $3');
      hide(sentDialog);
      show(otpDialog);
    } else {
      hide(otpDialog);
      hide(sentDialog);
    }
    root.classList.toggle(MODAL_OPEN, !!(otpDialog?.open || sentDialog?.open));
  };
  new MutationObserver(sync).observe(block, { attributes: true, attributeFilter: ['data-screen'] });

  // Done: the pop-up closes and the form starts over, empty
  const done = () => {
    ['firstname', 'lastname', 'email', 'pincode', 'mobile'].forEach((name) => {
      const el = fields[name];
      if (!el) return;
      el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    ['consent', 'marketingConsent'].forEach((name) => { if (fields[name]?.checked) fields[name].click(); });
    setScreen('fields');
  };
  doneBtn.addEventListener('click', done);
  // the outlined link (e.g. Explore the Combat) closes the pop-up before it goes
  successScreen?.querySelector('.booking-sent-alt')?.addEventListener('click', done);
  // Esc: the OTP pop-up goes back to the details (as Change number), Request sent is Done
  otpDialog?.addEventListener('cancel', (e) => {
    e.preventDefault();
    changeBtn?.click();
  });
  sentDialog?.addEventListener('cancel', (e) => {
    e.preventDefault();
    done();
  });

  // the dealer form type, Dealer Code and the dealer's name from the API (fetched on page load)
  setLeadExtras(async () => ({
    formType: FORM_TYPE,
    dealerCodeSalesUnit: getMetadata('dealercode').trim(),
    // the API's name, else the page title (page property Title)
    dealerName: (await getPageDealer())?.name || getMetadata('og:title') || document.title.trim(),
  }));

  // #quote / #test-drive: bring the form into view
  const fromHash = () => {
    if (!ANCHORS.includes(window.location.hash.slice(1))) return;
    block.scrollIntoView({ block: 'start' });
  };
  window.addEventListener('hashchange', fromHash);
  fromHash();

  setScreen('fields');
}
