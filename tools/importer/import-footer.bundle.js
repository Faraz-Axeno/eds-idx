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

  // tools/importer/import-footer.js
  var import_footer_exports = {};
  __export(import_footer_exports, {
    default: () => import_footer_default
  });
  var ICONS = {
    instagram: { src: "images/icon-instagram.svg", alt: "Instagram" },
    x: { src: "images/icon-x-twitter.svg", alt: "X (Twitter)" },
    linkedin: { src: "images/icon-linkedin.svg", alt: "LinkedIn" }
  };
  function text(el) {
    return ((el == null ? void 0 : el.textContent) || "").replace(/\s+/g, " ").trim();
  }
  function link(document, a, label) {
    const out = document.createElement("a");
    out.href = a.getAttribute("href");
    out.textContent = label || text(a);
    return out;
  }
  function img(document, src, alt) {
    const i = document.createElement("img");
    i.src = src;
    i.alt = alt;
    return i;
  }
  function para(document, ...children) {
    const p = document.createElement("p");
    children.forEach((c) => p.append(typeof c === "string" ? document.createTextNode(c) : c));
    return p;
  }
  function list(document, items) {
    const ul = document.createElement("ul");
    items.forEach((child) => {
      const li = document.createElement("li");
      li.append(child);
      ul.append(li);
    });
    return ul;
  }
  var import_footer_default = {
    transform: ({ document, params }) => {
      var _a;
      const footer = document.querySelector("footer.mg-select__footer");
      const main = document.createElement("div");
      const sections = [];
      const section = () => {
        const s = document.createElement("div");
        sections.push(s);
        return s;
      };
      const logoLink = footer.querySelector(".footer__logo a");
      const s1 = section();
      const logoA = document.createElement("a");
      logoA.href = (logoLink == null ? void 0 : logoLink.getAttribute("href")) || "/";
      logoA.append(img(document, "images/mg-select-logo-light.png", ((_a = footer.querySelector(".footer__logo img")) == null ? void 0 : _a.alt) || "MG Select"));
      s1.append(para(document, logoA));
      const nl = footer.querySelector(".newsletter__form");
      const s2 = section();
      const nlTitle = document.createElement("strong");
      nlTitle.textContent = text(nl.querySelector(".newsletter__form--heading"));
      s2.append(para(document, nlTitle));
      s2.append(para(document, nl.querySelector("input[type=email]").getAttribute("placeholder")));
      s2.append(para(document, text(nl.querySelector(".newsletter__form-submit")), " ", img(document, "images/icon-arrow-diagonal.svg", "")));
      const consent = nl.querySelector(".newsletter__form-label");
      const consentLink = consent.querySelector("a");
      const consentLead = text(consent).replace(text(consentLink), "").trim();
      s2.append(para(document, `${consentLead} `, link(document, consentLink)));
      s2.append(para(document, "Enter email address"));
      const s3 = section();
      footer.querySelectorAll(".footer__navigation--content").forEach((content) => {
        const col = content.parentElement;
        const title = document.createElement("strong");
        title.textContent = text(col.firstElementChild);
        s3.append(para(document, title));
        s3.append(list(document, [...content.querySelectorAll("a")].map((a) => link(document, a))));
      });
      const s4 = section();
      const legal = footer.querySelector(".footer__legal");
      s4.append(para(document, text(legal.firstElementChild)));
      s4.append(list(document, [...legal.querySelectorAll(":scope > a")].map((a) => link(document, a))));
      const social = [...footer.querySelectorAll(".footer__social a")].map((a) => {
        var _a2;
        const key = (((_a2 = a.querySelector("use")) == null ? void 0 : _a2.getAttribute("xlink:href")) || "").split("#").pop();
        const icon = ICONS[key] || { src: `images/icon-${key}.svg`, alt: key };
        const out = document.createElement("a");
        out.href = a.getAttribute("href");
        out.append(img(document, icon.src, icon.alt));
        return out;
      });
      s4.append(list(document, social));
      sections.forEach((s, i) => {
        if (i) main.append(document.createElement("hr"));
        main.append(...s.childNodes);
      });
      return [{
        element: main,
        path: "/footer",
        report: { title: "footer", sections: sections.length }
      }];
    }
  };
  return __toCommonJS(import_footer_exports);
})();
