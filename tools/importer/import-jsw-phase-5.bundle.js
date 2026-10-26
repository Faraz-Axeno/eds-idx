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

  // tools/importer/import-jsw-phase-5.js
  var import_jsw_phase_5_exports = {};
  __export(import_jsw_phase_5_exports, {
    default: () => import_jsw_phase_5_default
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
  var ROLES = [
    ["Senior Systems Engineer, Hardware Systems", "Hardware and Embedded Engineering", "Bangalore, India", "5+ years"],
    ["Battery Validation Engineer, Hybrid", "Powertrain and Battery Engineering", "Pune, India", "3-5 years"],
    ["Regional Manager, Dealer Network", "Sales and Network Operations", "Mumbai, India", "5+ years"],
    ["Regional Manager, Dealer Network", "Sales and Network Operations", "Mumbai, India", "5+ years"],
    ["Regional Manager, Dealer Network", "Sales and Network Operations", "Mumbai, India", "5+ years"],
    ["Embedded Software Engineer, Body Electronics", "Hardware and Embedded Engineering", "Bangalore, India", "2-4 years"],
    ["Thermal Systems Engineer", "Powertrain and Battery Engineering", "Pune, India", "3-5 years"],
    ["Vehicle Dynamics Engineer", "Vehicle Engineering", "Chennai, India", "4-6 years"],
    ["Manufacturing Quality Lead", "Manufacturing and Quality", "Chennai, India", "6+ years"],
    ["Charging Infrastructure Planner", "Charging and Energy", "Delhi, India", "3-5 years"],
    ["UX Designer, In-Car Experience", "Design and Digital Products", "Bangalore, India", "3-5 years"],
    ["Supply Chain Analyst", "Supply Chain and Procurement", "Pune, India", "1-3 years"],
    ["Service Training Manager", "After-Sales and Service", "Mumbai, India", "5+ years"],
    ["Data Engineer, Connected Vehicle", "Design and Digital Products", "Bangalore, India", "2-4 years"],
    ["Homologation Engineer", "Vehicle Engineering", "Pune, India", "4-6 years"],
    ["Brand Marketing Manager", "Marketing and Communications", "Mumbai, India", "6+ years"],
    ["Battery Pack Design Engineer", "Powertrain and Battery Engineering", "Bangalore, India", "3-5 years"],
    ["Firmware Development Engineer", "Embedded Systems", "San Francisco, USA", "4-6 years"],
    ["Service Advisor, Customer Experience", "Service and Aftersales", "Chennai, India", "1-3 years"],
    ["Product Manager, Connected Vehicle", "Design and Digital Products", "Gurugram, India", "6+ years"],
    ["Dealer Development Manager", "Sales and Network Operations", "Gurugram, India", "5+ years"]
  ];
  var LOCATIONS = ["Bangalore, India", "Pune, India", "Mumbai, India", "Gurugram, India", "Chennai, India", "Delhi, India", "San Francisco, USA"];
  var DEPARTMENTS = [...new Set(ROLES.map((r) => r[1]))];
  var IMAGES = [
    ["open-roles-1.jpg", "Team planning at a whiteboard around a meeting table"],
    ["open-roles-2.jpg", "Colleagues listening in a meeting"],
    ["open-roles-3.jpg", "Hands holding printed notes"]
  ];
  var import_jsw_phase_5_default = {
    transform: ({ document }) => {
      const typed = (id, cells2) => [document.createTextNode(id), ...cells2];
      const cells = [
        [group(document, [
          ["content_heading", el(document, "p", "OPEN ROLES AT")],
          ["content_headingHighlight", el(document, "p", "JSW MOTORS")]
        ])],
        [group(document, [
          ["search_placeholder", el(document, "p", "Search Roles")],
          ["search_help", el(document, "p", "Search by role, team, or skill. New roles open up as the team grows, so check back soon for what\u2019s new.")],
          ["search_filtersLabel", el(document, "p", "Filter Roles")],
          ["search_emptyMessage", el(document, "p", "No roles found matching your criteria.")],
          ["search_clearAll", el(document, "p", "Clear all")],
          ["search_backToTop", el(document, "p", "Back to top")]
        ])],
        // Job Roles: no type cell (md2jcr drops one only when a row has more cells than its model
        // has fields, which is not so for a Job Role); a row without one is the first type, a Job Role
        ...ROLES.map(([title, department, location, experience]) => [
          hinted(document, "roleName", [title]),
          group(document, [
            ["meta_department", el(document, "p", department)],
            ["meta_location", el(document, "p", location)],
            ["meta_tags", el(document, "p", experience)]
          ]),
          hinted(document, "button", [link(document, "/jsw-reserve", "APPLY NOW")])
        ]),
        // the Filter Dropdowns: their options a multi-value field, written in AEM's multi-value
        // notation ([a,b], a comma within an entry as \,), which md2jcr keeps as separate entries
        // (a list it would join into one text)
        ...[
          ["Locations", "location", LOCATIONS],
          ["Departments", "department", DEPARTMENTS]
        ].map(([name, field, options]) => typed("open-roles-filter", [
          hinted(document, "categoryName", [name]),
          hinted(document, "filterField", [field]),
          hinted(document, "filterOptions", [el(document, "p", `[${options.map((o) => o.replace(/,/g, "\\,")).join(",")}]`)])
        ])),
        // the Gallery Images
        ...IMAGES.map(([file, alt]) => {
          const img = document.createElement("img");
          img.src = `${IMG}/${file}`;
          img.alt = alt;
          return typed("open-roles-image", [hinted(document, "image", [el(document, "p", img)])]);
        })
      ];
      const main = document.createElement("div");
      main.append(WebImporter.Blocks.createBlock(document, { name: "open-roles", cells }));
      return [{ element: main, path: "/jsw-phase-5", report: { title: "jsw-phase-5", roles: ROLES.length } }];
    }
  };
  return __toCommonJS(import_jsw_phase_5_exports);
})();
