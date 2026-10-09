/*
 * jsw-collage: centred headline + paragraph with image cards floating around it.
 * Rows: a text row (heading + paragraph), then one row per image.
 * Desktop places the first six images in fixed slots around the text; smaller screens
 * show the text first and every image in a 2-column grid.
 */

const SLOTS = 6;

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  block.closest('.section')?.setAttribute('data-jsw-theme', 'light');
  const rows = [...block.children];
  const imageRows = rows.filter((r) => r.querySelector('picture') && !r.querySelector('h1, h2, h3'));
  const textRow = rows.find((r) => !imageRows.includes(r));

  if (textRow) {
    textRow.className = 'jsw-collage-text';
    textRow.querySelector('h1, h2, h3')?.classList.add('jsw-collage-title');
  }

  const cards = document.createElement('div');
  cards.className = 'jsw-collage-cards';
  imageRows.forEach((row, i) => {
    row.className = 'jsw-collage-card';
    row.dataset.slot = i < SLOTS ? i + 1 : 'extra';
    row.style.setProperty('--jsw-i', i);
    row.querySelector('img')?.setAttribute('loading', 'lazy');
    cards.append(row);
  });

  block.replaceChildren(...[textRow, cards].filter(Boolean));
}
