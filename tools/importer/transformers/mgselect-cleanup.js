/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: MG Select (www.mgselect.co.in) site-wide cleanup.
 * All selectors verified in migration-work/cleaned.html (line refs from capture).
 *
 * NOTE: #sticky-cta-m9-wrapper-v2 / #sticky-cta-cyber-wrapper-v2 are intentionally
 * NOT removed in beforeTransform - the mg-hero parser pulls them in. Any leftovers
 * are removed in afterTransform.
 * NOTE: .brand-manifesto__gallery (20 imgs, duplicated for infinite loop) is left
 * untouched for the mg-masonry-grid parser - no selector here targets it.
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Overlays / modals that can interfere with block parsing.
    WebImporter.DOMUtils.remove(element, [
      '.cookieConsent', // <div class="cookieConsent aem-GridColumn ..."> (line 4322)
      '.loader', // <div class="loader aem-GridColumn ..."> (line 4353)
      '.popUpModal', // <div class="popUpModal aem-GridColumn ..."> newsletter modal (line 4562)
    ]);

    // Swiper loop clones (runtime duplicates created by swiper loop mode).
    WebImporter.DOMUtils.remove(element, ['.swiper-slide-duplicate']);

    // Swiper navigation / pagination UI (non-authorable controls).
    WebImporter.DOMUtils.remove(element, [
      'button.swiper-button', // vehicle slider prev/next (lines 978, 981)
      'button.mg-swiper-button', // experience centre prev/next (lines 1655, 1658)
      '.swiper-pagination', // vehicle slider bullets (line 984)
      '.mg-swiper-pagination', // experience centre bullets (line 1661)
      '.timeline-swiper-pagination', // heritage timeline bullets (line 1977)
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Global chrome: header (contains .header__overlay, line 834) and footer
    // experience fragments (footer XF wraps cookie/loader/mg-footer/popUpModal).
    WebImporter.DOMUtils.remove(element, [
      'header.experiencefragment', // line 8
      '.header__overlay', // line 834 (inside header; safety net)
      'footer.experiencefragment', // line 4319
      'footer.mg-select__footer', // line 4363
      '.mg-footer', // wrapper of footer.mg-select__footer (line 4362)
    ]);

    // Sticky CTA wrappers - only remove leftovers after mg-hero parser has consumed them.
    WebImporter.DOMUtils.remove(element, [
      '#sticky-cta-m9-wrapper-v2', // line 4600
      '#sticky-cta-cyber-wrapper-v2', // line 4604
    ]);

    // Mobile-only timeline year indicator (duplicate of timeline content, d-lg-none).
    WebImporter.DOMUtils.remove(element, ['.timeline-swiper-pagination-div']); // line 1971

    // Non-content elements.
    WebImporter.DOMUtils.remove(element, ['script', 'style', 'noscript', 'iframe', 'link']);
  }
}
