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

  // tools/importer/import-jsw-reserve.js
  var import_jsw_reserve_exports = {};
  __export(import_jsw_reserve_exports, {
    default: () => import_jsw_reserve_default
  });
  var IMG = "images/jsw";
  var CITIES = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad"];
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
  function link(document, href, text) {
    const a = el(document, "a", text);
    a.href = href;
    return el(document, "p", a);
  }
  function group(document, fields) {
    const frag = document.createDocumentFragment();
    fields.forEach(([field, node]) => frag.appendChild(hinted(document, field, [node])));
    return [frag];
  }
  function navbar(document) {
    const list = el(document, "ul");
    [["/jsw-phase-3#nev-tech", "NEV TECH"], ["/jsw-phase-3#newsroom", "NEWSROOM"]].forEach(([href, text]) => {
      const a = el(document, "a", text);
      a.href = href;
      list.append(el(document, "li", a));
    });
    return WebImporter.Blocks.createBlock(document, {
      name: "jsw-navbar",
      cells: [
        [hinted(document, "brand", [link(document, "/jsw-phase-3", "JSW MOTORS")])],
        [hinted(document, "links", [list])],
        [hinted(document, "cta", [link(document, "/jsw-reserve", "REGISTER INTEREST")])]
      ]
    });
  }
  var import_jsw_reserve_default = {
    transform: ({ document }) => {
      const cells = [
        group(document, [
          ["media_background", picture(document, "reserve-landscape.jpg", "Blue hills around a still lake")],
          ["media_foreground", picture(document, "reserve-car.jpg", "Silhouette of the JSW SUV against a dark backdrop")]
        ]),
        group(document, [
          ["content_heading", el(document, "p", "RESERVE NOW")],
          ["content_subheading", el(document, "p", "Allocation opens December 2026. Cars are assigned in the order reservations are placed.")],
          ["content_disclaimer", el(document, "p", "JSW Motors processes this data only for the purpose above, under the DPDP Act, 2023. Consent is optional and you can withdraw it or request erasure anytime at privacy@jswmotors.com. Full Privacy Notice.")]
        ]),
        group(document, [
          ["form_button", link(document, "/jsw-confirmed", "PROCEED")]
        ]),
        group(document, [
          ["fields_firstNamePlaceholder", el(document, "p", "First Name*")],
          ["fields_lastNamePlaceholder", el(document, "p", "Last Name*")],
          ["fields_mobilePlaceholder", el(document, "p", "Mobile Number*")],
          ["fields_emailPlaceholder", el(document, "p", "Email Address")],
          ["fields_cityPlaceholder", el(document, "p", "Select City")]
        ]),
        ...CITIES.map((city) => [hinted(document, "city", [document.createTextNode(city)])])
      ];
      const main = document.createElement("div");
      main.append(navbar(document), WebImporter.Blocks.createBlock(document, { name: "reservation-form", cells }));
      return [{ element: main, path: "/jsw-reserve", report: { title: "jsw-reserve" } }];
    }
  };
  return __toCommonJS(import_jsw_reserve_exports);
})();
