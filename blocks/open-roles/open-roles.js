/*
 * open-roles: the JSW careers section ("Phase 5 / Open Roles"): on the left the heading, the
 * search box (with suggestions under it) and its description, then the filters; on the right
 * the scrolling list of roles (title, department · location, APPLY NOW) with "Back to top"
 * under it; under both, the gallery: its images side by side, the middle one centred.
 * Rows (model, _open-roles.json):
 *   content  — heading (grey line), heading (dark line)
 *   search   — search placeholder, search description, filters label, no-results message,
 *              Clear all, Back to top
 *   then the items, of three types (in any order):
 *     Job Role        — job title (roleName) | department, location, other filter values |
 *                       button (link + text): the list on the right
 *     Filter Dropdown — its name (categoryName) | the role field it matches | its options:
 *                       the dropdowns on the left
 *     Gallery Image   — image (+ alt): the gallery
 * Content written for the conversion to AEM content names each row's type in a first cell
 * (open-roles-filter, …): that cell is read, not shown. Pages published with earlier models
 * keep working: three field rows (content, search, labels), or four (content, search, then the
 * filter dropdowns and gallery as composite multi-fields).
 * A role is listed when every word typed is in its text and, for every filter with options
 * ticked, it has one of them (ticked options of one filter widen, filters narrow). The counts
 * beside the options and the search suggestions come from the roles themselves. The list is
 * drawn PAGE_SIZE roles at a time, more as it is scrolled to its end.
 */

import { moveInstrumentation } from '../../scripts/scripts.js';

// roles drawn at a time; more when the list is scrolled near its end
const PAGE_SIZE = 12;

// typing pause before the list and the suggestions follow the search box
const SEARCH_DELAY = 200;

// suggestions under the search box at most
const SUGGESTIONS = 5;

// how far the list is scrolled before "Back to top" shows
const TOP_AFTER = 120;

// space kept under an open filter panel when the page is moved to show it
const PANEL_MARGIN = 16;

const FILTER_FIELDS = ['auto', 'location', 'department', 'tags', 'any'];

// the first cell of an item row naming its type, as written for the conversion to AEM content
const TYPE_CELL = /^open-roles-(job|filter|image)$/;

const SEARCH_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><circle cx="7" cy="7" r="5.25" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
const CLOSE_ICON = '<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';
const PIN_ICON = '<svg viewBox="0 0 12 14" aria-hidden="true" focusable="false"><path d="M6 13s4.5-4.2 4.5-7.6A4.5 4.5 0 0 0 1.5 5.4C1.5 8.8 6 13 6 13z" fill="none" stroke="currentColor" stroke-width="1.1"/><circle cx="6" cy="5.4" r="1.6" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>';
const ARROW_UP = '<svg viewBox="0 0 12 14" aria-hidden="true" focusable="false"><path d="M6 13V1.5M1.5 6L6 1.5 10.5 6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

let instance = 0;

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

/** lower case, without accents and extra spaces: for comparing */
const norm = (text) => String(text || '').toLowerCase().normalize('NFD')
  .replace(/\p{M}/gu, '')
  .replace(/\s+/g, ' ')
  .trim();

const wordsOf = (text) => norm(text).split(' ').filter(Boolean);

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

const cellsOf = (row) => [...(row?.children || [])];

/**
 * a cell's text fields: in Universal Editor each names its field (data-aue-prop), published
 * they come in model order
 */
function textsOf(cell) {
  const named = (name) => cell?.querySelector(`[data-aue-prop="${name}"]`);
  const paragraphs = [...(cell?.querySelectorAll('p') || [])]
    .filter((p) => !p.querySelector('picture, a') && p.textContent.trim());
  // a single field alone in its cell may come without a paragraph
  if (!paragraphs.length && cell && !cell.querySelector('picture, a, ul, ol') && cell.textContent.trim()) {
    paragraphs.push(cell);
  }
  return (name, i) => named(name) || paragraphs[i] || null;
}

