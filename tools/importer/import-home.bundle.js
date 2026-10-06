/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-home.js
  var import_home_exports = {};
  __export(import_home_exports, {
    default: () => import_home_default
  });

  // tools/importer/parsers/mg-hero.js
  var BULLET_RE = /^[\s•·‣⁃▪●*\-–—]+|[\s•·*\-–—✕]+$/g;
  var clean = (t) => (t || "").replace(/\s+/g, " ").replace(BULLET_RE, "").trim();
  function srcsetUrl(source) {
    const srcset = source && source.getAttribute("srcset");
    if (!srcset) return "";
    return srcset.split(",")[0].trim().split(/\s+/)[0];
  }
  function makeImg(document2, src, alt) {
    const img = document2.createElement("img");
    img.src = src;
    img.alt = alt || "";
    return img;
  }
  function hinted(document2, field, nodes) {
    const frag = document2.createDocumentFragment();
    frag.appendChild(document2.createComment(` field:${field} `));
    nodes.forEach((n) => frag.appendChild(n));
    return frag;
  }
  function makeLink(document2, href, label) {
    const p = document2.createElement("p");
    const a = document2.createElement("a");
    a.href = href;
    a.textContent = label;
    p.appendChild(a);
    return p;
  }
  function parse(element, { document: document2 }) {
    const picture = element.querySelector("picture");
    const fallbackImg = element.querySelector("img.hero__banner__dm--img, picture img, img");
    const alt = fallbackImg && (fallbackImg.getAttribute("alt") || fallbackImg.getAttribute("title")) || "";
    let desktopSrc = "";
    let mobileSrc = "";
    if (picture) {
      desktopSrc = srcsetUrl(picture.querySelector('source[media*="min-width"]'));
      mobileSrc = srcsetUrl(picture.querySelector('source[media*="max-width"]'));
    }
    const imgSrc = fallbackImg ? fallbackImg.getAttribute("src") : "";
    if (!desktopSrc) desktopSrc = imgSrc;
    if (!mobileSrc && imgSrc && imgSrc !== desktopSrc) mobileSrc = imgSrc;
    if (!desktopSrc) {
      const dmAnchors = [...element.querySelectorAll('a[href*="/is/image/"]')];
      if (dmAnchors[0]) desktopSrc = dmAnchors[0].getAttribute("href");
      if (dmAnchors[1]) mobileSrc = dmAnchors[1].getAttribute("href");
    }
    if (mobileSrc === desktopSrc) mobileSrc = "";
    const headingSrc = element.querySelector(
      ".hero__banner--title h1, .hero__banner--title h2, .hero__banner--title h3, .hero__banner--title h4, .hero__banner--title h5, .hero__banner--title h6"
    ) || element.querySelector("h1, h2, h3, h4, h5, h6") || element.querySelector(".hero__banner--title");
    const headingText = headingSrc ? clean(headingSrc.textContent) : "";
    const links = [];
    const seen = /* @__PURE__ */ new Set();
    const addLink = (a) => {
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || href.includes("/is/image/")) return;
      const labelEl = a.querySelector(".cta-section__label");
      const label = clean((labelEl || a).textContent) || clean(a.getAttribute("title"));
      if (!label || seen.has(href)) return;
      seen.add(href);
      links.push({ href, label });
    };
    element.querySelectorAll("a.cta-section__main, .hero__banner__content--cta a").forEach(addLink);
    addLink(document2.querySelector("#sticky-cta-m9-wrapper-v2 a"));
    addLink(document2.querySelector("#sticky-cta-cyber-wrapper-v2 a"));
    if (!desktopSrc && !headingText && !links.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    cells.push([desktopSrc ? hinted(document2, "image", [makeImg(document2, desktopSrc, alt)]) : ""]);
    cells.push([mobileSrc ? hinted(document2, "mobileImage", [makeImg(document2, mobileSrc, alt)]) : ""]);
    const textNodes = [];
    if (headingText) {
      const h = document2.createElement("h1");
      h.textContent = headingText;
      textNodes.push(h);
    }
    links.forEach(({ href, label }) => textNodes.push(makeLink(document2, href, label)));
    cells.push([textNodes.length ? hinted(document2, "text", textNodes) : ""]);
    const block = WebImporter.Blocks.createBlock(document2, { name: "mg-hero", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/mg-vehicles.js
  var clean2 = (t) => (t || "").replace(/\s+/g, " ").trim();
  function srcsetUrl2(source) {
    const srcset = source && source.getAttribute("srcset");
    if (!srcset) return "";
    return srcset.trim().split(",")[0].trim().split(/\s+/)[0];
  }
  function pickImage(document2, container) {
    if (!container) return null;
    const picture = container.querySelector("picture");
    const img = container.querySelector("img");
    let src = "";
    if (picture) src = srcsetUrl2(picture.querySelector('source[media*="min-width"]') || picture.querySelector("source"));
    if (!src && img) src = img.getAttribute("src") || "";
    let alt = img ? clean2(img.getAttribute("alt") || img.getAttribute("title")) : "";
    if (!src) {
      const dm = container.querySelector('a[href*="/is/image/"]');
      if (dm) {
        src = dm.getAttribute("href");
        alt = clean2(dm.textContent);
      }
    }
    if (!src) return null;
    const out = document2.createElement("img");
    out.src = src;
    out.alt = /^alt text$/i.test(alt) ? "" : alt;
    return out;
  }
  function hinted2(document2, field, nodes) {
    const frag = document2.createDocumentFragment();
    frag.appendChild(document2.createComment(` field:${field} `));
    nodes.forEach((n) => frag.appendChild(n));
    return frag;
  }
  function parse2(element, { document: document2 }) {
    const cells = [];
    const dayBg = pickImage(document2, element.querySelector(".product-showcase__background--light"));
    const nightBg = pickImage(document2, element.querySelector(".product-showcase__background--dark"));
    cells.push([dayBg ? hinted2(document2, "dayBackground", [dayBg]) : ""]);
    cells.push([nightBg ? hinted2(document2, "nightBackground", [nightBg]) : ""]);
    const slides = [...element.querySelectorAll(".product-showcase__swiper .swiper-slide")].filter((s) => !s.classList.contains("swiper-slide-duplicate"));
    const contents = [...element.querySelectorAll(".car-models-carousel__content")];
    const count = Math.max(slides.length, contents.length);
    let items = 0;
    for (let i = 0; i < count; i += 1) {
      const slide = slides[i];
      const content = contents[i];
      const day = slide && pickImage(document2, slide.querySelector(".product-showcase__swiper--image-light") || slide);
      const night = slide && pickImage(document2, slide.querySelector(".product-showcase__swiper--image-dark"));
      const mediaNodes = [];
      if (day) mediaNodes.push(document2.createComment(" field:media_dayImage "), day);
      if (night) mediaNodes.push(document2.createComment(" field:media_nightImage "), night);
      const textNodes = [];
      if (content) {
        const titleEl = content.querySelector(".car-models-carousel__content-name, h1, h2, h3, h4, h5, h6");
        const title = titleEl ? clean2(titleEl.textContent) : "";
        if (title) {
          const h = document2.createElement("h3");
          h.textContent = title;
          textNodes.push(h);
        }
        const descEl = content.querySelector(".car-models-carousel__content-description, p");
        const desc = descEl ? clean2(descEl.textContent) : "";
        if (desc) {
          const p = document2.createElement("p");
          p.textContent = desc;
          textNodes.push(p);
        }
        const seen = /* @__PURE__ */ new Set();
        content.querySelectorAll("a[href]").forEach((a) => {
          const href = a.getAttribute("href");
          if (!href || seen.has(href) || href.includes("/is/image/")) return;
          const labelEl = a.querySelector(".cta-section__label");
          const label = clean2((labelEl || a).textContent) || clean2(a.getAttribute("title"));
          if (!label) return;
          seen.add(href);
          const p = document2.createElement("p");
          const link = document2.createElement("a");
          link.href = href;
          link.textContent = label;
          p.appendChild(link);
          textNodes.push(p);
        });
      }
      if (!mediaNodes.length && !textNodes.length) continue;
      const mediaCell = document2.createDocumentFragment();
      mediaNodes.forEach((n) => mediaCell.appendChild(n));
      cells.push([
        mediaNodes.length ? mediaCell : "",
        textNodes.length ? hinted2(document2, "content_text", textNodes) : ""
      ]);
      items += 1;
    }
    if (!items && !dayBg && !nightBg) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "mg-vehicles", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/mg-masonry-grid.js
  var clean3 = (t) => (t || "").replace(/\s+/g, " ").trim();
  function srcsetUrl3(source) {
    const srcset = source && source.getAttribute("srcset");
    if (!srcset) return "";
    return srcset.trim().split(",")[0].trim().split(/\s+/)[0];
  }
  function imageKey(src) {
    try {
      const u = new URL(src, "https://x/");
      return u.pathname.toLowerCase();
    } catch (e) {
      return (src || "").split("?")[0].toLowerCase();
    }
  }
  function parse3(element, { document: document2 }) {
    let units = [...element.querySelectorAll(".swiper-slide")];
    if (!units.length) units = [...element.querySelectorAll('picture, a[href*="/is/image/"]')];
    const indexed = units.map((unit, domIndex) => {
      const idx = parseInt(unit.getAttribute("data-swiper-slide-index"), 10);
      return { unit, order: Number.isNaN(idx) ? domIndex : idx, domIndex };
    });
    indexed.sort((a, b) => a.order - b.order || a.domIndex - b.domIndex);
    const seen = /* @__PURE__ */ new Set();
    const images = [];
    indexed.forEach(({ unit }) => {
      const img = unit.tagName === "IMG" ? unit : unit.querySelector("img");
      const picture = unit.tagName === "PICTURE" ? unit : unit.querySelector("picture");
      let src = img ? img.getAttribute("src") : "";
      if (!src && picture) src = srcsetUrl3(picture.querySelector("source"));
      let alt = img ? clean3(img.getAttribute("alt") || img.getAttribute("title")) : "";
      if (!src) {
        const dm = unit.matches('a[href*="/is/image/"]') ? unit : unit.querySelector('a[href*="/is/image/"]');
        if (dm) {
          src = dm.getAttribute("href");
          alt = clean3(dm.textContent);
        }
      }
      if (!src) return;
      const key = imageKey(src);
      if (seen.has(key)) return;
      seen.add(key);
      images.push({ src, alt });
    });
    if (!images.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = images.map(({ src, alt }) => {
      const frag = document2.createDocumentFragment();
      frag.appendChild(document2.createComment(" field:image "));
      const img = document2.createElement("img");
      img.src = src;
      img.alt = alt;
      frag.appendChild(img);
      return [frag];
    });
    const block = WebImporter.Blocks.createBlock(document2, { name: "mg-masonry-grid", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/mg-cards.js
  var clean4 = (t) => (t || "").replace(/\s+/g, " ").trim();
  var titleCase = (t) => clean4(t).replace(/\b([a-z])/g, (m) => m.toUpperCase());
  function srcsetUrl4(source) {
    const srcset = source && source.getAttribute("srcset");
    if (!srcset) return "";
    return srcset.trim().split(",")[0].trim().split(/\s+/)[0];
  }
  function pickImage2(document2, container) {
    if (!container) return null;
    const picture = container.matches("picture") ? container : container.querySelector("picture");
    const img = container.querySelector("img");
    let src = "";
    if (picture) src = srcsetUrl4(picture.querySelector('source[media*="min-width"]'));
    if (!src && img) src = img.getAttribute("src") || "";
    if (!src && picture) src = srcsetUrl4(picture.querySelector("source"));
    let alt = img ? clean4(img.getAttribute("alt") || img.getAttribute("title")) : "";
    if (!src) {
      const dm = container.querySelector('a[href*="/is/image/"]');
      if (dm) {
        src = dm.getAttribute("href");
        alt = clean4(dm.textContent);
      }
    }
    if (!src) return null;
    const out = document2.createElement("img");
    out.src = src;
    out.alt = alt;
    return out;
  }
  function hinted3(document2, field, nodes) {
    const frag = document2.createDocumentFragment();
    frag.appendChild(document2.createComment(` field:${field} `));
    nodes.forEach((n) => frag.appendChild(n));
    return frag;
  }
  function parse4(element, { document: document2 }) {
    let slides = [...element.querySelectorAll(".mg-swiper-slide")];
    if (!slides.length) slides = [...element.querySelectorAll(".swiper-slide")];
    slides = slides.filter((s) => !s.classList.contains("swiper-slide-duplicate"));
    let background = null;
    const items = [];
    const seenHref = /* @__PURE__ */ new Set();
    slides.forEach((slide) => {
      if (!background) {
        const bgLayer = slide.querySelector(".hero__banner--wrapper > div.position-absolute");
        if (bgLayer) background = pickImage2(document2, bgLayer);
        if (background) background.alt = "";
      }
      const artContainer = slide.querySelector(".hero__banner__dm__img--container") || slide;
      const link = [...artContainer.querySelectorAll("a[href]")].find((a) => !(a.getAttribute("href") || "").includes("/is/image/"));
      const art = pickImage2(document2, artContainer.querySelector("picture") || artContainer);
      const href = link ? link.getAttribute("href") : "";
      const city = link && clean4(link.getAttribute("aria-label") || link.textContent) || art && art.alt || "";
      if (!art && !href) return;
      const key = `${href}|${art ? art.src : ""}`;
      if (seenHref.has(key)) return;
      seenHref.add(key);
      items.push({ art, href, city });
    });
    if (!items.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    cells.push([background ? hinted3(document2, "background", [background]) : ""]);
    items.forEach(({ art, href, city }) => {
      let textCell = "";
      if (href) {
        const p = document2.createElement("p");
        const a = document2.createElement("a");
        a.href = href;
        a.textContent = titleCase(city) || href;
        p.appendChild(a);
        textCell = hinted3(document2, "text", [p]);
      } else if (city) {
        const p = document2.createElement("p");
        p.textContent = titleCase(city);
        textCell = hinted3(document2, "text", [p]);
      }
      cells.push([art ? hinted3(document2, "image", [art]) : "", textCell]);
    });
    const block = WebImporter.Blocks.createBlock(document2, { name: "mg-cards", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/mg-timeline.js
  var clean5 = (t) => (t || "").replace(/[​-‍﻿]/g, "").replace(/\s+/g, " ").trim();
  function hinted4(document2, field, nodes) {
    const frag = document2.createDocumentFragment();
    frag.appendChild(document2.createComment(` field:${field} `));
    nodes.forEach((n) => frag.appendChild(typeof n === "string" ? document2.createTextNode(n) : n));
    return frag;
  }
  function pickImage3(document2, slide, fallbackAlt) {
    const img = slide.querySelector("picture img, img");
    let src = img ? img.getAttribute("src") : "";
    if (!src) {
      const source = slide.querySelector("picture source[srcset]");
      if (source) src = source.getAttribute("srcset").trim().split(",")[0].trim().split(/\s+/)[0];
    }
    let alt = img ? clean5(img.getAttribute("alt") || img.getAttribute("title")) : "";
    if (!src) {
      const dm = slide.querySelector('a[href*="/is/image/"]');
      if (dm) {
        src = dm.getAttribute("href");
        alt = clean5(dm.textContent);
      }
    }
    if (!src) return null;
    const out = document2.createElement("img");
    out.src = src;
    out.alt = alt || fallbackAlt || "";
    return out;
  }
  function parse5(element, { document: document2 }) {
    let slides = [...element.querySelectorAll(".timeline-card")];
    if (!slides.length) slides = [...element.querySelectorAll(".swiper-slide")];
    slides = slides.filter((s) => !s.classList.contains("swiper-slide-duplicate"));
    const seenIdx = /* @__PURE__ */ new Set();
    slides = slides.map((s, i) => {
      const idx = parseInt(s.getAttribute("data-swiper-slide-index"), 10);
      return { s, order: Number.isNaN(idx) ? i : idx, hasIdx: !Number.isNaN(idx), i };
    }).sort((a, b) => a.order - b.order || a.i - b.i).filter(({ order, hasIdx }) => {
      if (!hasIdx) return true;
      if (seenIdx.has(order)) return false;
      seenIdx.add(order);
      return true;
    }).map(({ s }) => s);
    const cells = [];
    slides.forEach((slide) => {
      const yearEl = slide.querySelector(".model-year");
      const year = clean5(slide.getAttribute("data-year")) || (yearEl ? clean5(yearEl.textContent) : "");
      const overlay = slide.querySelector(".overlay");
      const tooltip = slide.querySelector(".timeline-card-tooltip, .tooltip");
      let title = "";
      if (overlay) {
        const copy = overlay.cloneNode(true);
        copy.querySelectorAll(".timeline-card-tooltip, .tooltip, span").forEach((n) => n.remove());
        title = clean5(copy.textContent).replace(/^\+\s*/, "");
      }
      const description = tooltip ? clean5(tooltip.textContent) : "";
      const image = pickImage3(document2, slide, title);
      if (!title && image) title = clean5(image.alt);
      if (!year && !title && !description && !image) return;
      const textNodes = [];
      if (title) {
        const h = document2.createElement("h3");
        h.textContent = title;
        textNodes.push(h);
      }
      if (description) {
        const p = document2.createElement("p");
        p.textContent = description;
        textNodes.push(p);
      }
      cells.push([
        image ? hinted4(document2, "image", [image]) : "",
        year ? hinted4(document2, "year", [year]) : "",
        textNodes.length ? hinted4(document2, "text", textNodes) : ""
      ]);
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "mg-timeline", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/mg-section-nav.js
  function parse6(element, { document: document2 }) {
    const cells = [[""]];
    const block = WebImporter.Blocks.createBlock(document2, { name: "mg-section-nav", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/mgselect-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      WebImporter.DOMUtils.remove(element, [
        ".cookieConsent",
        // <div class="cookieConsent aem-GridColumn ..."> (line 4322)
        ".loader",
        // <div class="loader aem-GridColumn ..."> (line 4353)
        ".popUpModal"
        // <div class="popUpModal aem-GridColumn ..."> newsletter modal (line 4562)
      ]);
      WebImporter.DOMUtils.remove(element, [".swiper-slide-duplicate"]);
      WebImporter.DOMUtils.remove(element, [
        "button.swiper-button",
        // vehicle slider prev/next (lines 978, 981)
        "button.mg-swiper-button",
        // experience centre prev/next (lines 1655, 1658)
        ".swiper-pagination",
        // vehicle slider bullets (line 984)
        ".mg-swiper-pagination",
        // experience centre bullets (line 1661)
        ".timeline-swiper-pagination"
        // heritage timeline bullets (line 1977)
      ]);
    }
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        "header.experiencefragment",
        // line 8
        ".header__overlay",
        // line 834 (inside header; safety net)
        "footer.experiencefragment",
        // line 4319
        "footer.mg-select__footer",
        // line 4363
        ".mg-footer"
        // wrapper of footer.mg-select__footer (line 4362)
      ]);
      WebImporter.DOMUtils.remove(element, [
        "#sticky-cta-m9-wrapper-v2",
        // line 4600
        "#sticky-cta-cyber-wrapper-v2"
        // line 4604
      ]);
      WebImporter.DOMUtils.remove(element, [".timeline-swiper-pagination-div"]);
      WebImporter.DOMUtils.remove(element, ["script", "style", "noscript", "iframe", "link"]);
    }
  }

  // tools/importer/transformers/mgselect-sections.js
  var SECTION_MARKER_ATTR = "data-excat-section-id";
  var HEADER_THEME_ATTR = "data-excat-header";
  function headerTheme(sectionEl) {
    const has = (cls) => sectionEl.classList.contains(cls) || !!sectionEl.querySelector(`:scope > .${cls}`);
    if (has("hide-header")) return "hidden";
    if (has("light-header")) return "light";
    if (has("dark-header") || has("mg-header-white")) return "dark";
    return "";
  }
  function querySection(root, selectors) {
    const list = Array.isArray(selectors) ? selectors : [selectors];
    for (const sel of list) {
      if (!sel) continue;
      const el = root.querySelector(sel);
      if (el) return el;
    }
    return null;
  }
  function transform2(hookName, element, payload) {
    const sections = payload && payload.template && payload.template.sections || [];
    if (sections.length < 2) return;
    if (hookName === "beforeTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        const sectionEl = querySection(element, section.selector);
        if (!sectionEl) continue;
        const theme = headerTheme(sectionEl);
        if (i === 0 && !section.style && !theme) continue;
        const hr = document.createElement("hr");
        if (section.style || theme) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
        if (theme) hr.setAttribute(HEADER_THEME_ATTR, theme);
        sectionEl.before(hr);
      }
    }
    if (hookName === "afterTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
        const theme = marker ? marker.getAttribute(HEADER_THEME_ATTR) : "";
        if (!section.style && !theme) continue;
        const anchor = marker || querySection(element, section.selector);
        if (!anchor) continue;
        const cells = {};
        if (section.style) cells.style = section.style;
        if (theme) cells.header = theme;
        const metadataBlock = WebImporter.Blocks.createBlock(document, {
          name: "Section Metadata",
          cells
        });
        anchor.after(metadataBlock);
        if (marker) {
          marker.removeAttribute(SECTION_MARKER_ATTR);
          marker.removeAttribute(HEADER_THEME_ATTR);
          if (i === 0) marker.remove();
        }
      }
    }
  }

  // tools/importer/transformers/mgselect-dm-images.js
  function detectDynamicMediaUrl(urlStr) {
    if (typeof urlStr !== "string") return false;
    if (!/^(https?:\/\/|\/\/)/i.test(urlStr)) return false;
    let u;
    try {
      u = new URL(urlStr, "https://x/");
    } catch (e) {
      return false;
    }
    if (u.pathname.startsWith("/is/image/")) {
      return "scene7";
    }
    if (/^delivery-p\d+-e\d+\.adobeaemcloud\.com$/.test(u.hostname) && u.pathname.startsWith("/adobe/assets/urn:")) {
      return "dm-openapi";
    }
    return false;
  }
  var LINKED_DM_INLINE_WRAPPER_TAGS = /* @__PURE__ */ new Set(["PICTURE"]);
  var LINKED_DM_WRAPPER_SIBLING_TAGS = /* @__PURE__ */ new Set(["SOURCE"]);
  function findLinkedDmCarrier(img) {
    if (!img || !img.parentElement) return null;
    let node = img;
    let parent = img.parentElement;
    while (parent && LINKED_DM_INLINE_WRAPPER_TAGS.has(parent.tagName)) {
      let foundNode = false;
      for (const child of parent.children) {
        if (child === node) {
          foundNode = true;
        } else if (!LINKED_DM_WRAPPER_SIBLING_TAGS.has(child.tagName)) {
          return null;
        }
      }
      if (!foundNode) return null;
      node = parent;
      parent = parent.parentElement;
    }
    if (!parent || parent.tagName !== "A") return null;
    if (parent.children.length !== 1 || parent.children[0] !== node) return null;
    if (parent.textContent.trim() !== "") return null;
    return parent;
  }
  var EMPTY_ALT_SENTINEL = "Image without alt text";
  function altToLinkText(alt) {
    return alt || EMPTY_ALT_SENTINEL;
  }
  function transform3(hookName, element, payload) {
    if (hookName !== "afterTransform") return;
    const doc = element.ownerDocument;
    element.querySelectorAll("img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      if (!detectDynamicMediaUrl(src)) return;
      const alt = img.getAttribute("alt") || "";
      const linkedAnchor = findLinkedDmCarrier(img);
      if (linkedAnchor) {
        linkedAnchor.setAttribute("title", src);
        linkedAnchor.textContent = altToLinkText(alt);
        return;
      }
      const parent = img.parentElement;
      if (parent && parent.tagName === "A") {
        console.warn("DM image inside mixed-content anchor, skipped:", src);
        return;
      }
      const a = doc.createElement("a");
      a.href = src;
      a.textContent = altToLinkText(alt);
      img.replaceWith(a);
    });
  }

  // tools/importer/import-home.js
  var parsers = {
    "mg-hero": parse,
    "mg-vehicles": parse2,
    "mg-masonry-grid": parse3,
    "mg-cards": parse4,
    "mg-timeline": parse5,
    "mg-section-nav": parse6
  };
  var PAGE_TEMPLATE = {
    "name": "home",
    "description": "MG Select homepage: full-viewport vertical scroll-snap panels (hero, vehicle slider, brand manifesto collage, experience centre slider, heritage timeline) with a fixed section indicator",
    "urls": [
      "https://www.mgselect.co.in/"
    ],
    "blocks": [
      {
        "name": "mg-hero",
        "instances": [
          ".banner.mg-select-scroller.light-header"
        ]
      },
      {
        "name": "mg-vehicles",
        "instances": [
          "section.product-showcase"
        ]
      },
      {
        "name": "mg-masonry-grid",
        "instances": [
          ".brand-manifesto__gallery"
        ]
      },
      {
        "name": "mg-cards",
        "instances": [
          ".carousel.panelcontainer.mg-select-scroller"
        ]
      },
      {
        "name": "mg-timeline",
        "instances": [
          ".timeline-swiper-container"
        ]
      },
      {
        "name": "mg-section-nav",
        "instances": [
          "div.scroller"
        ]
      }
    ],
    "sections": [
      {
        "id": "s1",
        "name": "Hero - MG SELECT x GAURAV GUPTA",
        "selector": [
          ".banner.mg-select-scroller.light-header"
        ],
        "style": null,
        "blocks": [
          "mg-hero"
        ],
        "defaultContent": []
      },
      {
        "id": "s2",
        "name": "Vehicle showcase slider",
        "selector": [
          ".productShowcase.mg-select-scroller"
        ],
        "style": null,
        "blocks": [
          "mg-vehicles"
        ],
        "defaultContent": []
      },
      {
        "id": "s3",
        "name": "Brand manifesto - A New-Era of Luxury",
        "selector": [
          ".brandManifesto.mg-select-scroller"
        ],
        "style": "light",
        "blocks": [
          "mg-masonry-grid"
        ],
        "defaultContent": [
          ".brand-manifesto__greeting",
          ".brand-manifesto__content"
        ]
      },
      {
        "id": "s4",
        "name": "Experience Centre slider",
        "selector": [
          ".carousel.panelcontainer.mg-select-scroller"
        ],
        "style": null,
        "blocks": [
          "mg-cards"
        ],
        "defaultContent": []
      },
      {
        "id": "s5",
        "name": "Our Heritage timeline",
        "selector": [
          ".tabs.panelcontainer.mg-select-scroller"
        ],
        "style": "light",
        "blocks": [
          "mg-timeline"
        ],
        "defaultContent": [
          ".mg-select-tabs__container",
          ".timeline-container__container > div:first-child"
        ]
      },
      {
        "id": "s6",
        "name": "Section navigation indicator",
        "selector": [
          "div.scroller"
        ],
        "style": null,
        "blocks": [
          "mg-section-nav"
        ],
        "defaultContent": []
      }
    ]
  };
  var transformers = [
    transform,
    ...PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [transform2] : [],
    transform3
  ];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), {
      template: PAGE_TEMPLATE
    });
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document2, template) {
    const pageBlocks = [];
    template.blocks.forEach((blockDef) => {
      blockDef.instances.forEach((selector) => {
        const elements = document2.querySelectorAll(selector);
        if (elements.length === 0) {
          console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
        }
        elements.forEach((element) => {
          pageBlocks.push({
            name: blockDef.name,
            selector,
            element,
            section: blockDef.section || null
          });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_home_default = {
    transform: (payload) => {
      const { document: document2, url, html, params } = payload;
      const main = document2.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document2, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        if (!block.element.parentNode) return;
        const parser = parsers[block.name];
        if (parser) {
          try {
            parser(block.element, { document: document2, url, params });
          } catch (e) {
            console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
          }
        } else {
          console.warn(`No parser found for block: ${block.name}`);
        }
      });
      executeTransformers("afterTransform", main, payload);
      const hr = document2.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document2);
      WebImporter.rules.transformBackgroundImages(main, document2);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      return [{
        element: main,
        path,
        report: {
          title: document2.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_home_exports);
})();
