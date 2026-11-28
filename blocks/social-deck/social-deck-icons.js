// Social icons in a Social Deck section's head, however authored, as one row of tiles

import { decorateIcons } from '../../scripts/aem.js';

// accessible names per platform
const LABELS = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  x: 'X',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
};
const KEYS = Object.keys(LABELS);

// other names authors use for a platform
const ALIASES = {
  twitter: 'x',
  'x-twitter': 'x',
  'linked-in': 'linkedin',
  'you-tube': 'youtube',
  fb: 'facebook',
  ig: 'instagram',
  yt: 'youtube',
};

// platform per link address
const HOSTS = [
  [/(^|\.)instagram\.com$/i, 'instagram'],
  [/(^|\.)(facebook|fb)\.com$/i, 'facebook'],
  [/(^|\.)linkedin\.com$/i, 'linkedin'],
  [/(^|\.)(youtube\.com|youtu\.be)$/i, 'youtube'],
  [/(^|\.)(x|twitter)\.com$/i, 'x'],
];

const text = (el) => (el ? el.textContent.trim() : '');

// a platform key for a name ("Instagram", "linked-in", "twitter" ...), or null
function platform(name) {
  const n = (name || '').trim().toLowerCase().replace(/[\s_]+/g, '-');
  const key = ALIASES[n] || n;
  return KEYS.includes(key) ? key : null;
}

