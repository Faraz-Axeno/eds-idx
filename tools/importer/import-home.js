/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import mgHeroParser from './parsers/mg-hero.js';
import mgVehiclesParser from './parsers/mg-vehicles.js';
import mgMasonryGridParser from './parsers/mg-masonry-grid.js';
import mgCardsParser from './parsers/mg-cards.js';
import mgTimelineParser from './parsers/mg-timeline.js';
import mgSectionNavParser from './parsers/mg-section-nav.js';

// TRANSFORMER IMPORTS
import mgselectCleanupTransformer from './transformers/mgselect-cleanup.js';
import mgselectSectionsTransformer from './transformers/mgselect-sections.js';
import mgselectDmImagesTransformer from './transformers/mgselect-dm-images.js';

// PARSER REGISTRY
const parsers = {
  'mg-hero': mgHeroParser,
  'mg-vehicles': mgVehiclesParser,
  'mg-masonry-grid': mgMasonryGridParser,
  'mg-cards': mgCardsParser,
  'mg-timeline': mgTimelineParser,
  'mg-section-nav': mgSectionNavParser,
};

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  "name": "home",
  "description": "MG Select homepage: full-viewport vertical scroll-snap panels (hero, vehicle slider, brand manifesto collage, experience centre slider, heritage timeline) with a fixed section indicator",
  "urls": [
    "https://www.mgselect.co.in/"
  ],
  "blocks": [
    {
      "name": "mg-hero",
      "instances": [
        ".banner.mg-select-scroller.light-header"
      ]
    },
    {
      "name": "mg-vehicles",
      "instances": [
        "section.product-showcase"
      ]
    },
    {
      "name": "mg-masonry-grid",
      "instances": [
        ".brand-manifesto__gallery"
      ]
    },
    {
      "name": "mg-cards",
      "instances": [
        ".carousel.panelcontainer.mg-select-scroller"
      ]
    },
    {
      "name": "mg-timeline",
      "instances": [
        ".timeline-swiper-container"
      ]
    },
    {
      "name": "mg-section-nav",
      "instances": [
        "div.scroller"
      ]
    }
  ],
  "sections": [
    {
      "id": "s1",
      "name": "Hero - MG SELECT x GAURAV GUPTA",
      "selector": [
        ".banner.mg-select-scroller.light-header"
      ],
      "style": null,
      "blocks": [
        "mg-hero"
      ],
      "defaultContent": []
    },
    {
      "id": "s2",
      "name": "Vehicle showcase slider",
      "selector": [
        ".productShowcase.mg-select-scroller"
      ],
      "style": null,
      "blocks": [
        "mg-vehicles"
      ],
      "defaultContent": []
    },
    {
      "id": "s3",
      "name": "Brand manifesto - A New-Era of Luxury",
      "selector": [
        ".brandManifesto.mg-select-scroller"
      ],
      "style": "light",
      "blocks": [
        "mg-masonry-grid"
      ],
      "defaultContent": [
        ".brand-manifesto__greeting",
        ".brand-manifesto__content"
      ]
    },
    {
      "id": "s4",
      "name": "Experience Centre slider",
      "selector": [
        ".carousel.panelcontainer.mg-select-scroller"
      ],
      "style": null,
      "blocks": [
        "mg-cards"
      ],
      "defaultContent": []
    },
    {
      "id": "s5",
      "name": "Our Heritage timeline",
      "selector": [
        ".tabs.panelcontainer.mg-select-scroller"
      ],
      "style": "light",
      "blocks": [
        "mg-timeline"
      ],
      "defaultContent": [
        ".mg-select-tabs__container",
        ".timeline-container__container > div:first-child"
      ]
    },
    {
      "id": "s6",
      "name": "Section navigation indicator",
      "selector": [
        "div.scroller"
      ],
      "style": null,
      "blocks": [
        "mg-section-nav"
      ],
      "defaultContent": []
    }
  ]
};

// TRANSFORMER REGISTRY
// Cleanup first, then sections (2+ sections), then DM/Scene7 image carrier anchors (afterTransform only)
const transformers = [
  mgselectCleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [mgselectSectionsTransformer] : []),
  mgselectDmImagesTransformer,
];

/**
 * Execute all page transformers for a specific hook
 * @param {string} hookName - The hook name ('beforeTransform' or 'afterTransform')
 * @param {Element} element - The DOM element to transform
 * @param {Object} payload - The payload containing { document, url, html, params }
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE,
  };

  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 * @param {Document} document - The DOM document
 * @param {Object} template - The embedded PAGE_TEMPLATE object
 * @returns {Array} Array of block instances found on the page
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];

  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });

  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, html, params } = payload;

    const main = document.body;

    // 1. beforeTransform transformers (initial cleanup + section break markers)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page using embedded template
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block using registered parsers
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return; // Already replaced by earlier parser
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. afterTransform transformers (final cleanup, section metadata, DM images)
    executeTransformers('afterTransform', main, payload);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Sanitized path (root URL maps to /index)
    const rawPath = new URL(params.originalURL).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
