'use strict';

const bindingBase = require('@surea11y/binding-base');
const { formatFailures, getScanGaps, getScanNotes } = bindingBase;
const { scanElement, SCOPE_ATTR } = require('./scan-element');

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

// What decides which findings fail an assertion and how they are listed:
// the options configureA11yMatchers() sets for every assertion, and an
// assertion's own options override, one by one.
const GATE_KEYS = ['failOnSeverity', 'leanFail', 'wcagOnly', 'howToCheck'];

// The keys of the options form, toHaveNoA11yViolations({ engineOptions,
// runOnly, ...gate options }). None of them is an engine option, so an
// object with any of them is read as this form.
const OPTION_KEYS = ['engineOptions', 'runOnly'].concat(GATE_KEYS);

const SEVERITIES = ['minor', 'moderate', 'serious', 'critical'];

// Set by configureA11yMatchers(); an assertion's own options override each.
const NO_DEFAULTS = { failOnSeverity: null, leanFail: false, wcagOnly: false, howToCheck: false };
let defaults = { ...NO_DEFAULTS };

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readLevel(value, where) {
  if (value === undefined || value === null) return null;
  const level = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!SEVERITIES.includes(level)) {
    throw new TypeError(`${where}: failOnSeverity must be "critical", "serious", "moderate" or "minor", not ${JSON.stringify(value)}.`);
  }
  return level;
}

// The gate options an object gives, checked, and only those it gives:
// { failOnSeverity?, leanFail?, wcagOnly?, howToCheck? }.
function readGate(options, where) {
  const gate = {};
  if ('failOnSeverity' in options) gate.failOnSeverity = readLevel(options.failOnSeverity, where);
  for (const name of ['leanFail', 'wcagOnly', 'howToCheck']) {
    if (options[name] === undefined) continue;
    if (typeof options[name] !== 'boolean') throw new TypeError(`${where}: ${name} must be true or false.`);
    gate[name] = options[name];
  }
  return gate;
}

function rejectUnknown(options, keys, where, hint) {
  const unknown = Object.keys(options).filter((k) => !keys.includes(k));
  if (unknown.length) {
    throw new TypeError(`${where}: no option named ${unknown.map((k) => `"${k}"`).join(', ')}; ${hint}`);
  }
}

// The defaults with an assertion's own gate options laid over them, and
// wcagOnly checked against the leanFail it narrows.
function settle(own, where) {
  const gate = { ...defaults, ...own };
  if (gate.wcagOnly && !gate.leanFail) {
    throw new TypeError(`${where}: wcagOnly narrows leanFail; pass leanFail: true with it.`);
  }
  return gate;
}

// The matcher's arguments after `received`, as { engineOptions, runOnly,
// failOnSeverity, leanFail, wcagOnly, howToCheck }: either (engineOptions,
// runOnly, options?) as before, or one options object.
function readArguments(first, rest) {
  if (!isPlainObject(first) || !OPTION_KEYS.some((k) => k in first)) {
    const options = rest[1];
    let own = {};
    if (options !== undefined && options !== null) {
      if (!isPlainObject(options)) {
        throw new TypeError("toHaveNoA11yViolations(engineOptions, runOnly, options): options must be an object, such as { failOnSeverity: 'serious' }.");
      }
      rejectUnknown(options, GATE_KEYS, 'toHaveNoA11yViolations(engineOptions, runOnly, options)', `options takes ${GATE_KEYS.join(', ')}.`);
      own = readGate(options, 'toHaveNoA11yViolations(engineOptions, runOnly, options)');
    }
    return { engineOptions: first, runOnly: rest[0], ...settle(own, 'toHaveNoA11yViolations(engineOptions, runOnly, options)') };
  }
  rejectUnknown(first, OPTION_KEYS, 'toHaveNoA11yViolations(options)',
    `the options form takes ${OPTION_KEYS.join(', ')}. Put engine options under engineOptions.`);
  if (rest.some((arg) => arg !== undefined)) {
    throw new TypeError('toHaveNoA11yViolations(options): give runOnly inside the options object, not as a second argument, and the other options there too.');
  }
  const own = readGate(first, 'toHaveNoA11yViolations(options)');
  return { engineOptions: first.engineOptions, runOnly: first.runOnly, ...settle(own, 'toHaveNoA11yViolations(options)') };
}

