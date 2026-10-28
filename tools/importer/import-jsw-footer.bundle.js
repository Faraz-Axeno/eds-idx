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

  // tools/importer/import-jsw-footer.js
  var import_jsw_footer_exports = {};
  __export(import_jsw_footer_exports, {
    default: () => import_jsw_footer_default
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
  function group(document, fields) {
    const frag = document.createDocumentFragment();
    fields.forEach(([field, node]) => frag.appendChild(hinted(document, field, [node])));
    return frag;
  }
  function link(document, href, text) {
    const a = el(document, "a", text);
    a.href = href;
    return el(document, "p", a);
  }
  function image(document, src, alt) {
    const img = document.createElement("img");
    img.src = `${IMG}/${src}`;
    img.alt = alt;
    return el(document, "p", img);
  }
  var COLUMNS = [
    ["TECHNOLOGY", [
      ["NEVs", "/jsw-phase-3#nev-tech"],
      ["Pillars", "/jsw-phase-3#pillars"],
      ["Benefits", "/jsw-phase-3#benefits"]
    ]],
    ["EXPLORE", [
      ["About", "/jsw-phase-3"],
      ["Newsroom", "/jsw-phase-3#newsroom"],
      ["Careers", "/jsw-phase-5"],
      ["Contact Us", "/jsw-phase-3#register-interest"]
    ]]
  ];
  var SOCIALS = [
    ["social-facebook.svg", "Facebook", "https://www.facebook.com/"],
    ["social-instagram.svg", "Instagram", "https://www.instagram.com/"],
    ["social-x.svg", "X", "https://x.com/"],
    ["social-linkedin.svg", "LinkedIn", "https://www.linkedin.com/"]
  ];
  var import_jsw_footer_default = {
    transform: ({ document }) => {
      const cells = [
        // media: the layout and background, then the starting content (fields hidden in the
        // editor's panel): the design's columns and icons, shown until the lists hold items
        [group(document, [
          ["media_footerVariant", el(document, "p", "variant-phase-5")],
          ["media_backgroundMode", el(document, "p", "image")],
          ["media_backgroundImage", image(document, "jsw-footer-bg.jpg", "")],
          ...COLUMNS.flatMap(([heading, links], c) => [
            [`media_startColumn${c + 1}Heading`, el(document, "p", heading)],
            ...links.map(([text, href], i) => [`media_startColumn${c + 1}Link${i + 1}`, link(document, href, text)])
          ]),
          ...SOCIALS.flatMap(([file, name, href], i) => [
            [`media_startSocial${i + 1}Icon`, image(document, file, name)],
            [`media_startSocial${i + 1}Link`, link(document, href, href)]
          ])
        ])],
        // brand: the logo, copyright, button, privacy policy and social heading
        [group(document, [
          ["brand_logo", image(document, "jsw-motors-wordmark.svg", "JSW Motors")],
          ["brand_copyright", el(document, "p", "\xA9 2026 JSW Motors  Mumbai, India")],
          ["brand_ctaButton", link(document, "/jsw-phase-3#register-interest", "REGISTER INTEREST")],
          ["brand_privacyPolicy", link(document, "#privacy-policy", "PRIVACY POLICY")],
          ["brand_socialHeading", el(document, "p", "CONNECT")]
        ])],
        // the footer columns and social icons: multi-fields, added in Universal Editor (md2jcr
        // does not carry them)
        [hinted(document, "footerColumns", [])],
        [hinted(document, "socialIcons", [])]
      ];
      const main = document.createElement("div");
      main.append(WebImporter.Blocks.createBlock(document, { name: "jsw-footer", cells }));
      return [{ element: main, path: "/jsw-footer", report: { title: "jsw-footer" } }];
    }
  };
  return __toCommonJS(import_jsw_footer_exports);
})();
