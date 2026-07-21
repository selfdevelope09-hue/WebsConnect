'use strict';

// Merges the original 30 hand-tuned templates with the 370 spec-based
// categories (31-400) into one normalized list used by the page generator,
// the frontend gallery data file and the AI blueprint file.

const BASE = require('./template-gallery-data');

const SPEC_BATCHES = [
  require('./specs/categories-31-100.js'),
  require('./specs/categories-101-200.js'),
  require('./specs/categories-201-300.js'),
  require('./specs/categories-301-400.js'),
];

function flatten(batch) {
  if (Array.isArray(batch)) return batch;
  if (Array.isArray(batch.CATEGORIES)) return batch.CATEGORIES;
  return Array.from(batch);
}

/** Pull "[Tab One] [Tab Two]" style tabs out of page-2 spec text. */
function extractTabs(p2) {
  const tabs = [];
  const re = /\[([^\]]{2,30})\]/g;
  let m;
  while ((m = re.exec(p2)) && tabs.length < 4) tabs.push(m[1].trim());
  return tabs;
}

function normalizeSpec(s) {
  const tabs = extractTabs(s.p2 || '');
  return {
    id: s.id,
    name: s.name,
    emoji: s.emoji,
    niche: s.niche,
    category: s.group,
    title: s.title,
    page2: s.page2.file,
    page2Label: s.page2.label,
    tags: [s.group].concat((s.usps || []).slice(0, 2)),
    desc: s.tagline + '.',
    colors: s.colors,
    keywords: (s.keywords || '') + ' ' + (s.title || '').toLowerCase(),
    spec: s.title + '. Home: ' + s.p1 + ' ' + s.page2.label + ' page: ' + s.p2 + ' Contact: ' + s.p3,
    imgTheme: s.imgTheme,
    usps: s.usps || [],
    tabs,
    p1: s.p1,
    p2: s.p2,
    p3: s.p3,
  };
}

const SPEC_TEMPLATES = SPEC_BATCHES.map(flatten).flat().map(normalizeSpec);

const ALL_TEMPLATES = BASE.map(function (t) {
  return Object.assign({ page2Label: null, imgTheme: null, usps: [], tabs: [], title: t.category }, t);
}).concat(SPEC_TEMPLATES);

module.exports = { ALL_TEMPLATES, SPEC_TEMPLATES, BASE_TEMPLATES: BASE };
