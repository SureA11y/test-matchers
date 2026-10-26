'use strict';

const { formatFailures, getScanGaps, getScanNotes } = require('@surea11y/binding-base');
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

// The keys of the options form, toHaveNoA11yViolations({ engineOptions,
// runOnly, leanFail, wcagOnly, howToCheck }). None of them is an engine
// option, so an object with any of them is read as this form.
const OPTION_KEYS = ['engineOptions', 'runOnly', 'leanFail', 'wcagOnly', 'howToCheck'];

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

// The matcher's arguments after `received`, as { engineOptions, runOnly,
// leanFail, wcagOnly, howToCheck }: either (engineOptions, runOnly) as
// before, or one options object.
function readArguments(first, rest) {
  if (!isPlainObject(first) || !OPTION_KEYS.some((k) => k in first)) {
    return { engineOptions: first, runOnly: rest[0], leanFail: false, wcagOnly: false, howToCheck: false };
  }
  const unknown = Object.keys(first).filter((k) => !OPTION_KEYS.includes(k));
  if (unknown.length) {
    throw new TypeError(
      `toHaveNoA11yViolations(options): no option named ${unknown.map((k) => `"${k}"`).join(', ')}; ` +
      `the options form takes ${OPTION_KEYS.join(', ')}. Put engine options under engineOptions.`
    );
  }
  if (rest.length && rest[0] !== undefined) {
    throw new TypeError('toHaveNoA11yViolations(options): give runOnly inside the options object, not as a second argument.');
  }
  for (const name of ['leanFail', 'wcagOnly', 'howToCheck']) {
    if (first[name] !== undefined && typeof first[name] !== 'boolean') {
      throw new TypeError(`toHaveNoA11yViolations(options): ${name} must be true or false.`);
    }
  }
  if (first.wcagOnly === true && first.leanFail !== true) {
    throw new TypeError('toHaveNoA11yViolations(options): wcagOnly narrows leanFail; pass leanFail: true with it.');
  }
  return {
    engineOptions: first.engineOptions,
    runOnly: first.runOnly,
    leanFail: first.leanFail === true,
    wcagOnly: first.wcagOnly === true,
    howToCheck: first.howToCheck === true
  };
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
// leaningFailures() returns. `questions` holds the other questions. Each is
// a list of checks with only those occurrences, for formatFailures().
function splitFindings(result, leaning) {
  const { occurrenceOutcome } = require('@surea11y/core');
  const counted = [];
  const questions = [];
  let failures = 0;
  let likelyFailures = 0;
  for (const check of result.checksResults) {
    if (!check || typeof check !== 'object') continue;
    const occurrences = Array.isArray(check.occurrences) ? check.occurrences : [];
    if (!occurrences.length) {
      // A failing rule with nothing to point to still failed; a rule that
      // threw is a question with its error (OUTPUT_SCHEMA.md).
      if (check.outcome === 'fail') {
        counted.push(check);
        failures += 1;
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
        failures += 1;
      } else if (tier === 'cantTell' && leaning.has(occurrence)) {
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
function describeResult(result, counted, howToCheck) {
  const gaps = getScanGaps(result);
  const blocks = [];
  if (counted.length) blocks.push(formatFailures(counted, { outcomes: ['fail', 'cantTell'], howToCheck }));
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
//   expect(received).toHaveNoA11yViolations(engineOptions?, runOnly?)
//   expect(received).toHaveNoA11yViolations({ engineOptions?, runOnly?, leanFail?, wcagOnly?, howToCheck? })
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
function toHaveNoA11yViolations(received, ...args) {
  const { engineOptions, runOnly, leanFail, wcagOnly, howToCheck } = readArguments(args[0], args.slice(1));
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
  const { counted, questions, failures, likelyFailures } = splitFindings(result, leaning);
  const failingGaps = getScanGaps(result).filter((g) => FAILING_GAPS.includes(g.kind));
  const pass = failures === 0 && likelyFailures === 0 && failingGaps.length === 0;

  const message = () => {
    if (pass) {
      return leanFail
        ? 'expected the element to have accessibility violations or likely failures, but none were found'
        : 'expected the element to have accessibility violations, but none were found';
    }
    let header;
    if (likelyFailures) {
      const found = failures
        ? `${plural(failures, 'failure', 'failures')} and ${plural(likelyFailures, 'likely failure', 'likely failures')}`
        : plural(likelyFailures, 'likely failure', 'likely failures');
      header = `expected no accessibility violations or likely failures, but found ${found}:`;
    } else if (failures) {
      header = `expected no accessibility violations, but found ${failures}:`;
    } else {
      header = 'expected no accessibility violations, but the scan left out what it was asked to check:';
    }
    const scopeNotFound = scannedElement && failingGaps.some((g) => g.kind === 'context-not-found');
    const details = describeResult(result, counted, howToCheck);
    const note = questions.length ? `\n\n${describeQuestions(questions, howToCheck)}` : '';
    return `${header}\n\n${scopeNotFound ? `${DETACHED_NOTE}\n\n` : ''}${details}${note}`;
  };

  return { pass, message };
}

module.exports = { toHaveNoA11yViolations };