// Sets what every toHaveNoA11yViolations() assertion uses unless it says
// otherwise, from a setup file: { failOnSeverity, leanFail, wcagOnly,
// howToCheck }, the gate options an assertion takes. An assertion's own
// options override each one it gives (failOnSeverity: null or leanFail:
// false turns that default off there). Called again, it replaces every
// default; with null, it clears them.
function configureA11yMatchers(options) {
  if (options === undefined || options === null) {
    defaults = { ...NO_DEFAULTS };
    return;
  }
  if (!isPlainObject(options)) {
    throw new TypeError("configureA11yMatchers(): options must be an object, such as { failOnSeverity: 'serious' }, or null.");
  }
  rejectUnknown(options, GATE_KEYS, 'configureA11yMatchers()', `it takes ${GATE_KEYS.join(', ')}.`);
  const gate = { ...NO_DEFAULTS, ...readGate(options, 'configureA11yMatchers()') };
  if (gate.wcagOnly && !gate.leanFail) {
    throw new TypeError('configureA11yMatchers(): wcagOnly narrows leanFail; pass leanFail: true with it.');
  }
  defaults = gate;
}

// Whether a finding of a rule of `severity` fails the assertion at `level`
// (null: every one does), as binding-base's getGatingFailures() and
// `surea11y scan --fail-on-severity` count it.
function gates(severity, level) {
  if (!level) return true;
  return SEVERITIES.indexOf(String(severity || '').toLowerCase()) >= SEVERITIES.indexOf(level);
}

// A finding about the scanned element as a whole (manual-review) is located
// by the temporary attribute scanElement() scoped the scan with, which
// means nothing to a reader once it's gone: such a finding has no location.
const SCOPE_SELECTOR = new RegExp(`^\\[${SCOPE_ATTR}="[^"]*"\\]$`);

function located(occurrence) {
  if (!occurrence || typeof occurrence.selector !== 'string' || !SCOPE_SELECTOR.test(occurrence.selector)) return occurrence;
  const { selector, ...rest } = occurrence;
  return rest;
}

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

// Splits the result's findings by each occurrence's own tier (core's
// occurrenceOutcome), since a rule's findings can sit in different tiers: a
// failing rule's questions are questions. `counted` holds what fails the
// assertion: every failure, and with leanFail the questions core's
// leaningFailures() returns, those of a rule below `level` (failOnSeverity)
// left out. A failure below it is listed there too, marked by
// formatFailures(), but not counted; a likely failure below it stays a
// question. `questions` holds the other questions. Each is a list of checks
// with only those occurrences, for formatFailures().
function splitFindings(result, leaning, level) {
  const { occurrenceOutcome } = require('@surea11y/core');
  const counted = [];
  const questions = [];
  let failures = 0;
  let likelyFailures = 0;
  for (const check of result.checksResults) {
    if (!check || typeof check !== 'object') continue;
    const counts = gates(check.severity, level);
    const occurrences = Array.isArray(check.occurrences) ? check.occurrences : [];
    if (!occurrences.length) {
      // A failing rule with nothing to point to still failed; a rule that
      // threw is a question with its error (OUTPUT_SCHEMA.md).
      if (check.outcome === 'fail') {
        counted.push(check);
        if (counts) failures += 1;
      } else if (check.outcome === 'cantTell') {
        questions.push(check);
      }
      continue;
    }
    const failing = [];
    const asked = [];
    for (const occurrence of occurrences) {
      const tier = occurrenceOutcome(check, occurrence);
      if (tier === 'fail') {
        failing.push(occurrence);
        if (counts) failures += 1;
      } else if (tier === 'cantTell' && counts && leaning.has(occurrence)) {
        failing.push(occurrence);
        likelyFailures += 1;
      } else if (tier === 'cantTell') {
        asked.push(occurrence);
      }
    }
    if (failing.length) counted.push({ ...check, occurrences: failing.map(located) });
    if (asked.length) questions.push({ ...check, occurrences: asked.map(located) });
  }
  return { counted, questions, failures, likelyFailures };
}

// What formatFailures(result) says, for the findings that fail the
// assertion only: those findings, what the scan left out, its notes (read
// from the whole result) and the core release.
function describeResult(result, counted, howToCheck, level) {
  const gaps = getScanGaps(result);
  const blocks = [];
  if (counted.length) {
    const gate = level ? { failOnSeverity: level } : {};
    blocks.push(formatFailures(counted, { outcomes: ['fail', 'cantTell'], howToCheck, ...gate }));
  }
  else if (!gaps.length) blocks.push('No accessibility violations found.');
  else if (!gaps.some((g) => g.kind === 'context-not-found')) blocks.push('No accessibility violations found in what was scanned.');
  if (gaps.length) blocks.push(gaps.map((g) => g.message).join('\n'));
  const notes = getScanNotes(result);
  if (notes.length) blocks.push(notes.map((n) => n.message).join('\n'));
  const version = result.engine && typeof result.engine.version === 'string' ? result.engine.version : null;
  if (version) blocks.push(`Scanned with @surea11y/core ${version}.`);
  return blocks.join('\n\n');
}

