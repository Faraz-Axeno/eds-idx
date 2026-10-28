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

  // tools/importer/import-jsw-nav.js
  var import_jsw_nav_exports = {};
  __export(import_jsw_nav_exports, {
    default: () => import_jsw_nav_default
  });
  function hinted(document, field, nodes) {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(` field:${field} `));
    nodes.forEach((n) => frag.appendChild(typeof n === "string" ? document.createTextNode(n) : n));
    return frag;
  }
  function el(document, tag, ...children) {
    const node = document.createElement(tag);
    children.forEach((c) => node.append(typeof c === "string" ? document.createTextNode(c) : c));
    return node;
  }
  function link(document, href, text) {
    const a = el(document, "a", text);
    a.href = href;
    return el(document, "p", a);
  }
  var LINKS = [
    ["NEV TECH", "/jsw-phase-3#nev-tech"],
    ["NEWSROOM", "/jsw-phase-3#newsroom"]
  ];
  var import_jsw_nav_default = {
    transform: ({ document }) => {
      const cells = [
        [hinted(document, "brand", [el(document, "p", "JSW MOTORS")])],
        [hinted(document, "homeLink", [link(document, "/jsw-phase-3", "/jsw-phase-3")])],
        [hinted(document, "cta", [link(document, "/jsw-phase-3#register-interest", "REGISTER INTEREST")])],
        ...LINKS.map(([text, href]) => [
          document.createTextNode("jsw-nav-link"),
          hinted(document, "link", [link(document, href, text)])
        ])
      ];
      const main = document.createElement("div");
      main.append(WebImporter.Blocks.createBlock(document, { name: "jsw-nav", cells }));
      return [{ element: main, path: "/jsw-nav", report: { title: "jsw-nav" } }];
    }
  };
  return __toCommonJS(import_jsw_nav_exports);
})();