// the platform an image is for, from its file name or alt text, or null
function imagePlatform(img) {
  if (!img) return null;
  const file = (img.getAttribute('src') || '').split(/[?#]/)[0].split('/').pop()
    .replace(/\.[a-z0-9]+$/i, '');
  return platform(file) || platform(img.alt);
}

// the platform a link is for: its icon token, image, text or address, or null
function linkPlatform(a) {
  const span = a.querySelector('span.icon');
  const token = span && [...span.classList].find((c) => c.startsWith('icon-'));
  let host = '';
  try {
    host = new URL(a.getAttribute('href') || '', window.location.href).hostname;
  } catch {
    // not a valid address
  }
  return platform(token && token.slice(5))
    || imagePlatform(a.querySelector('img:not([data-icon-name])'))
    || platform(text(a))
    || (HOSTS.find(([re]) => re.test(host)) || [])[1]
    || null;
}

// an authored icon that brings its own tile fills it (.has-own-tile), as in the footer
function markOwnTile(img, tile) {
  const check = () => {
    const { naturalWidth: w, naturalHeight: h } = img;
    if (!w || !h || Math.abs(w / h - 1) > 0.1) return;
    try {
      const n = 24;
      const canvas = document.createElement('canvas');
      canvas.width = n;
      canvas.height = n;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, n, n);
      const { data } = ctx.getImageData(0, 0, n, n);
      let painted = 0;
      let edge = 0;
      let edgeAlpha = 0;
      let edgeLight = 0;
      for (let y = 0; y < n; y += 1) {
        for (let x = 0; x < n; x += 1) {
          const k = (y * n + x) * 4;
          if (data[k + 3] > 8) painted += 1;
          // the outer two-pixel ring, leaving out the rounded corners
          const ring = Math.min(x, y, n - 1 - x, n - 1 - y) < 2;
          const corner = Math.min(x, n - 1 - x) < 4 && Math.min(y, n - 1 - y) < 4;
          if (ring && !corner) {
            edge += 1;
            edgeAlpha += data[k + 3];
            edgeLight += (data[k] + data[k + 1] + data[k + 2]) / 3;
          }
        }
      }
      const covered = painted / (n * n) > 0.9;
      const tileEdge = edgeAlpha / edge < 160 || edgeLight / edge < 80;
      if (covered && tileEdge) tile.classList.add('has-own-tile');
    } catch {
      // can't be read: it stays a plain icon in the tile
    }
  };
  if (img.complete) check();
  else img.addEventListener('load', check, { once: true });
}

// a paragraph holding only an image (an Image component)
const imageOnly = (p) => !!p.querySelector('img') && !p.querySelector('a') && !text(p);

// gathers the section head's social icons into one list of tiles; null when there are none
export default function decorateSocialIcons(wrapper, moveInstrumentation) {
  if (!wrapper) return null;
  // the head's parts, also inside Universal Editor's component wrappers
  const parts = [...wrapper.children].flatMap((el) => (
    el.matches('div[data-aue-type]') ? [...el.children] : [el]));
  // lists whose links are all social platform links
  const lists = parts.filter((el) => el.matches('ul')).filter((ul) => {
    const links = [...ul.querySelectorAll('a[href]')];
    return links.length && links.every(linkPlatform);
  });
  // Image components: in the head these are always the icons, whatever the file is called
  const loose = parts.filter((el) => el.matches('picture, img') || (el.matches('p') && imageOnly(el)));
  if (!lists.length && !loose.length) return null;

  // an emptied editor wrapper goes, its instrumentation kept on the part
  const unwrap = (group, part) => {
    if (!group || group === wrapper || !group.matches('div[data-aue-type]')) return;
    if (group.children.length || text(group)) return;
    if (!part.hasAttribute('data-aue-resource')) moveInstrumentation(group, part);
    group.remove();
  };

  // authored order, so the tiles keep it whichever way the icons were added
  const order = new Map();
  [...wrapper.querySelectorAll('a[href], img')].forEach((el, i) => order.set(el, i));
  const links = lists.flatMap((ul) => [...ul.querySelectorAll('a[href]')]);
  const free = links.filter((a) => !a.querySelector('img, span.icon'));
  const items = []; // [position, tile]

  loose.forEach((part) => {
    const img = part.matches('img') ? part : part.querySelector('img');
    const pic = img.closest('picture') || img;
    const group = part.parentElement;
    // a paragraph holding the image goes; its instrumentation stays on the picture
    if (part.matches('p') && !pic.hasAttribute('data-aue-resource')) moveInstrumentation(part, pic);
    const key = imagePlatform(img);
    let at = key ? free.findIndex((a) => linkPlatform(a) === key) : -1;
    if (at < 0 && free.length) at = 0;
    let tile;
    if (at >= 0) {
      [tile] = free.splice(at, 1);
      tile.prepend(pic);
    } else {
      // no link for it: shown as it is, named by its alt text (or its platform)
      tile = document.createElement('span');
      if (!img.alt.trim() && key) img.alt = LABELS[key];
      tile.append(pic);
    }
    items.push([order.get(img), tile]);
    if (part !== pic && part !== img) part.remove();
    unwrap(group, pic);
  });
  links.filter((a) => !items.some(([, tile]) => tile === a))
    .forEach((a) => items.push([order.get(a), a]));

  const tiles = items.sort(([p], [q]) => p - q).map(([, tile]) => tile);
  tiles.forEach((tile) => {
    tile.classList.add('social-deck-icon');
    if (tile.tagName !== 'A') return;
    const key = linkPlatform(tile);
    // the name: the image's Alt Text, else the link text (not an address), else the platform
    const alt = tile.querySelector('img:not([data-icon-name])')?.alt.trim();
    const label = text(tile);
    const name = alt || (label && !/[/.]/.test(label) ? label : LABELS[key]);
    if (name) tile.setAttribute('aria-label', name);
    if (key) tile.dataset.platform = key;
    // show the authored icon (image or token); only a link with none gets the project's icon
    const own = tile.querySelector('picture') || tile.querySelector('img') || tile.querySelector('span.icon');
    if (own) {
      // the link carries the name, so the image itself is decorative (read once, not twice)
      tile.querySelectorAll('img').forEach((img) => { img.alt = ''; });
      tile.replaceChildren(own);
    } else if (key) {
      const icon = document.createElement('span');
      icon.className = `icon icon-${key}`;
      tile.replaceChildren(icon);
    }
  });

  // one list, straight in the head, where the first one was
  const [list] = lists;
  const ul = list || document.createElement('ul');
  const listGroup = list && list.parentElement !== wrapper ? list.parentElement : null;
  if (!list) wrapper.append(ul);
  else if (listGroup) listGroup.after(ul);
  lists.slice(1).forEach((extra) => {
    const extraGroup = extra.parentElement;
    extra.remove();
    unwrap(extraGroup, ul);
  });
  unwrap(listGroup, ul);
  ul.replaceChildren(...tiles.map((tile) => {
    const li = document.createElement('li');
    li.append(tile);
    return li;
  }));
  decorateIcons(ul);
  ul.querySelectorAll('img:not([data-icon-name])').forEach((img) => {
    markOwnTile(img, img.closest('.social-deck-icon'));
  });
  return ul;
}