/** an element of another tag, with the authored element's content and editor instrumentation */
function retag(node, tag, className) {
  const out = el(tag, className);
  if (!node) return out;
  moveInstrumentation(node, out);
  out.append(...[...node.childNodes].map((n) => (node.tagName === 'DIV' ? n.cloneNode(true) : n)));
  if (node.tagName !== 'DIV') node.replaceWith(out);
  return out;
}

/** text with the typed words in bold (<mark>), built as nodes: authored text is never HTML */
function highlighted(text, words) {
  const frag = document.createDocumentFragment();
  const lower = text.toLowerCase();
  const marks = [];
  words.forEach((word) => {
    let at = lower.indexOf(word);
    while (word && at !== -1) {
      marks.push([at, at + word.length]);
      at = lower.indexOf(word, at + word.length);
    }
  });
  marks.sort((a, b) => a[0] - b[0]);
  let last = 0;
  marks.forEach(([start, end]) => {
    if (end <= last) return;
    const from = Math.max(start, last);
    frag.append(text.slice(last, from));
    const mark = el('mark', 'open-roles-match');
    mark.textContent = text.slice(from, end);
    frag.append(mark);
    last = end;
  });
  frag.append(text.slice(last));
  return frag;
}

/**
 * what an item row is: a Job Role, or a row of the earlier model — a Filter or Gallery Image,
 * told by its content (such rows were also stored as Job Roles)
 */
function kindOf(row) {
  if (row.dataset.itemType) return row.dataset.itemType;
  const model = row.dataset.aueModel || '';
  if (model.endsWith('-filter')) return 'filter';
  if (model.endsWith('-image')) return 'image';
  const cells = cellsOf(row);
  if (row.querySelector('picture') && !row.querySelector('a')) return 'image';
  if (cells.length >= 2 && (FILTER_FIELDS.includes(cells[1].textContent.trim())
    || cells[2]?.querySelector('ul, ol'))) return 'filter';
  return 'job';
}

/** which role field a filter is matched against; "auto" guesses it from the filter's name */
function fieldOf(filterField, name) {
  if (filterField && filterField !== 'auto') return filterField;
  const n = norm(name);
  if (/locat|city|cities|office|place/.test(n)) return 'location';
  if (/depart|team|function|discipline/.test(n)) return 'department';
  return 'any';
}

function buildJob(row) {
  const [titleCell, metaCell, linkCell] = cellsOf(row);
  const titleText = textsOf(titleCell);
  const meta = textsOf(metaCell);
  const titleField = titleText('roleName', 0);
  const departmentField = meta('meta_department', 0);
  const locationField = meta('meta_location', 1);
  const tagsField = meta('meta_tags', 2);
  const link = (linkCell || row).querySelector('a');

  const item = el('li', 'open-roles-job');
  moveInstrumentation(row, item);
  const text = el('div', 'open-roles-job-text');
  const title = retag(titleField, 'h3', 'open-roles-job-title');
  const line = el('p', 'open-roles-job-meta');
  const department = retag(departmentField, 'span', 'open-roles-job-department');
  // the location: the pin, then its text (its own element, so a long one can end in "…")
  const locationText = retag(locationField, 'span', 'open-roles-job-location-text');
  const location = el('span', 'open-roles-job-location');
  const shown = {
    title: title.textContent.trim(),
    department: department.textContent.trim(),
    location: locationText.textContent.trim(),
  };
  location.insertAdjacentHTML('afterbegin', PIN_ICON);
  location.append(locationText);
  // texts cut short by the layout ("…") keep their whole wording as a tooltip
  [[title, shown.title], [department, shown.department], [locationText, shown.location]]
    .forEach(([node, full]) => { if (full) node.title = full; });
  if (departmentField) line.append(department);
  if (departmentField && locationField) line.append(el('span', 'open-roles-job-dot', { 'aria-hidden': 'true' }));
  if (locationField) line.append(location);
  text.append(title);
  if (line.children.length) text.append(line);
  item.append(text);

  const tags = (tagsField?.textContent || '').split(',').map(norm).filter(Boolean);
  // the other filter values are not shown; in the editor they stay selectable in the tree
  if (tagsField) {
    const hidden = retag(tagsField, 'span', 'open-roles-job-tags');
    hidden.hidden = true;
    item.append(hidden);
  }

  if (link) {
    link.classList.remove('button', 'primary', 'secondary', 'accent');
    link.className = 'open-roles-apply';
    if (!link.textContent.trim()) link.textContent = 'APPLY NOW';
    item.append(link);
  }

  const fields = {
    title: norm(shown.title),
    department: norm(shown.department),
    location: norm(shown.location),
    tags,
  };
  return {
    item,
    shown,
    fields,
    text: [fields.title, fields.department, fields.location, ...tags].join(' '),
  };
}

