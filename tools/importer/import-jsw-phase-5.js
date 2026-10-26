/* eslint-disable */
/* global WebImporter */

/**
 * JSW Phase 5 page (/jsw-phase-5), from the "Phase 5 / Open Roles" design frame (no source
 * site: the fetched document is ignored). One block, open-roles: its fields (content | search),
 * then its items: the Job Roles, the Filter Dropdowns and the Gallery Images.
 * The Filter Dropdown and Gallery Image rows start with their item type (open-roles-filter,
 * open-roles-image) so md2jcr (the conversion to AEM content) creates them as those items; rows
 * without one are Job Roles, the block's first item type.
 * The roles are the design's five plus more, so the list scrolls and loads in pages; the
 * gallery images were cut from the design.
 */

const IMG = 'images/jsw';

function hinted(document, field, nodes) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${field} `));
  nodes.forEach((n) => frag.appendChild(typeof n === 'string' ? document.createTextNode(n) : n));
  return frag;
}

function el(document, tag, ...children) {
  const node = document.createElement(tag);
  children.forEach((c) => node.append(typeof c === 'string' ? document.createTextNode(c) : c));
  return node;
}

function group(document, fields) {
  const frag = document.createDocumentFragment();
  fields.forEach(([field, node]) => frag.appendChild(hinted(document, field, [node])));
  return frag;
}

function link(document, href, text) {
  const a = el(document, 'a', text);
  a.href = href;
  return el(document, 'p', a);
}

function list(document, items) {
  const ul = el(document, 'ul');
  items.forEach((item) => ul.append(el(document, 'li', item)));
  return ul;
}

const ROLES = [
  ['Senior Systems Engineer, Hardware Systems', 'Hardware and Embedded Engineering', 'Bangalore, India', '5+ years'],
  ['Battery Validation Engineer, Hybrid', 'Powertrain and Battery Engineering', 'Pune, India', '3-5 years'],
  ['Regional Manager, Dealer Network', 'Sales and Network Operations', 'Mumbai, India', '5+ years'],
  ['Regional Manager, Dealer Network', 'Sales and Network Operations', 'Mumbai, India', '5+ years'],
  ['Regional Manager, Dealer Network', 'Sales and Network Operations', 'Mumbai, India', '5+ years'],
  ['Embedded Software Engineer, Body Electronics', 'Hardware and Embedded Engineering', 'Bangalore, India', '2-4 years'],
  ['Thermal Systems Engineer', 'Powertrain and Battery Engineering', 'Pune, India', '3-5 years'],
  ['Vehicle Dynamics Engineer', 'Vehicle Engineering', 'Chennai, India', '4-6 years'],
  ['Manufacturing Quality Lead', 'Manufacturing and Quality', 'Chennai, India', '6+ years'],
  ['Charging Infrastructure Planner', 'Charging and Energy', 'Delhi, India', '3-5 years'],
  ['UX Designer, In-Car Experience', 'Design and Digital Products', 'Bangalore, India', '3-5 years'],
  ['Supply Chain Analyst', 'Supply Chain and Procurement', 'Pune, India', '1-3 years'],
  ['Service Training Manager', 'After-Sales and Service', 'Mumbai, India', '5+ years'],
  ['Data Engineer, Connected Vehicle', 'Design and Digital Products', 'Bangalore, India', '2-4 years'],
  ['Homologation Engineer', 'Vehicle Engineering', 'Pune, India', '4-6 years'],
  ['Brand Marketing Manager', 'Marketing and Communications', 'Mumbai, India', '6+ years'],
  ['Battery Pack Design Engineer', 'Powertrain and Battery Engineering', 'Bangalore, India', '3-5 years'],
  ['Firmware Development Engineer', 'Embedded Systems', 'San Francisco, USA', '4-6 years'],
  ['Service Advisor, Customer Experience', 'Service and Aftersales', 'Chennai, India', '1-3 years'],
  ['Product Manager, Connected Vehicle', 'Design and Digital Products', 'Gurugram, India', '6+ years'],
  ['Dealer Development Manager', 'Sales and Network Operations', 'Gurugram, India', '5+ years'],
];

const LOCATIONS = ['Bangalore, India', 'Pune, India', 'Mumbai, India', 'Gurugram, India', 'Chennai, India', 'Delhi, India', 'San Francisco, USA'];
const DEPARTMENTS = [...new Set(ROLES.map((r) => r[1]))];

const IMAGES = [
  ['open-roles-1.jpg', 'Team planning at a whiteboard around a meeting table'],
  ['open-roles-2.jpg', 'Colleagues listening in a meeting'],
  ['open-roles-3.jpg', 'Hands holding printed notes'],
];

export default {
  transform: ({ document }) => {
    // each item row starts with its type's id (no field hint): md2jcr reads it to create the
    // right item; the block's code reads and drops it
    const typed = (id, cells) => [document.createTextNode(id), ...cells];
    const cells = [
      [group(document, [
        ['content_heading', el(document, 'p', 'OPEN ROLES AT')],
        ['content_headingHighlight', el(document, 'p', 'JSW MOTORS')],
      ])],
      [group(document, [
        ['search_placeholder', el(document, 'p', 'Search Roles')],
        ['search_help', el(document, 'p', 'Search by role, team, or skill. New roles open up as the team grows, so check back soon for what’s new.')],
        ['search_filtersLabel', el(document, 'p', 'Filter Roles')],
        ['search_emptyMessage', el(document, 'p', 'No roles found matching your criteria.')],
        ['search_clearAll', el(document, 'p', 'Clear all')],
        ['search_backToTop', el(document, 'p', 'Back to top')],
      ])],
      // Job Roles: no type cell (md2jcr drops one only when a row has more cells than its model
      // has fields, which is not so for a Job Role); a row without one is the first type, a Job Role
      ...ROLES.map(([title, department, location, experience]) => [
        hinted(document, 'roleName', [title]),
        group(document, [
          ['meta_department', el(document, 'p', department)],
          ['meta_location', el(document, 'p', location)],
          ['meta_tags', el(document, 'p', experience)],
        ]),
        hinted(document, 'button', [link(document, '/jsw-reserve', 'APPLY NOW')]),
      ]),
      // the Filter Dropdowns: options with commas of their own are separated by semicolons
      ...[
        ['Locations', 'location', LOCATIONS.join('; ')],
        ['Departments', 'department', DEPARTMENTS.join(', ')],
      ].map(([name, field, options]) => typed('open-roles-filter', [
        hinted(document, 'categoryName', [name]),
        hinted(document, 'filterField', [field]),
        hinted(document, 'filterOptions', [options]),
      ])),
      // the Gallery Images
      ...IMAGES.map(([file, alt]) => {
        const img = document.createElement('img');
        img.src = `${IMG}/${file}`;
        img.alt = alt;
        return typed('open-roles-image', [hinted(document, 'image', [el(document, 'p', img)])]);
      }),
    ];

    const main = document.createElement('div');
    main.append(WebImporter.Blocks.createBlock(document, { name: 'open-roles', cells }));
    return [{ element: main, path: '/jsw-phase-5', report: { title: 'jsw-phase-5', roles: ROLES.length } }];
  },
};
