// Dealer Locator: State → City → Pincode finder with paged dealer cards.

import { fetchPlaceholders } from '../../scripts/utils/common.js';
import {
  getCities, getDealers, getPincodes, getStates, keyOf,
} from './dealer-data.js';

const DEFAULT_PAGE_SIZE = 4;
const PARAMS = ['state', 'city', 'pincode'];
const RESULTS_ID = 'dealer-results';

const ICONS = {
  down: '<path d="M8 2.5v11M3.5 9 8 13.5 12.5 9"/>',
  upRight: '<path d="M4.5 11.5 11.5 4.5M5.5 4.5h6v6"/>',
  pin: '<path d="M8 14.5s-4.5-4.1-4.5-7.5a4.5 4.5 0 0 1 9 0c0 3.4-4.5 7.5-4.5 7.5Z"/><circle cx="8" cy="7" r="1.6"/>',
  clock: '<circle cx="8" cy="8" r="6"/><path d="M8 4.8V8l2.2 1.4"/>',
  phone: '<path d="M5.6 2.5 3.4 2.8c-.5.1-.9.5-.9 1 .2 5.3 4.4 9.5 9.7 9.7.5 0 .9-.4 1-.9l.3-2.2-2.8-1.2-1.3 1.3a7.6 7.6 0 0 1-3.6-3.6L7 5.6 5.6 2.5Z"/>',
  navigate: '<path d="M13.5 2.5 2.5 7l4.6 1.9L9 13.5l4.5-11Z"/>',
  prev: '<path d="M10 3.5 5.5 8l4.5 4.5"/>',
  next: '<path d="M6 3.5 10.5 8 6 12.5"/>',
  filter: '<path d="M2.5 4h11M2.5 8h11M2.5 12h11"/><circle cx="5.5" cy="4" r="1.2"/><circle cx="10.5" cy="8" r="1.2"/><circle cx="7" cy="12" r="1.2"/>',
};

/** Creates an element. */
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([name, value]) => {
    if (value === undefined || value === null || value === false) return;
    if (name === 'text') node.textContent = value;
    else node.setAttribute(name, value === true ? '' : value);
  });
  node.append(...children.filter((child) => child !== null && child !== undefined && child !== ''));
  return node;
}

