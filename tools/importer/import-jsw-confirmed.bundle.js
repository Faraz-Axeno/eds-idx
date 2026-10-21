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

  // tools/importer/import-jsw-confirmed.js
  var import_jsw_confirmed_exports = {};
  __export(import_jsw_confirmed_exports, {
    default: () => import_jsw_confirmed_default
  });
  var IMG = "images/jsw";
  function hinted(document, field, nodes) {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(` field:${field} `));
    nodes.forEach((n) => frag.appendChild(n));
    return frag;
  }
  function el(document, tag, ...children) {
    const node = document.createElement(tag);
    children.forEach((c) => node.append(typeof c === "string" ? document.createTextNode(c) : c));
    return node;
  }
  function picture(document, file, alt) {
    const img = document.createElement("img");
    img.src = `${IMG}/${file}`;
    img.alt = alt;
    return el(document, "p", img);
  }
  function group(document, fields) {
    const frag = document.createDocumentFragment();
    fields.forEach(([field, node]) => frag.appendChild(hinted(document, field, [node])));
    return [frag];
  }
  var import_jsw_confirmed_default = {
    transform: ({ document, url }) => {
      const split = /split/.test(url || "");
      const cells = [
        [hinted(document, "layoutVariant", [document.createTextNode(split ? "layout-split" : "layout-centered")])],
        group(document, [
          ["media_background", picture(document, "reserve-landscape.jpg", "Blue hills around a still lake")],
          ["media_foreground", picture(document, "reserve-car.jpg", "Silhouette of the JSW SUV against a dark backdrop")]
        ]),
        group(document, [
          ["content_heading", el(document, "p", "CONFIRMED")],
          ["content_subheading", el(document, "p", split ? "YOU\u2019RE ALL SET, {NAME}." : "YOU\u2019RE IN, {NAME}.")],
          ["content_message", el(document, "p", split ? "We\u2019ll message you when allocation opens in December. Your receipt is on its way to {email}." : "We\u2019ll message you when allocation opens. Your receipt is on its way to {email}.")]
        ])
      ];
      const main = document.createElement("div");
      main.append(WebImporter.Blocks.createBlock(document, { name: "reservation-confirmation", cells }));
      return [{ element: main, path: split ? "/jsw-confirmed-split" : "/jsw-confirmed", report: { title: "jsw-confirmed", split } }];
    }
  };
  return __toCommonJS(import_jsw_confirmed_exports);
})();
