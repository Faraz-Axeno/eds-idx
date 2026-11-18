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

  // tools/importer/import-nev-tech.js
  var import_nev_tech_exports = {};
  __export(import_nev_tech_exports, {
    default: () => import_nev_tech_default
  });
  var IMG = "images/jsw";
  var ITEMS = [
    {
      thumb: ["motor-red.jpg", "Glowing red electric motor rotor"],
      image: ["chassis-cutout.png", "Plug-in hybrid chassis with motor, battery and suspension"],
      title: "Plug-in Hybrid Electric Vehicle",
      description: "Drives on electric power for everyday journeys, with a petrol engine for added range and reassurance. On the highway engine and motor work the same axle.",
      hotspots: [
        "42, 76 | INTELLIGENT SWITCHING | Automatically alternates between pure electric and hybrid modes based on speed and terrain to optimize fuel efficiency.",
        "81, 48 | BATTERY PACK | A floor-mounted pack keeps the centre of gravity low and charges at home or on the go.",
        "31.5, 15 | EFFICIENT DRIVE UNIT | Motor, inverter and gearbox in one compact housing on the front axle."
      ]
    },
    {
      thumb: ["motor-green.jpg", "Electric drive unit under green light"],
      image: ["engine-rotax-cutout.png", "Compact powertrain on a display stand"],
      title: "Battery Electric Vehicle",
      description: "Runs on electricity alone, from a battery charged at home, at work or on the highway. Instant torque, zero tailpipe emissions and almost no running cost.",
      hotspots: [
        "40.5, 91 | POWER ELECTRONICS | Converts battery power for the motor and recovers energy every time you brake.",
        "23, 60 | THERMAL MANAGEMENT | Keeps cells at their best temperature in Indian summers for consistent range and fast charging.",
        "47, 26 | DC FAST CHARGING | Adds range in the time of a coffee stop on highway charging networks."
      ]
    },
    {
      thumb: ["engine-blue.jpg", "Hybrid engine and motor under blue light"],
      image: ["engine-black-cutout.png", "Range-extender engine with carbon intake pipes"],
      title: "Extended-Range Electric Vehicle",
      description: "The wheels are always driven electrically, while a small onboard generator tops up the battery on long journeys. Electric feel, no range anxiety.",
      hotspots: [
        "35.5, 87 | ONBOARD GENERATOR | A compact engine runs only to charge the battery, at its most efficient speed.",
        "73.5, 31 | ELECTRIC DRIVE | Every kilometre is driven by the electric motor for smooth, quiet acceleration.",
        "20, 27 | ENERGY CONTROL | Decides when to generate, store or regenerate power, based on route and charge level."
      ]
    }
  ];
  var COLLAGE_TEXT = {
    heading: "DRIVING INDIA INTO A MORE SUSTAINABLE FUTURE",
    text: "India is moving faster, travelling further and demanding more from mobility. New-energy vehicles can reduce dependence on fossil fuels while making cleaner technology practical for the realities of Indian roads, distances and infrastructure."
  };
  var COLLAGE_IMAGES = [
    [["engine-black.jpg", "Electrified engine with carbon intake pipes"], "center-engine"],
    [["ev-charger.jpg", "Wall-mounted EV charger plugged into a car"], "top-left"],
    [["test-hall.jpg", "Empty vehicle test hall with ceiling lights"], "top-right"],
    [["bridge-road-collage.jpg", "Aerial view of a road bridge over water"], "bottom-left"],
    [["suspension-spring.jpg", "Close-up of a black suspension coil spring"], "bottom-right"]
  ];
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
  function picture(document, [file, alt]) {
    const img = document.createElement("img");
    img.src = `${IMG}/${file}`;
    img.alt = alt;
    return el(document, "p", img);
  }
  var import_nev_tech_default = {
    transform: ({ document }) => {
      const cells = [
        [hinted(document, "title", [el(document, "p", "A NEW WAY TO MOVE POWERED BY TECH")])],
        ...ITEMS.map((item) => [
          (() => {
            const frag = document.createDocumentFragment();
            frag.appendChild(hinted(document, "media_thumbnail", [picture(document, item.thumb)]));
            frag.appendChild(hinted(document, "media_image", [picture(document, item.image)]));
            return frag;
          })(),
          hinted(document, "title", [el(document, "p", item.title)]),
          hinted(document, "description", [el(document, "p", item.description)]),
          hinted(document, "hotspots", [(() => {
            const list = el(document, "ul");
            item.hotspots.forEach((text) => list.append(el(document, "li", text)));
            return list;
          })()])
        ])
      ];
      const main = document.createElement("div");
      main.append(WebImporter.Blocks.createBlock(document, { name: "interactive-showcase", cells }));
      const collageCells = [
        [hinted(document, "text", [el(document, "h2", COLLAGE_TEXT.heading), el(document, "p", COLLAGE_TEXT.text)])],
        ...COLLAGE_IMAGES.map(([image, place]) => [
          hinted(document, "image", [picture(document, image)]),
          hinted(document, "position", [el(document, "p", place)])
        ])
      ];
      main.append(WebImporter.Blocks.createBlock(document, { name: "collage", cells: collageCells }));
      return [{ element: main, path: "/jsw/nev-tech", report: { title: "nev-tech" } }];
    }
  };
  return __toCommonJS(import_nev_tech_exports);
})();
