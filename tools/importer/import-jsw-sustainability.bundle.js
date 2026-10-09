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

  // tools/importer/import-jsw-sustainability.js
  var import_jsw_sustainability_exports = {};
  __export(import_jsw_sustainability_exports, {
    default: () => import_jsw_sustainability_default
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
  var CARDS = [
    ["engine-blue.jpg", "Hybrid engine and electric motor under blue light"],
    ["motor-green.jpg", "Electric drive unit under green light"],
    ["chassis.jpg", "Electric vehicle chassis seen from above"],
    ["keynote-stage.jpg", "Presenter on stage at a vehicle launch keynote"],
    ["test-hall.jpg", "Empty vehicle test hall with ceiling lights"],
    ["motor-red.jpg", "Glowing red electric motor rotor"]
  ];
  var import_jsw_sustainability_default = {
    transform: ({ document }) => {
      const cells = [
        [hinted(document, "engine", [picture(document, "engine-black.jpg", "Electrified engine with carbon intake pipes")])],
        [hinted(document, "text", [
          el(document, "h2", "DRIVING INDIA INTO A MORE SUSTAINABLE FUTURE"),
          el(document, "p", "India is moving faster, travelling further and demanding more from mobility. New-energy vehicles can reduce dependence on fossil fuels while making cleaner technology practical for the realities of Indian roads, distances and infrastructure.")
        ])],
        ...CARDS.map(([file, alt]) => [hinted(document, "image", [picture(document, file, alt)])])
      ];
      const main = document.createElement("div");
      main.append(
        WebImporter.Blocks.createBlock(document, { name: "jsw-sustainability", cells }),
        WebImporter.Blocks.getMetadataBlock(document, {
          Title: "JSW Motors | Driving India into a more sustainable future",
          Description: "How new-energy vehicles from JSW Motors reduce dependence on fossil fuels while making cleaner technology practical for Indian roads."
        })
      );
      return [{
        element: main,
        path: "/jsw-sustainability",
        report: { title: "jsw-sustainability", cards: CARDS.length }
      }];
    }
  };
  return __toCommonJS(import_jsw_sustainability_exports);
})();
