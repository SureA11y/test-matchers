'use strict';

const bindingBase = require('@surea11y/binding-base');
const { formatFailures, getScanGaps } = bindingBase;
const { scanElement } = require('./scan-element');

// Scan gaps (binding-base's getScanGaps()) that fail the assertion: a scope
// that matched nothing means nothing was checked, and a custom rule or a
// pack that did not run cannot have passed. Each would otherwise read as a
// clean scan. The CLI exits 2 on a scope that matches nothing.
// `context-partly-not-found` (some of several selectors matched nothing) is
// only reported: the rest was scanned.
const FAILING_GAPS = ['context-not-found', 'custom-rule-skipped', 'pack-skipped'];

const DETACHED_NOTE =
  'The element given to toHaveNoA11yViolations() is not in the document the scan runs in ' +
  '(it is detached, or belongs to another document), so nothing in it was checked. ' +
  'Attach it to the document before asserting.';

const SEVERITIES = ['minor', 'moderate', 'serious', 'critical'];

// The level every assertion gates on unless it says otherwise:
// configureA11yMatchers({ failOnSeverity }) in a setup file.
const defaults = { failOnSeverity: null };

function readLevel(value, where) {
  if (value === undefined || value === null) return null;
  const level = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!SEVERITIES.includes(level)) {
    throw new TypeError(`${where} must be "critical", "serious", "moderate" or "minor", not ${JSON.stringify(value)}.`);
  }
  return level;
}

function readOptions(options, where) {
  if (options === undefined || options === null) return {};
  if (typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError(`${where}: options must be an object, such as { failOnSeverity: 'serious' }.`);
  }
  const unknown = Object.keys(options).filter((k) => k !== 'failOnSeverity');
  if (unknown.length) {
    throw new TypeError(`${where}: no option named ${unknown.map((k) => `"${k}"`).join(', ')}; use failOnSeverity.`);
  }
  return options;
}

// Sets what every toHaveNoA11yViolations() assertion uses by default, from a
// setup file: { failOnSeverity } makes only failing rules of that severity or
// above fail the assertion, as `surea11y scan --fail-on-severity` does. An
// assertion's own third argument overrides it, and failOnSeverity: null
// there turns the gate off for that one. Called again, it replaces the
// default; with null, it clears it.
function configureA11yMatchers(options) {
  const { failOnSeverity } = readOptions(options, 'configureA11yMatchers()');
  const level = readLevel(failOnSeverity, 'configureA11yMatchers(): failOnSeverity');
  if (level && typeof bindingBase.getGatingFailures !== 'function') {
    throw new Error('configureA11yMatchers(): failOnSeverity needs @surea11y/binding-base 1.6.0 or later.');
  }
  defaults.failOnSeverity = level;
}

// Jest custom matcher: expect(received).toHaveNoA11yViolations(engineOptions?, runOnly?, options?)
//
// `received` is either:
//   - a DOM Element/Document (the common case -- e.g. React Testing
//     Library's `container`, or `document` itself): scanned via
//     scanElement().
//   - an already-computed surea11y scan result (`{ checksResults: [...] }`):
//     asserted on directly, no scan performed -- lets a caller reuse one
//     scan across multiple assertions.
//
// engineOptions and runOnly are core's third and fourth scan arguments,
// passed as given.
//
// `fail` outcomes gate the assertion, and so do the scan gaps above.
// `cantTell` is advisory everywhere else in surea11y (the CLI's exit code,
// docs/TROUBLESHOOTING.md), and this matcher keeps that contract rather
// than inventing a stricter one.
// `options.failOnSeverity` (or the configured default) makes only failing
// rules of that severity or above fail the assertion; the message still
// lists every failure, marking those below the level. `fail` keeps its
// meaning, a definite violation: the level only picks which ones gate.
function toHaveNoA11yViolations(received, engineOptions, runOnly, options) {
  const own = readOptions(options, 'toHaveNoA11yViolations()');
  const level =
    'failOnSeverity' in own
      ? readLevel(own.failOnSeverity, 'toHaveNoA11yViolations(): failOnSeverity')
      : defaults.failOnSeverity;
  if (level && typeof bindingBase.getGatingFailures !== 'function') {
    throw new Error('toHaveNoA11yViolations(): failOnSeverity needs @surea11y/binding-base 1.6.0 or later.');
  }
  let result;
  let scannedElement = false;
  if (received && Array.isArray(received.checksResults)) {
    result = received;
  } else if (received && typeof received.nodeType === 'number') {
    result = scanElement(received, engineOptions || {}, runOnly === undefined ? null : runOnly);
    scannedElement = received.nodeType !== 9; /* Node.DOCUMENT_NODE */
  } else {
    throw new TypeError('toHaveNoA11yViolations() expects a DOM element/document or a surea11y scan result.');
  }

  const allFails = result.checksResults.filter((r) => r.outcome === 'fail');
  const fails = level ? bindingBase.getGatingFailures(result, { failOnSeverity: level }) : allFails;
  const cantTells = result.checksResults.filter((r) => r.outcome === 'cantTell');
  const failingGaps = getScanGaps(result).filter((g) => FAILING_GAPS.includes(g.kind));
  const pass = fails.length === 0 && failingGaps.length === 0;

  const message = () => {
    if (pass) {
      return level
        ? `expected the element to have accessibility violations of severity ${level} or above, but none were found`
        : 'expected the element to have accessibility violations, but none were found';
    }
    const header = fails.length
      ? level
        ? `expected no accessibility violations of severity ${level} or above, but found ${fails.length}:`
        : `expected no accessibility violations, but found ${fails.length}:`
      : 'expected no accessibility violations, but the scan left out what it was asked to check:';
    const scopeNotFound = scannedElement && failingGaps.some((g) => g.kind === 'context-not-found');
    const details = formatFailures(result, level ? { outcomes: ['fail'], failOnSeverity: level } : { outcomes: ['fail'] });
    const note = cantTells.length
      ? `\n\n${cantTells.length} rule(s) need manual review (cantTell, not counted as failures): ${cantTells.map((r) => r.ruleId).join(', ')}`
      : '';
    return `${header}\n\n${scopeNotFound ? `${DETACHED_NOTE}\n\n` : ''}${details}${note}`;
  };

  return { pass, message };
}

module.exports = { toHaveNoA11yViolations, configureA11yMatchers };
