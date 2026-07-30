'use strict';

const { randomUUID } = require('crypto');

const SCOPE_ATTR = 'data-surea11y-jest-scope';

// Scans `node` (a Document, or an arbitrary Element within one) for
// accessibility violations. There is no way to scope @surea11y/core's scan
// to a live element reference directly -- its public contextSelector param
// only ever accepts a CSS selector string, resolved via
// document.querySelector/querySelectorAll. So an arbitrary Element (e.g.
// React Testing Library's `container`) is tagged with a temporary, uniquely
// generated attribute, scanned by that attribute selector, then untagged --
// regardless of whether the scan throws.
function scanElement(node, engineOptions = {}) {
  const { runDomRulesInPage } = require('@surea11y/core');

  if (node.nodeType === 9 /* Node.DOCUMENT_NODE */) {
    const href = node.location ? node.location.href : null;
    return runDomRulesInPage(href, null, engineOptions, null);
  }

  const id = randomUUID();
  node.setAttribute(SCOPE_ATTR, id);
  try {
    const doc = node.ownerDocument;
    const href = doc && doc.location ? doc.location.href : null;
    return runDomRulesInPage(href, `[${SCOPE_ATTR}="${id}"]`, engineOptions, null);
  } finally {
    node.removeAttribute(SCOPE_ATTR);
  }
}

module.exports = { scanElement, SCOPE_ATTR };