/** does a role have an option of a filter */
function hasOption(job, field, value) {
  const option = norm(value);
  if (field === 'tags') return job.fields.tags.some((t) => t === option || t.includes(option));
  if (field === 'location' || field === 'department') return job.fields[field].includes(option);
  return job.text.includes(option);
}

/**
 * options written in one text: separated by semicolons (or |), when the options have commas of
 * their own; else by commas; a text with the options run together ("Pune, IndiaMumbai, India",
 * from the earlier model) is split where a lower-case letter meets a capital
 */
function splitOptions(text) {
  if (/[;|]/.test(text)) return text.split(/[;|]/);
  if (/\p{Ll}\p{Lu}/u.test(text)) return text.replace(/(\p{Ll})(\p{Lu})/gu, '$1\n$2').split('\n');
  return text.split(',');
}

/**
 * a filter's options: the list of its Options field (a multi-value field, each option added
 * with Add), one checkbox per entry; pages authored before it was one, with all the options in
 * a single text: one per paragraph or line, else that text split (splitOptions)
 */
function optionsOf(cell) {
  const list = cell?.querySelector('ul, ol');
  if (list) return [...list.querySelectorAll('li')].map((li) => li.textContent);
  const paragraphs = [...(cell?.querySelectorAll('p') || [])].map((p) => p.textContent)
    .filter((text) => text.trim());
  if (paragraphs.length > 1) return paragraphs;
  const lines = [''];
  (paragraphs.length ? cell.querySelector('p') : cell)?.childNodes.forEach((node) => {
    if (node.nodeName === 'BR') lines.push('');
    else lines[lines.length - 1] += node.textContent;
  });
  if (lines.filter((line) => line.trim()).length > 1) return lines;
  // AEM's multi-value notation, as content written for the conversion to AEM has it:
  // [Pune\, India,Mumbai\, India]: entries split at the commas not escaped (\,)
  const notation = lines[0].trim().match(/^\[(.*)\]$/s);
  if (notation) {
    const entries = [''];
    for (let i = 0; i < notation[1].length; i += 1) {
      const char = notation[1][i];
      if (char === '\\' && notation[1][i + 1] === ',') {
        entries[entries.length - 1] += ',';
        i += 1;
      } else if (char === ',') entries.push('');
      else entries[entries.length - 1] += char;
    }
    return entries;
  }
  return splitOptions(lines[0]);
}

/** a field's cell, or what in it carries the field's editor instrumentation */
const instrumented = (cell) => (cell?.matches('[data-aue-prop]') ? cell
  : cell?.querySelector(':scope > [data-aue-prop]')) || el('div');

/** a Filter Dropdown item: its parts (filterCategoryName: its name in the first model) */
function filterItem(row) {
  const [nameCell, fieldCell, optionsCell] = cellsOf(row);
  const names = textsOf(nameCell);
  const nameField = names('categoryName', -1) || names('filterCategoryName', 0);
  return {
    name: nameField?.textContent.trim(),
    fieldValue: fieldCell?.textContent.trim(),
    values: optionsOf(optionsCell || row),
    source: row,
    nameField,
  };
}