/** A 16×16 line icon, hidden from screen readers. */
function icon(name) {
  const span = el('span', { class: `dl-icon dl-icon-${name}`, 'aria-hidden': 'true' });
  span.innerHTML = `<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
  return span;
}

const pad = (n) => String(n).padStart(2, '0');

/** Fills {0}, {1}… in a label. */
const fill = (text, ...values) => values.reduce((out, value, i) => out.replaceAll(`{${i}}`, value), text);

/** A row's cell, or null when the row is missing. */
const cellOf = (row) => row?.querySelector(':scope > div') || null;

/** Keeps authored links as plain links, not buttons. */
function plainLinks(cell) {
  cell?.querySelectorAll('a.button').forEach((a) => a.classList.remove('button', 'primary', 'secondary'));
  cell?.querySelectorAll('.button-wrapper, .button-container')
    .forEach((p) => p.classList.remove('button-wrapper', 'button-container'));
}

/** Splits a heading cell into eyebrow, heading and the paragraphs after it. */
function readHeading(cell) {
  plainLinks(cell);
  const nodes = cell ? [...cell.children] : [];
  const at = nodes.findIndex((node) => /^H[1-6]$/.test(node.tagName));
  if (at < 0) return { eyebrow: '', heading: null, after: nodes };
  return {
    eyebrow: nodes.slice(0, at).map((p) => p.textContent.trim()).filter(Boolean).join(' '),
    heading: nodes[at],
    after: nodes.slice(at + 1),
  };
}

/** The eyebrow line (a rule, then small capitals). */
const eyebrow = (text) => (text ? el('p', { class: 'dl-eyebrow' }, el('span', { text })) : null);

/** "left | right" as the thin rule above the finder. */
function topLine(text) {
  if (!text) return null;
  const [left, ...rest] = text.split('|').map((part) => part.trim());
  return el('div', { class: 'dl-rule' }, el('span', { text: left }), el('span', { text: rest.join(' | ') }));
}

/** "a — b — c" as the note under the filters, its parts set apart by short rules. */
function noteLine(text) {
  if (!text) return null;
  const parts = text.split(/\s+[—–]\s+/).map((part) => part.trim()).filter(Boolean);
  return el('p', { class: 'dl-note' }, icon('filter'), ...parts.map((part) => el('span', { text: part })));
}

/** The line under the results: text left, link right. */
function closingLine(cell) {
  plainLinks(cell);
  if (!cell?.textContent.trim()) return null;
  const link = cell.querySelector('a');
  const text = [...cell.children].filter((node) => !node.querySelector('a') && node.tagName !== 'A')
    .map((node) => node.textContent.trim()).filter(Boolean).join(' ');
  if (link) {
    link.className = 'dl-closing-link';
    link.append(icon('upRight'));
  }
  return el('div', { class: 'dl-closing' }, el('span', { text }), link);
}

/** One dealer card. */
function card(dealer, number, ph) {
  const directionsLabel = fill(ph('dealerLocatorDirectionsTo', 'Directions to {0}'), dealer.name);
  const name = dealer.website
    ? el('a', { href: dealer.website, target: '_blank', rel: 'noopener' }, dealer.name)
    : dealer.name;
  const go = dealer.directions && el('a', {
    class: 'dl-card-go',
    href: dealer.directions,
    target: '_blank',
    rel: 'noopener',
    // mouse-only duplicate of Get directions
    tabindex: '-1',
    'aria-hidden': 'true',
  }, icon('navigate'));
  const address = (dealer.street || dealer.area) && el(
    'p',
    { class: 'dl-card-line dl-card-address' },
    icon('pin'),
    el('span', {}, dealer.street, dealer.street && dealer.area ? el('br') : '', dealer.area),
  );
  const hours = dealer.hours && el('p', { class: 'dl-card-line' }, icon('clock'), el('span', { text: dealer.hours }));
  const phone = dealer.phone && el('a', { class: 'dl-card-phone', href: `tel:${dealer.phone.tel}` }, icon('phone'), dealer.phone.text);
  const directions = dealer.directions && el('a', {
    class: 'dl-card-directions',
    href: dealer.directions,
    target: '_blank',
    rel: 'noopener',
    'aria-label': directionsLabel,
  }, ph('dealerLocatorDirections', 'Get directions'), icon('upRight'));
  return el(
    'li',
    { class: 'dl-card' },
    el(
      'div',
      { class: 'dl-card-top' },
      el('p', { class: 'dl-card-number', text: `${pad(number)} / ${ph('dealerLocatorDealer', 'Dealer')}` }),
      go,
    ),
    // dealer type ("3S") via placeholder; an empty line keeps names aligned
    el('p', {
      class: 'dl-card-type',
      text: dealer.type ? ph(`dealerLocatorType${dealer.type.replace(/[^a-z0-9]/gi, '')}`, dealer.type) : '\u00a0',
      'aria-hidden': dealer.type ? null : 'true',
    }),
    el('h3', { class: 'dl-card-name' }, name),
    address,
    hours,
    (phone || directions) ? el('div', { class: 'dl-card-foot' }, phone || el('span'), directions) : null,
  );
}

/** Page numbers to show, gaps as null. */
function pageList(count, current) {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const keep = new Set([1, count, current - 1, current, current + 1]);
  const pages = [...keep].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);
  return pages.flatMap((p, i) => (i && p - pages[i - 1] > 1 ? [null, p] : [p]));
}

export default async function decorate(block) {
  const rows = [...block.children];
  const [ruleRow, finderRow, noteRow, resultsRow, closingRow, sizeRow] = rows;
  const placeholders = await fetchPlaceholders();
  const ph = (key, fallback) => placeholders[key] || fallback;
  const pageSize = Math.max(1, parseInt(cellOf(sizeRow)?.textContent, 10) || DEFAULT_PAGE_SIZE);

  // ----- the finder -----
  const finder = readHeading(cellOf(finderRow));
  const intro = finder.after.find((node) => node.textContent.trim());
  const finderHead = el(
    'div',
    { class: 'dl-head' },
    el('div', { class: 'dl-head-main' }, eyebrow(finder.eyebrow), finder.heading),
    intro ? el('p', { class: 'dl-intro', text: intro.textContent.trim() }) : null,
  );

  const uid = `dl-${Math.random().toString(36).slice(2, 8)}`;
  const fieldDefs = [
    { name: 'state', label: ph('dealerLocatorState', 'State'), any: ph('dealerLocatorAnyState', 'Select a state') },
    { name: 'city', label: ph('dealerLocatorCity', 'City'), any: ph('dealerLocatorAnyCity', 'All cities') },
    { name: 'pincode', label: ph('dealerLocatorPincode', 'Pincode'), any: ph('dealerLocatorAnyPincode', 'All pincodes') },
  ];
  const selects = {};
  const labels = {};
  const fields = fieldDefs.map(({ name, label, any }, i) => {
    const id = `${uid}-${name}`;
    labels[name] = el('span', { class: 'dl-field-name', text: label });
    selects[name] = el('select', { id, name, disabled: true }, el('option', { value: '', text: any }));
    return el(
      'div',
      { class: 'dl-field' },
      el('label', { for: id }, el('span', { class: 'dl-field-number', 'aria-hidden': 'true', text: pad(i + 1) }), labels[name]),
      el('div', { class: 'dl-select' }, selects[name], icon('down')),
    );
  });
  const submit = el(
    'button',
    { type: 'submit', class: 'button primary dl-submit', disabled: true },
    el('span', { text: ph('dealerLocatorFind', 'Find dealers') }),
    icon('upRight'),
  );
  const form = el(
    'form',
    { class: 'dl-form', role: 'search', 'aria-label': ph('dealerLocatorSearchLabel', 'Find a dealer') },
    ...fields,
    el('div', { class: 'dl-actions' }, submit),
  );

  const finderPanel = el(
    'div',
    { class: 'dl-finder' },
    topLine(cellOf(ruleRow)?.textContent.trim()),
    finderHead,
    form,
    noteLine(cellOf(noteRow)?.textContent.trim()),
  );

  // ----- the results -----
  const results = readHeading(cellOf(resultsRow));
  const countWords = results.after.map((node) => node.textContent.trim()).filter(Boolean).join(' ')
    || ph('dealerLocatorCountLabel', 'Reference listings');
  const countNumber = el('span', { class: 'dl-count-number', text: '00' });
  const count = el('p', { class: 'dl-count', 'aria-hidden': 'true' }, countNumber, el('span', { class: 'dl-count-words', text: countWords }));
  const resultsHead = el(
    'div',
    { class: 'dl-head' },
    el('div', { class: 'dl-head-main' }, eyebrow(results.eyebrow), results.heading),
    count,
  );
  const status = el('p', { class: 'dl-status', role: 'status', 'aria-live': 'polite' });
  const list = el('ul', { class: 'dl-list', 'aria-busy': 'true' });
  const message = el('div', { class: 'dl-message', hidden: true });
  const showing = el('p', { class: 'dl-showing' });
  const pager = el('nav', { class: 'dl-pager', 'aria-label': ph('dealerLocatorPages', 'Dealer list pages') });
  // the first locator on a page takes the #dealer-results id
  const resultsPanel = el(
    'div',
    { class: 'dl-results', id: document.getElementById(RESULTS_ID) ? null : RESULTS_ID },
    resultsHead,
    status,
    list,
    message,
    el('div', { class: 'dl-pagination' }, showing, pager),
    closingLine(cellOf(closingRow)),
  );

  // skeleton cards while the list loads, so the page doesn't jump
  list.append(...Array.from({ length: pageSize }, () => el('li', { class: 'dl-card dl-card-loading', 'aria-hidden': 'true' })));

  block.replaceChildren(finderPanel, resultsPanel);

  // ----- behaviour -----
  let matches = [];
  let page = 1;
  const skeleton = () => Array.from({ length: pageSize }, () => el('li', { class: 'dl-card dl-card-loading', 'aria-hidden': 'true' }));

  const setOptions = (name, options) => {
    const select = selects[name];
    const [any] = select.options;
    select.replaceChildren(any, ...options.map(({ value, label }) => el('option', { value, text: label })));
    select.value = '';
  };

  /** Picks the option whose value matches (any case), else the "any" option. */
  const choose = (name, value) => {
    const select = selects[name];
    const option = [...select.options].find((o) => o.value && keyOf(o.value) === keyOf(value));
    select.value = option ? option.value : '';
  };

  // fetch City/Pincode options when the field before changes; the latest change wins
  const pending = { city: 0, pincode: 0 };
  async function refresh(name, fetchOptions) {
    pending[name] += 1;
    const ticket = pending[name];
    const select = selects[name];
    setOptions(name, []);
    select.disabled = true;
    let options = [];
    try {
      options = await fetchOptions();
    } catch {
      options = [];
    }
    if (ticket !== pending[name]) return false;
    setOptions(name, options);
    select.disabled = !options.length;
    return true;
  }
  const refreshCities = () => refresh('city', () => getCities(selects.state.value));
  const refreshPincodes = () => refresh('pincode', () => getPincodes(selects.state.value, selects.city.value));

  selects.state.addEventListener('change', () => {
    refreshCities();
    refresh('pincode', async () => []);
  });
  selects.city.addEventListener('change', refreshPincodes);

  const scrollToResults = () => {
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    resultsHead.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  };

  function renderPage({ scroll = false } = {}) {
    const total = matches.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    page = Math.min(Math.max(1, page), pages);
    const start = (page - 1) * pageSize;
    const shown = matches.slice(start, start + pageSize);

    countNumber.textContent = pad(total);
    list.setAttribute('aria-busy', 'false');
    list.replaceChildren(...shown.map((dealer, i) => card(dealer, start + i + 1, ph)));
    list.hidden = !total;

    message.hidden = !!total;
    if (!total) {
      const reset = el('button', { type: 'button', class: 'button secondary dl-reset', text: ph('dealerLocatorReset', 'Reset filters') });
      reset.addEventListener('click', () => {
        choose('state', '');
        refresh('city', async () => []);
        refresh('pincode', async () => []);
        // eslint-disable-next-line no-use-before-define -- declared below, called on click
        search();
      });
      message.replaceChildren(
        el('p', { class: 'dl-message-title', text: ph('dealerLocatorEmpty', 'No dealers found') }),
        el('p', { text: ph('dealerLocatorEmptyText', 'Try another city or pincode, or reset the filters to see the whole network.') }),
        reset,
      );
    }

    showing.textContent = total
      ? fill(ph('dealerLocatorShowing', 'Showing {0}–{1} of {2} dealer listings'), start + 1, start + shown.length, total)
      : '';

    // Previous, the page numbers, Next
    pager.replaceChildren();
    pager.hidden = pages < 2;
    if (pages > 1) {
      const go = (to) => {
        page = to;
        renderPage({ scroll: true });
      };
      const step = (to, label, iconName, after) => {
        const button = el('button', { type: 'button', class: `dl-page dl-page-${iconName}`, disabled: to < 1 || to > pages });
        const text = el('span', { text: label });
        button.append(...(after ? [text, icon(iconName)] : [icon(iconName), text]));
        button.addEventListener('click', () => go(to));
        return button;
      };
      pager.append(step(page - 1, ph('dealerLocatorPrevious', 'Previous'), 'prev', false));
      pageList(pages, page).forEach((p) => {
        if (p === null) {
          pager.append(el('span', { class: 'dl-page-gap', 'aria-hidden': 'true', text: '…' }));
          return;
        }
        const button = el('button', {
          type: 'button',
          class: 'dl-page dl-page-number',
          'aria-label': fill(ph('dealerLocatorPageLabel', 'Page {0}'), p),
          'aria-current': p === page ? 'page' : null,
          text: pad(p),
        });
        button.addEventListener('click', () => go(p));
        pager.append(button);
      });
      pager.append(step(page + 1, ph('dealerLocatorNext', 'Next'), 'next', true));
    }

    status.textContent = total
      ? fill(ph('dealerLocatorFound', '{0} dealers found. {1}'), total, showing.textContent)
      : ph('dealerLocatorEmpty', 'No dealers found');
    if (scroll) scrollToResults();
  }

  function showError(retry) {
    list.replaceChildren();
    list.hidden = true;
    list.setAttribute('aria-busy', 'false');
    countNumber.textContent = '00';
    showing.textContent = '';
    pager.hidden = true;
    const button = el('button', { type: 'button', class: 'button secondary dl-retry', text: ph('dealerLocatorRetry', 'Try again') });
    button.addEventListener('click', retry);
    message.replaceChildren(
      el('p', { class: 'dl-message-title', text: ph('dealerLocatorError', 'We couldn’t load the dealer list') }),
      el('p', { text: ph('dealerLocatorErrorText', 'Please check your connection and try again.') }),
      button,
    );
    message.hidden = false;
    status.textContent = ph('dealerLocatorError', 'We couldn’t load the dealer list');
  }

  const currentSearch = () => Object.fromEntries(PARAMS.map((name) => [name, selects[name].value]));

  // the address keeps the search, so a shared link or Back shows the same results
  function writeUrl(values) {
    const url = new URL(window.location.href);
    PARAMS.forEach((name) => {
      if (values[name]) url.searchParams.set(name, values[name]);
      else url.searchParams.delete(name);
    });
    if (url.href !== window.location.href) window.history.pushState({ dealerLocator: true }, '', url);
  }

  // run a search against the API; the latest search wins
  let searchTicket = 0;
  async function apply(values, { scroll = false, fresh = false } = {}) {
    searchTicket += 1;
    const ticket = searchTicket;
    message.hidden = true;
    list.hidden = false;
    list.setAttribute('aria-busy', 'true');
    list.replaceChildren(...skeleton());
    submit.disabled = true;
    try {
      const dealers = await getDealers(values, { fresh });
      if (ticket !== searchTicket) return;
      matches = dealers;
      page = 1;
      renderPage({ scroll });
    } catch {
      if (ticket !== searchTicket) return;
      showError(() => apply(values, { scroll, fresh: true }));
    } finally {
      if (ticket === searchTicket) submit.disabled = selects.state.disabled;
    }
  }

  function search() {
    const values = currentSearch();
    writeUrl(values);
    apply(values, { scroll: true });
  }

  // the search from the address: each value one of the API's options, else ignored
  async function readUrl() {
    const params = new URLSearchParams(window.location.search);
    choose('state', params.get('state'));
    if (selects.state.value) {
      await refreshCities();
      choose('city', params.get('city'));
    } else {
      await refresh('city', async () => []);
    }
    if (selects.city.value) {
      await refreshPincodes();
      choose('pincode', params.get('pincode'));
    } else {
      await refresh('pincode', async () => []);
    }
    return apply(currentSearch());
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    search();
  });
  // Enter on a dropdown searches too
  form.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && event.target.tagName === 'SELECT') {
      event.preventDefault();
      search();
    }
  });
  window.addEventListener('popstate', () => {
    if (!selects.state.disabled) readUrl();
  });

  async function load({ fresh = false } = {}) {
    let states;
    try {
      states = await getStates({ fresh });
    } catch {
      showError(() => load({ fresh: true }));
      return;
    }
    setOptions('state', states);
    selects.state.disabled = !states.length;
    submit.disabled = false;
    readUrl();
  }

  load();
}
