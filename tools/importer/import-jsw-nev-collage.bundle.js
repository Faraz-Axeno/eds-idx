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

  // tools/importer/import-jsw-nev-collage.js
  var import_jsw_nev_collage_exports = {};
  __export(import_jsw_nev_collage_exports, {
    default: () => import_jsw_nev_collage_default
  });
  var IMG = "images/jsw";
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
  function picture(document, file, alt) {
    const img = document.createElement("img");
    img.src = `${IMG}/${file}`;
    img.alt = alt;
    return el(document, "p", img);
  }
  var IMAGES = [
    ["engine-black.jpg", "Electrified engine with carbon intake pipes", "center-engine"],
    ["ev-charger.jpg", "Wall-mounted EV charger plugged into a car", "card-charger"],
    ["bridge-road.jpg", "Aerial view of a road bridge over water", "card-bridge"],
    ["test-hall.jpg", "Empty vehicle test hall with ceiling lights", "card-room"],
    ["suspension-spring.jpg", "Close-up of a black suspension coil spring", "card-spring"],
    ["phone-app.jpg", "Phone app showing the car battery at 72%", "card-phone"],
    ["jetour-sign.jpg", "Illuminated JETOUR lettering on a dark wall", "card-jetour"],
    ["floating-chassis.jpg", "Car body-in-white suspended in a studio", "card-chassis"],
    ["keynote-stage.jpg", "Presenter on stage at a vehicle launch keynote", "card-stage"]
  ];
  var import_jsw_nev_collage_default = {
    transform: ({ document }) => {
      const collage = WebImporter.Blocks.createBlock(document, {
        name: "parallax-collage",
        cells: [
          [hinted(document, "text", [
            el(document, "h2", "DRIVING INDIA INTO A MORE SUSTAINABLE FUTURE"),
            el(document, "p", "India is moving faster, travelling further and demanding more from mobility. New-energy vehicles can reduce dependence on fossil fuels while making cleaner technology practical for the realities of Indian roads, distances and infrastructure.")
          ])],
          ...IMAGES.map(([file, alt, position]) => [
            hinted(document, "image", [picture(document, file, alt)]),
            hinted(document, "position", [position])
          ])
        ]
      });
      const a = (href, text) => {
        const link = document.createElement("a");
        link.href = href;
        link.textContent = text;
        return link;
      };
      const navbar = WebImporter.Blocks.createBlock(document, {
        name: "jsw-navbar",
        cells: [
          [hinted(document, "brand", [el(document, "p", a("/jsw-phase-3", "JSW MOTORS"))])],
          [hinted(document, "links", [el(
            document,
            "ul",
            el(document, "li", a("/jsw-phase-3#nev-tech", "NEV TECH")),
            el(document, "li", a("/jsw-phase-3#newsroom", "NEWSROOM"))
          )])],
          [hinted(document, "cta", [el(document, "p", a("/jsw-phase-3#register-interest", "REGISTER INTEREST"))])]
        ]
      });
      const main = document.createElement("div");
      main.append(
        navbar,
        document.createElement("hr"),
        collage,
        WebImporter.Blocks.getMetadataBlock(document, {
          Title: "JSW Motors | Driving India into a more sustainable future",
          Description: "New-energy vehicles from JSW Motors: cleaner technology made practical for Indian roads, distances and infrastructure."
        })
      );
      return [{
        element: main,
        path: "/jsw-nev-collage",
        report: { title: "jsw-nev-collage", images: IMAGES.length }
      }];
    }
  };
  return __toCommonJS(import_jsw_nev_collage_exports);
})();