/**
 * the dropdowns of the Filter Dropdowns field (a composite multi-field): each item between <hr>
 * is its name, the role field it matches (one of FILTER_FIELDS) and its options
 */
function filterCategories(cell) {
  if (!cell) return [];
  // separators and texts in page order, however deep (the editor may wrap the field's content)
  const items = [[]];
  // (only the innermost: not a list's own parts, nor a wrapper holding the others)
  [...cell.querySelectorAll('hr, p, ul, ol')]
    .filter((node) => !node.parentElement.closest('li, ul, ol') && !node.querySelector('hr, p'))
    .forEach((node) => {
      if (node.tagName === 'HR') items.push([]);
      else items[items.length - 1].push(node);
    });
  return items.map((nodes) => {
    const texts = nodes.flatMap((n) => (n.tagName === 'UL' || n.tagName === 'OL'
      ? [[...n.querySelectorAll('li')].map((li) => li.textContent).join(';')]
      : [n.textContent])).map((t) => t.trim()).filter(Boolean);
    const fieldValue = texts.find((t) => FILTER_FIELDS.includes(t));
    const [name, ...rest] = texts.filter((t) => t !== fieldValue);
    return {
      name, fieldValue, values: splitOptions(rest.join(';')),
    };
  }).filter((f) => f.name || f.values.some((v) => v.trim()));
}

/** a filter: a button showing its name (or the ticked options) opening a panel of checkboxes */
function buildFilter({
  name: authoredName, fieldValue, values: rawValues, source, nameField,
}, index) {
  const name = authoredName || 'Filter';
  const field = fieldOf(fieldValue, name);
  const values = rawValues.map((o) => o.trim()).filter(Boolean);

  const wrapper = el('div', 'open-roles-filter');
  if (source) moveInstrumentation(source, wrapper);
  const panelId = `open-roles-${instance}-filter-${index}`;
  const toggle = el('button', 'open-roles-filter-toggle', {
    type: 'button', 'aria-expanded': 'false', 'aria-controls': panelId,
  });
  const summary = el('span', 'open-roles-filter-summary');
  summary.textContent = name;
  toggle.append(summary, el('span', 'open-roles-filter-chevron', { 'aria-hidden': 'true' }));
  const panel = el('div', 'open-roles-filter-panel', { id: panelId, role: 'group', 'aria-label': name });
  panel.hidden = true;

  const options = [...new Set(values)].map((value, i) => {
    const option = el('label', 'open-roles-option');
    const input = el('input', 'open-roles-checkbox', { type: 'checkbox', value, id: `${panelId}-${i}` });
    const label = el('span', 'open-roles-option-label');
    label.textContent = value;
    const count = el('span', 'open-roles-option-count');
    option.append(input, label, count);
    panel.append(option);
    return {
      value, input, option, count,
    };
  });
  wrapper.append(toggle, panel);
  // the filter name stays in the block for the editor (picking it outlines the dropdown)
  if (nameField?.isConnected && nameField.tagName !== 'DIV') {
    const keep = retag(nameField, 'span', 'open-roles-filter-name');
    keep.hidden = true;
    wrapper.append(keep);
  }

  const filter = {
    name, field, wrapper, toggle, summary, panel, options,
  };
  filter.ticked = () => options.filter((o) => o.input.checked);
  // a role passes when nothing is ticked, or when it has one of the ticked options
  filter.passes = (job) => {
    const ticked = filter.ticked();
    return !ticked.length || ticked.some((o) => hasOption(job, field, o.value));
  };
  filter.open = (on) => {
    if (on === !panel.hidden) return;
    panel.hidden = !on;
    toggle.setAttribute('aria-expanded', String(on));
    wrapper.classList.toggle('is-open', on);
    if (!on) return;
    // the filters sit at the foot of the column: the page is moved just enough to show the
    // whole panel when it would run off the bottom of the screen
    requestAnimationFrame(() => {
      const below = panel.getBoundingClientRect().bottom + PANEL_MARGIN - window.innerHeight;
      if (below <= 0) return;
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollBy({ top: below, behavior: still ? 'auto' : 'smooth' });
    });
  };
  return filter;
}

