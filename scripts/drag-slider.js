/**
 * Click-and-drag (mouse, touch, pen) for horizontal sliders.
 *
 * - `data-pressed="true"` is set on the viewport on mousedown (active cursor state),
 *   `data-dragging="true"` once the pointer has moved horizontally past a few pixels.
 * - The browser's native image / link dragging is blocked, and the click that ends a
 *   real drag is swallowed so links inside slides do not fire.
 * - Vertical touch scrolling is left to the browser (pair with `touch-action: pan-y`).
 *
 * @param {Element} viewport The element the user grabs
 * @param {object} handlers
 * @param {Function} [handlers.onStart] called when a drag begins
 * @param {Function} handlers.onMove called with the horizontal offset (px) while dragging
 * @param {Function} handlers.onEnd called with (offset px, velocity px/ms) on release
 * @returns {Function} teardown
 */
export default function enableDrag(viewport, { onStart, onMove, onEnd }) {
  const THRESHOLD = 6;
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0;
  let dragging = false;
  let suppressClick = false;

  const release = (e) => {
    if (pointerId === null || (e && e.pointerId !== pointerId)) return;
    if (viewport.hasPointerCapture?.(pointerId)) viewport.releasePointerCapture(pointerId);
    pointerId = null;
    delete viewport.dataset.pressed;
    if (!dragging) return;
    dragging = false;
    delete viewport.dataset.dragging;
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);
    onEnd(lastX - startX, velocity);
  };

  const down = (e) => {
    if (e.button !== 0 || pointerId !== null) return;
    if (e.target.closest('button, input, select, textarea')) return;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    lastX = startX;
    lastT = e.timeStamp;
    velocity = 0;
    if (e.pointerType === 'mouse') viewport.dataset.pressed = 'true';
  };

  const move = (e) => {
    if (e.pointerId !== pointerId) return;
    const dx = e.clientX - startX;
    if (!dragging) {
      if (Math.abs(dx) < THRESHOLD || Math.abs(dx) < Math.abs(e.clientY - startY)) return;
      dragging = true;
      viewport.dataset.dragging = 'true';
      viewport.setPointerCapture?.(pointerId);
      onStart?.();
    }
    const dt = e.timeStamp - lastT;
    if (dt > 0) velocity = (e.clientX - lastX) / dt;
    lastX = e.clientX;
    lastT = e.timeStamp;
    onMove(dx);
  };

  const block = (e) => e.preventDefault();
  const swallowClick = (e) => {
    if (!suppressClick) return;
    e.preventDefault();
    e.stopPropagation();
  };

  viewport.addEventListener('pointerdown', down);
  viewport.addEventListener('pointermove', move);
  viewport.addEventListener('pointerup', release);
  viewport.addEventListener('pointercancel', release);
  viewport.addEventListener('lostpointercapture', release);
  viewport.addEventListener('mouseleave', () => { if (!dragging) release(); });
  viewport.addEventListener('dragstart', block);
  viewport.addEventListener('click', swallowClick, true);

  return () => {
    viewport.removeEventListener('pointerdown', down);
    viewport.removeEventListener('pointermove', move);
    viewport.removeEventListener('pointerup', release);
    viewport.removeEventListener('pointercancel', release);
    viewport.removeEventListener('lostpointercapture', release);
    viewport.removeEventListener('dragstart', block);
    viewport.removeEventListener('click', swallowClick, true);
  };
}
