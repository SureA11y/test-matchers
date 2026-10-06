'use strict';

const { formatFailures, getScanGaps } = require('@surea11y/binding-base');
const { scanElement } = require('./scan-element');

// Scan gaps (binding-base's getScanGaps()) that fail the assertion: a scope
// that matched nothing means nothing was checked, and a custom rule that did
// not run cannot have passed. Either would otherwise read as a clean scan.
// The CLI exits 2 on a scope that matches nothing. `context-partly-not-found`
// (some of several selectors matched nothing) is only reported: the rest
// was scanned.
const FAILING_GAPS = ['context-not-found', 'custom-rule-skipped'];

const DETACHED_NOTE =
  'The element given to toHaveNoA11yViolations() is not in the document the scan runs in ' +
  '(it is detached, or belongs to another document), so nothing in it was checked. ' +
  'Attach it to the document before asserting.';

// Jest custom matcher: expect(received).toHaveNoA11yViolations(engineOptions?)
//
// `received` is either:
//   - a DOM Element/Document (the common case -- e.g. React Testing
//     Library's `container`, or `document` itself): scanned via
//     scanElement().
//   - an already-computed surea11y scan result (`{ checksResults: [...] }`):
//     asserted on directly, no scan performed -- lets a caller reuse one
//     scan across multiple assertions.
//
// `fail` outcomes gate the assertion, and so do the scan gaps above.
// `cantTell` is advisory everywhere else in surea11y (the CLI's exit code,
// docs/TROUBLESHOOTING.md), and this matcher keeps that contract rather
// than inventing a stricter one.
function toHaveNoA11yViolations(received, engineOptions) {
  let result;
  let scannedElement = false;
  if (received && Array.isArray(received.checksResults)) {
    result = received;
  } else if (received && typeof received.nodeType === 'number') {
    result = scanElement(received, engineOptions || {});
    scannedElement = received.nodeType !== 9; /* Node.DOCUMENT_NODE */
  } else {
    throw new TypeError('toHaveNoA11yViolations() expects a DOM element/document or a surea11y scan result.');
  }

  const fails = result.checksResults.filter((r) => r.outcome === 'fail');
  const cantTells = result.checksResults.filter((r) => r.outcome === 'cantTell');
  const failingGaps = getScanGaps(result).filter((g) => FAILING_GAPS.includes(g.kind));
  const pass = fails.length === 0 && failingGaps.length === 0;

  const message = () => {
    if (pass) {
      return 'expected the element to have accessibility violations, but none were found';
    }
    const header = fails.length
      ? `expected no accessibility violations, but found ${fails.length}:`
      : 'expected no accessibility violations, but the scan left out what it was asked to check:';
    const scopeNotFound = scannedElement && failingGaps.some((g) => g.kind === 'context-not-found');
    const details = formatFailures(result, { outcomes: ['fail'] });
    const note = cantTells.length
      ? `\n\n${cantTells.length} rule(s) need manual review (cantTell, not counted as failures): ${cantTells.map((r) => r.ruleId).join(', ')}`
      : '';
    return `${header}\n\n${scopeNotFound ? `${DETACHED_NOTE}\n\n` : ''}${details}${note}`;
  };

  return { pass, message };
}

module.exports = { toHaveNoA11yViolations };
