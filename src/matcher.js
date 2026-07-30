'use strict';

const { formatFailures } = require('@surea11y/binding-base');
const { scanElement } = require('./scan-element');

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
// Only `fail` outcomes gate the assertion -- `cantTell` is advisory
// everywhere else in surea11y (the CLI's exit code, docs/TROUBLESHOOTING.md),
// and this matcher keeps that contract rather than inventing a stricter one.
function toHaveNoA11yViolations(received, engineOptions) {
  let result;
  if (received && Array.isArray(received.checksResults)) {
    result = received;
  } else if (received && typeof received.nodeType === 'number') {
    result = scanElement(received, engineOptions || {});
  } else {
    throw new TypeError('toHaveNoA11yViolations() expects a DOM element/document or a surea11y scan result.');
  }

  const fails = result.checksResults.filter((r) => r.outcome === 'fail');
  const cantTells = result.checksResults.filter((r) => r.outcome === 'cantTell');
  const pass = fails.length === 0;

  const message = () => {
    if (pass) {
      return 'expected the element to have accessibility violations, but none were found';
    }
    const details = formatFailures(result.checksResults, { outcomes: ['fail'] });
    const note = cantTells.length
      ? `\n\n${cantTells.length} rule(s) need manual review (cantTell, not counted as failures): ${cantTells.map((r) => r.ruleId).join(', ')}`
      : '';
    return `expected no accessibility violations, but found ${fails.length}:\n\n${details}${note}`;
  };

  return { pass, message };
}

module.exports = { toHaveNoA11yViolations };