function buildGallery(cell, rows, editing) {
  // the Gallery Images field: its pictures, in order (the field's instrumentation on the gallery)
  const pictures = [...(cell?.querySelectorAll('picture') || [])];
  let slides = pictures.map((picture) => {
    const slide = el('div', 'open-roles-slide');
    slide.append(picture);
    return slide;
  });
  // else Gallery Image rows of the earlier model; in the editor one without its image yet shows
  // as an empty frame, so it stays in the page (and in the content tree)
  if (!slides.length) {
    slides = rows.map((row) => {
      const slide = el('div', 'open-roles-slide');
      moveInstrumentation(row, slide);
      const picture = row.querySelector('picture');
      if (picture) slide.append(picture);
      else slide.classList.add('is-empty');
      return slide;
    }).filter((slide) => editing || !slide.classList.contains('is-empty'));
  }
  if (!slides.length) return null;

  const gallery = el('div', 'open-roles-gallery');
  if (pictures.length) moveInstrumentation(instrumented(cell), gallery);
  const track = el('div', 'open-roles-track');
  track.append(...slides);
  gallery.append(track);
  return gallery;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  instance += 1;
  const id = `open-roles-${instance}`;
  const editing = Boolean(block.closest('[data-aue-resource]'));
  const rows = [...block.children];
  // an item row may name its type in a first cell (open-roles-filter, …): read, then dropped
  rows.forEach((row) => {
    const first = row.children.length > 1 ? row.firstElementChild : null;
    const [, type] = first?.textContent.trim().match(TYPE_CELL) || [];
    if (!type) return;
    row.dataset.itemType = type;
    first.remove();
  });
  // the block's own fields are its first rows, one cell each (an image item is not one): two
  // (content, search); pages published with earlier models have three (content, search, labels)
  // or four (content, search, filter dropdowns, gallery)
  let fieldRows = 0;
  while (fieldRows < 4 && rows[fieldRows] && !rows[fieldRows].dataset.itemType
    && cellsOf(rows[fieldRows]).length === 1
    && !(rows[fieldRows].querySelector('picture') && !rows[fieldRows].querySelector('ul, ol'))) {
    fieldRows += 1;
  }
  const [contentRow, searchRow, thirdRow, galleryRow] = rows;
  const itemRows = rows.slice(Math.max(fieldRows, 2));
  const content = textsOf(cellsOf(contentRow)[0]);
  const search = textsOf(cellsOf(searchRow)[0]);
  const labels = fieldRows === 3 ? textsOf(cellsOf(thirdRow)[0]) : null;
  const filtersCell = fieldRows === 4 ? cellsOf(thirdRow)[0] : null;
  const galleryCell = fieldRows === 4 ? cellsOf(galleryRow)[0] : null;

  const groups = { job: [], filter: [], image: [] };
  itemRows.forEach((row) => groups[kindOf(row)].push(row));
  // the Filter Dropdown and Gallery Image items; on pages of the composite model, its two fields
  // when they are filled in (filter and image rows then left out published; in the editor they
  // show as the Job Roles they were stored as, so authors can find and delete them)
  const categories = filterCategories(filtersCell);
  const useFilterItems = !categories.length;
  const useImageItems = !galleryCell?.querySelector('picture');
  if (editing) {
    if (!useFilterItems) groups.job.push(...groups.filter);
    if (!useImageItems) groups.job.push(...groups.image);
  }

  // left: heading, search, description, filters
  const intro = el('div', 'open-roles-intro');
  const heading = el('h2', 'open-roles-heading');
  const muted = retag(content('content_heading', 0), 'span', 'open-roles-heading-muted');
  const strong = retag(content('content_headingHighlight', 1), 'span', 'open-roles-heading-strong');
  heading.append(muted, strong);

  const placeholderField = search('search_placeholder', 0);
  const helpField = search('search_help', 1);
  const labelField = search('search_filtersLabel', 2);
  const emptyField = search('search_emptyMessage', 3);
  const clearAllField = labels ? labels('labels_clearAll', 0) : search('search_clearAll', 4);
  const backToTopField = labels ? labels('labels_backToTop', 1) : search('search_backToTop', 5);
  const noResults = emptyField?.textContent.trim() || 'No roles found matching your criteria.';

  // the search box: a combobox with its suggestions under it, and × to clear it
  const searchBox = el('div', 'open-roles-search');
  const placeholder = placeholderField?.textContent.trim() || 'Search Roles';
  const suggestions = el('ul', 'open-roles-suggestions', { id: `${id}-suggestions`, role: 'listbox', 'aria-label': placeholder });
  suggestions.hidden = true;
  const input = el('input', 'open-roles-search-input', {
    id: `${id}-search`,
    type: 'text',
    inputmode: 'search',
    enterkeyhint: 'search',
    placeholder,
    'aria-label': placeholder,
    role: 'combobox',
    'aria-autocomplete': 'list',
    'aria-expanded': 'false',
    'aria-controls': suggestions.id,
    autocomplete: 'off',
    spellcheck: 'false',
  });
  if (placeholderField) {
    moveInstrumentation(placeholderField, input);
    placeholderField.remove();
  }
  const clear = el('button', 'open-roles-search-clear', { type: 'button', 'aria-label': 'Clear search' });
  clear.innerHTML = CLOSE_ICON;
  clear.hidden = true;
  searchBox.append(input, clear, suggestions);
  searchBox.insertAdjacentHTML('beforeend', `<span class="open-roles-search-icon">${SEARCH_ICON}</span>`);
  const help = retag(helpField, 'p', 'open-roles-help');
  help.id = `${id}-help`;
  input.setAttribute('aria-describedby', help.id);
  intro.append(heading, searchBox);
  if (helpField) intro.append(help);

  // the filters: label and Clear all, then one dropdown per Filter item
  const filters = (useFilterItems ? groups.filter.map(filterItem) : categories)
    .map(buildFilter);
  const clearAll = el('button', 'open-roles-clear-all', { type: 'button' });
  const clearAllLabel = retag(clearAllField, 'span', 'open-roles-clear-all-label');
  if (!clearAllLabel.textContent.trim()) clearAllLabel.textContent = 'Clear all';
  clearAll.append(clearAllLabel);
  clearAll.insertAdjacentHTML('beforeend', CLOSE_ICON);
  if (filters.length) {
    const filterBox = el('div', 'open-roles-filters');
    const head = el('div', 'open-roles-filters-head');
    const label = retag(labelField, 'p', 'open-roles-filters-label');
    if (!label.textContent.trim()) label.textContent = 'Filter Roles';
    head.append(label, clearAll);
    filterBox.append(head, ...filters.map((f) => f.wrapper));
    // the Filter Dropdowns field's instrumentation: picking it outlines the dropdowns
    if (!useFilterItems) moveInstrumentation(instrumented(filtersCell), filterBox);
    intro.append(filterBox);
  }

  // right: the scrolling list, drawn a page at a time, Back to top under it
  const jobs = groups.job.map(buildJob);
  const listWrap = el('div', 'open-roles-results');
  const list = el('div', 'open-roles-list', {
    role: 'region', 'aria-label': `${muted.textContent} ${strong.textContent}`.trim() || 'Open roles', tabindex: '0',
  });
  const jobList = el('ul', 'open-roles-jobs');
  const more = el('div', 'open-roles-more', { 'aria-hidden': 'true' });
  list.append(jobList, more);
  const empty = retag(emptyField, 'p', 'open-roles-empty');
  empty.textContent = noResults;
  const toTop = el('button', 'open-roles-top', { type: 'button' });
  toTop.insertAdjacentHTML('afterbegin', ARROW_UP);
  const toTopLabel = retag(backToTopField, 'span', 'open-roles-top-label');
  if (!toTopLabel.textContent.trim()) toTopLabel.textContent = 'Back to top';
  toTop.append(toTopLabel);
  const status = el('p', 'open-roles-status', { 'aria-live': 'polite' });
  listWrap.append(list, empty, toTop, status);

  // the state: the words searched for and the ticked options
  let query = [];
  const passesSearch = (job, words = query) => words.every((w) => job.text.includes(w));
  const passesFilters = (job, except) => filters.every((f) => f === except || f.passes(job));

  let matching = jobs;
  let shown = 0;
  const drawMore = () => {
    // the editor shows every role, so each stays selectable
    const next = editing ? matching.length : Math.min(matching.length, shown + PAGE_SIZE);
    if (next <= shown) return;
    jobList.append(...matching.slice(shown, next).map((job) => job.item));
    shown = next;
    more.hidden = shown >= matching.length;
    // eslint-disable-next-line no-use-before-define
    showTop();
  };
  const showTop = () => {
    // the editor always shows it, so its text can be edited
    toTop.classList.toggle('is-visible', editing || list.scrollTop > TOP_AFTER);
    // at the end of the list (and of the roles): no fade under the last one
    list.classList.toggle('is-end', shown >= matching.length
      && list.scrollTop + list.clientHeight >= list.scrollHeight - 2);
  };

  // each option's count: the roles it would list with the search and the other filters
  const countOptions = () => filters.forEach((f) => {
    const pool = jobs.filter((job) => passesSearch(job) && passesFilters(job, f));
    f.options.forEach((o) => {
      const n = pool.filter((job) => hasOption(job, f.field, o.value)).length;
      o.count.textContent = String(n);
      o.option.classList.toggle('is-empty', !n);
      o.option.classList.toggle('is-checked', o.input.checked);
    });
    const ticked = f.ticked();
    // the button shows the ticked options, shortened to the part before a comma (Pune, India)
    f.summary.textContent = ticked.length
      ? ticked.map((o) => o.value.split(',')[0].trim()).join(', ') : f.name;
    f.toggle.classList.toggle('has-selection', Boolean(ticked.length));
  });

  const update = () => {
    matching = jobs.filter((job) => passesSearch(job) && passesFilters(job));
    shown = 0;
    jobList.replaceChildren();
    list.scrollTop = 0;
    drawMore();
    showTop();
    countOptions();
    clearAll.hidden = !editing && !filters.some((f) => f.ticked().length);
    const none = !matching.length;
    empty.hidden = !none && !editing;
    list.classList.toggle('is-empty', none);
    status.textContent = none ? noResults
      : `${matching.length} ${matching.length === 1 ? 'role' : 'roles'}`;
  };

  // more roles as the list is scrolled near its end
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) drawMore();
    }, { root: list, rootMargin: '0px 0px 240px 0px' }).observe(more);
  }
  list.addEventListener('scroll', () => {
    showTop();
    if (!('IntersectionObserver' in window)
      && list.scrollTop + list.clientHeight >= list.scrollHeight - 240) drawMore();
  }, { passive: true });
  toTop.addEventListener('click', () => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    list.scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' });
    list.focus({ preventScroll: true });
  });

  // suggestions: the top matching roles (with the filters), the typed words in bold
  let active = -1;
  let offered = [];
  const closeSuggestions = () => {
    suggestions.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  };
  const setActive = (i) => {
    const items = [...suggestions.querySelectorAll('.open-roles-suggestion')];
    if (!items.length) return;
    active = (i + items.length) % items.length;
    items.forEach((item, n) => item.setAttribute('aria-selected', String(n === active)));
    input.setAttribute('aria-activedescendant', items[active].id);
    items[active].scrollIntoView({ block: 'nearest' });
  };
  const choose = (job) => {
    // the list narrowed to that role: its title becomes the search
    input.value = job.shown.title;
    clear.hidden = false;
    query = wordsOf(job.shown.title);
    closeSuggestions();
    update();
  };
  const suggest = () => {
    const words = wordsOf(input.value);
    if (!words.length) {
      closeSuggestions();
      return;
    }
    offered = jobs.filter((job) => passesSearch(job, words) && passesFilters(job))
      .slice(0, SUGGESTIONS);
    suggestions.replaceChildren();
    active = -1;
    if (!offered.length) {
      const none = el('li', 'open-roles-suggestion-empty', { role: 'presentation' });
      none.textContent = noResults;
      suggestions.append(none);
    }
    offered.forEach((job, i) => {
      const item = el('li', 'open-roles-suggestion', { id: `${id}-suggestion-${i}`, role: 'option', 'aria-selected': 'false' });
      const name = el('span', 'open-roles-suggestion-title');
      name.append(highlighted(job.shown.title, words));
      const where = el('span', 'open-roles-suggestion-meta');
      where.append(highlighted([job.shown.department, job.shown.location].filter(Boolean).join(' · '), words));
      item.append(name, where);
      // keeps the focus in the search box, so the choice is not lost to its blur
      item.addEventListener('mousedown', (e) => e.preventDefault());
      item.addEventListener('click', () => choose(job));
      suggestions.append(item);
    });
    suggestions.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  };

  // typing: after a pause the list follows the words and the suggestions show
  const typed = debounce(() => {
    query = wordsOf(input.value);
    update();
    if (document.activeElement === input) suggest();
  }, SEARCH_DELAY);
  input.addEventListener('input', () => {
    clear.hidden = !input.value;
    searchBox.classList.toggle('has-value', Boolean(input.value));
    typed();
  });
  input.addEventListener('focus', () => {
    if (input.value.trim()) suggest();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.hidden) suggest();
      setActive(active + (e.key === 'ArrowDown' ? 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (active >= 0 && offered[active]) choose(offered[active]);
      else {
        query = wordsOf(input.value);
        closeSuggestions();
        update();
      }
    } else if (e.key === 'Escape') {
      closeSuggestions();
    }
  });
  input.addEventListener('blur', closeSuggestions);
  clear.addEventListener('click', () => {
    input.value = '';
    clear.hidden = true;
    searchBox.classList.remove('has-value');
    query = [];
    closeSuggestions();
    update();
    input.focus();
  });

  // the filter dropdowns: one open at a time; outside click or Escape closes them
  filters.forEach((f) => {
    f.toggle.addEventListener('click', () => {
      const open = f.panel.hidden;
      filters.forEach((other) => other.open(false));
      f.open(open);
    });
    f.options.forEach((o) => o.input.addEventListener('change', update));
    f.wrapper.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || f.panel.hidden) return;
      f.open(false);
      f.toggle.focus();
    });
  });
  document.addEventListener('click', (e) => {
    filters.forEach((f) => {
      if (!f.wrapper.contains(e.target)) f.open(false);
    });
  });
  clearAll.addEventListener('click', () => {
    filters.forEach((f) => f.options.forEach((o) => { o.input.checked = false; }));
    update();
  });

  const inner = el('div', 'open-roles-inner');
  inner.append(intro, listWrap);
  const gallery = buildGallery(galleryCell, useImageItems ? groups.image : [], editing);
  block.replaceChildren(inner, ...(gallery ? [gallery] : []));
  if (editing) block.classList.add('open-roles-editing');
  // until New Science is loaded, Michroma stands in: its one weight is thickened to look like
  // the frames' Medium (open-roles.css); with New Science its own Medium is used
  const standIn = () => block.classList.toggle('open-roles-standin', ![...(document.fonts || [])]
    .some((face) => /^["']?new-science["']?$/i.test(face.family) && face.status === 'loaded'));
  standIn();
  document.fonts?.addEventListener('loadingdone', standIn);
  document.fonts?.ready.then(standIn);
  // the page scrolls freely: no eased wheel steps from section to section (scripts/delayed.js)
  document.body.dataset.nativeScroll = 'true';
  update();
}
