/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
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

  // tools/importer/import-nav.js
  var import_nav_exports = {};
  __export(import_nav_exports, {
    default: () => import_nav_default
  });
  var IMAGES = {
    "mg-select-final-logo-light": "images/mg-select-logo-light-header.png",
    "mg-select-final-logo-dark": "images/mg-select-logo-dark-header.png",
    "cybie-header": "images/nav-cyberster.png",
    "m9-burger-menu": "images/nav-m9.png",
    location: "images/icon-location.png"
  };
  function text(el2) {
    return ((el2 == null ? void 0 : el2.textContent) || "").replace(/\s+/g, " ").trim();
  }
  function localImage(document, srcImg) {
    const src = srcImg.getAttribute("src") || "";
    const key = src.split("?")[0].split("/").pop();
    const img = document.createElement("img");
    img.src = IMAGES[key] || src;
    img.alt = srcImg.getAttribute("alt") || "";
    return img;
  }
  function el(document, tag, ...children) {
    const node = document.createElement(tag);
    children.filter(Boolean).forEach((c) => node.append(typeof c === "string" ? document.createTextNode(c) : c));
    return node;
  }
  function link(document, a, label) {
    const out = document.createElement("a");
    out.href = a.getAttribute("href");
    out.textContent = label || text(a.querySelector(".cta-section__label") || a);
    return out;
  }
  var import_nav_default = {
    transform: ({ document }) => {
      const header = document.querySelector(".header-section");
      const main = document.createElement("div");
      const sections = [];
      const brand = [];
      header.querySelectorAll(".header__logo a").forEach((a) => {
        const img = a.querySelector("img");
        const out = document.createElement("a");
        out.href = a.getAttribute("href") || "/";
        out.append(localImage(document, img));
        brand.push(el(document, "p", out));
      });
      sections.push(brand);
      const tools = [];
      header.querySelectorAll(".header__user__info a").forEach((a) => {
        const out = link(document, a);
        const icon = header.querySelector(".header__user__info img");
        if (icon) out.prepend(localImage(document, icon), " ");
        tools.push(el(document, "p", out));
      });
      sections.push(tools);
      const tabs = [...header.querySelectorAll(".header__main--tab")];
      const pages = [...header.querySelectorAll(".header__main__border-container")];
      tabs.forEach((tab, i) => {
        const page = pages[i];
        const nodes = [el(document, "p", el(document, "strong", text(tab)))];
        const list = document.createElement("ul");
        const items = [...page.querySelectorAll(".header__main--left .header__accordion--menu > li")];
        const details = [...page.querySelectorAll(".header__main--right .header__accordion--menu-display-item")];
        items.forEach((item, j) => {
          const li = document.createElement("li");
          const title = text(item.querySelector("h3, .header__accordion-tab-name")) || text(item);
          const detail = details[j];
          const directLink = !detail && item.querySelector("a[href]");
          if (directLink) {
            const a = document.createElement("a");
            a.href = directLink.getAttribute("href");
            a.textContent = title;
            li.append(el(document, "p", a));
            list.append(li);
            return;
          }
          li.append(el(document, "p", el(document, "strong", title)));
          const sub = item.querySelector("p");
          if (sub && text(sub)) li.append(el(document, "p", el(document, "em", text(sub))));
          if (detail) {
            const desc = detail.querySelector(".header__main--text > p");
            if (desc && text(desc)) li.append(el(document, "p", text(desc)));
            const primary = detail.querySelector(".header__main--cta-group a");
            if (primary) li.append(el(document, "p", el(document, "strong", link(document, primary))));
            const actions = [...detail.querySelectorAll(".link-list a, :scope > ul a")].filter((a) => !a.closest(".header__main--cta-group"));
            const seen = /* @__PURE__ */ new Set();
            const ul = document.createElement("ul");
            actions.forEach((a) => {
              const key = `${a.getAttribute("href")}|${text(a)}`;
              if (seen.has(key) || !text(a)) return;
              seen.add(key);
              ul.append(el(document, "li", link(document, a)));
            });
            if (ul.children.length) li.append(ul);
            const imgLink = detail.querySelector("a.header__content--image");
            if (imgLink && imgLink.querySelector("img")) {
              const a = document.createElement("a");
              a.href = imgLink.getAttribute("href");
              a.append(localImage(document, imgLink.querySelector("img")));
              li.append(el(document, "p", a));
            }
          }
          list.append(li);
        });
        nodes.push(list);
        sections.push(nodes);
      });
      sections.forEach((nodes, i) => {
        if (i) main.append(document.createElement("hr"));
        main.append(...nodes);
      });
      return [{
        element: main,
        path: "/nav",
        report: { title: "nav", sections: sections.length }
      }];
    }
  };
  return __toCommonJS(import_nav_exports);
})();