// The questions part of a failure message: those that lean, in full, with
// their leans, likely failures first; then the open ones, which only a
// person can answer, by rule, since a jsdom scan can ask about every piece
// of text (contrast). With howToCheck, every question in full, with steps.
function describeQuestions(questions, howToCheck) {
  const { reviewGroupOf } = require('@surea11y/core');
  let total = 0;
  let leaning = 0;
  const open = new Map();
  for (const check of questions) {
    const occurrences = check.occurrences.length ? check.occurrences : [null];
    for (const occurrence of occurrences) {
      total += 1;
      const group = occurrence ? reviewGroupOf(check, occurrence) : 'open';
      if (group === 'leanFail' || group === 'leanPass') leaning += 1;
      else open.set(check.ruleId, (open.get(check.ruleId) || 0) + 1);
    }
  }
  const blocks = [];
  if (howToCheck) {
    blocks.push(formatFailures(questions, { outcomes: ['cantTell'], howToCheck }));
  } else {
    if (leaning) blocks.push(formatFailures(questions, { outcomes: ['leanFail', 'leanPass'] }));
    if (open.size) {
      const rules = [...open].map(([ruleId, n]) => (n > 1 ? `${ruleId} (${n})` : ruleId)).join(', ');
      blocks.push(`${leaning ? 'Open questions' : 'Questions'}, which only a person can answer: ${rules}.`);
    }
  }
  return `${plural(total, 'finding needs', 'findings need')} manual review (cantTell, not counted as failures):\n\n${blocks.join('\n\n')}`;
}

// Jest custom matcher:
//   expect(received).toHaveNoA11yViolations(engineOptions?, runOnly?, options?)
//   expect(received).toHaveNoA11yViolations({ engineOptions?, runOnly?, failOnSeverity?, leanFail?, wcagOnly?, howToCheck? })
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
// Failures gate the assertion, counted by each occurrence's own tier, and
// so do the scan gaps above. `cantTell` is advisory everywhere else in
// surea11y (the CLI's exit code, docs/TROUBLESHOOTING.md), and this matcher
// keeps that contract by default. `leanFail: true` also fails on the
// questions that lean fail, as core's reporters do with `leanFailAs`
// (core's leaningFailures(), with `wcagOnly` as `leanFailWcagOnly`).
// `failOnSeverity` makes only findings of rules of that severity or above
// fail it, as `surea11y scan --fail-on-severity` does; the message still
// lists every failure, marking those below the level. Each of these can be
// set for every assertion with configureA11yMatchers().
function toHaveNoA11yViolations(received, ...args) {
  const { engineOptions, runOnly, failOnSeverity: level, leanFail, wcagOnly, howToCheck } = readArguments(args[0], args.slice(1));
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

  const leaning = new Set();
  if (leanFail) {
    const { leaningFailures } = require('@surea11y/core');
    for (const entry of leaningFailures(result, { wcagOnly })) leaning.add(entry.occurrence);
  }
  const { counted, questions, failures, likelyFailures } = splitFindings(result, leaning, level);
  const failingGaps = getScanGaps(result).filter((g) => FAILING_GAPS.includes(g.kind));
  const pass = failures === 0 && likelyFailures === 0 && failingGaps.length === 0;

  const message = () => {
    const atLevel = level ? ` of severity ${level} or above` : '';
    if (pass) {
      return leanFail
        ? `expected the element to have accessibility violations or likely failures${atLevel}, but none were found`
        : `expected the element to have accessibility violations${atLevel}, but none were found`;
    }
    let header;
    if (likelyFailures) {
      const found = failures
        ? `${plural(failures, 'failure', 'failures')} and ${plural(likelyFailures, 'likely failure', 'likely failures')}`
        : plural(likelyFailures, 'likely failure', 'likely failures');
      header = `expected no accessibility violations or likely failures${atLevel}, but found ${found}:`;
    } else if (failures) {
      header = `expected no accessibility violations${atLevel}, but found ${failures}:`;
    } else {
      header = 'expected no accessibility violations, but the scan left out what it was asked to check:';
    }
    const scopeNotFound = scannedElement && failingGaps.some((g) => g.kind === 'context-not-found');
    const details = describeResult(result, counted, howToCheck, level);
    const note = questions.length ? `\n\n${describeQuestions(questions, howToCheck)}` : '';
    return `${header}\n\n${scopeNotFound ? `${DETACHED_NOTE}\n\n` : ''}${details}${note}`;
  };

  return { pass, message };
}

module.exports = { toHaveNoA11yViolations, configureA11yMatchers };
