/*
 * The media file types a block's fields accept, by the asset's extension (published images keep
 * their file's: media_….jpg), for any block: import the list for the field and check the asset
 * with acceptedPicture (a <picture>) or acceptedType (a URL, e.g. a video's). An asset of another
 * type is not shown, a console warning instead.
 */

export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png']; // general images: backgrounds, photos
export const LOGO_EXTENSIONS = ['svg']; // a logo: the only field for SVG alone
export const VIDEO_EXTENSIONS = ['mp4', 'mov']; // videos
export const ICON_EXTENSIONS = ['svg', 'png']; // social and UI icons

/** an asset's file extension, from its URL's path ('' when it has none) */
export function extensionOf(url) {
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
export function acceptedType(url, allowed, field, block) {
  const ext = extensionOf(url);
  if (allowed.includes(ext)) return true;
  // eslint-disable-next-line no-console
  console.warn(`${block}: the ${field} ${url} is not shown: its file type (${ext ? `.${ext}` : 'none'}) is not .${allowed.join(', .')}`);
  return false;
}

/** a picture whose image is of an accepted file type for its field, else null (not shown) */
export function acceptedPicture(picture, allowed, field, block) {
  const src = picture?.querySelector('img')?.getAttribute('src');
  if (!picture || !src) return picture || null;
  return acceptedType(src, allowed, field, block) ? picture : null;
}
