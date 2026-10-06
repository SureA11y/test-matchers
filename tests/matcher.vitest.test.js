'use strict';

// Vitest-specific counterpart to tests/matcher.test.js -- proves the exact
// same matcher, unmodified, plugs into Vitest's expect.extend correctly
// (same { pass, message } contract Jest uses). Framework-agnostic logic
// (scanElement scoping, rule filtering, etc.) is already covered exhaustively
// in tests/matcher.test.js and tests/scan-element.test.js under Jest -- this
// file isn't meant to duplicate that, only to exercise the Jest/Vitest
// integration seam itself: registration, .not, engineOptions passthrough,
// precomputed-result assertions, and the thrown-error path.

import { test, expect, beforeEach } from 'vitest';
import { toHaveNoA11yViolations } from '../src/index.js';

expect.extend({ toHaveNoA11yViolations });

beforeEach(() => {
  document.title = 'Test Page';
  document.documentElement.setAttribute('lang', 'en');
  document.body.innerHTML = '';
});

test('registered via expect.extend, passes for a clean element', () => {
  document.body.innerHTML = '<main><h1>Hi</h1></main>';
  expect(document.body).toHaveNoA11yViolations();
});

test('registered via expect.extend, .not works for a violating element', () => {
  document.body.innerHTML = '<img src="x.png">';
  expect(document.body).not.toHaveNoA11yViolations();
});

test('a violation throws with a message naming the rule, selector and hint', () => {
  document.body.innerHTML = '<main><img src="logo.png"></main>';
  let caught;
  try {
    expect(document.body).toHaveNoA11yViolations();
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeDefined();
  expect(caught.message).toMatch(/img-alt-present/);
  expect(caught.message).toMatch(/found 1/);
});

test('engineOptions are passed through to the underlying scan', () => {
  document.body.innerHTML = '<img src="x.png"><button></button>';
  // Only button-name-present is included, so the missing alt on <img> is not checked.
  expect(document.body).not.toHaveNoA11yViolations({ rules: { include: 'button-name-present' } });
});

test('accepts a precomputed surea11y scan result directly, without scanning', () => {
  const failing = {
    checksResults: [
      { ruleId: 'fake-rule', outcome: 'fail', severity: 'serious', occurrences: [{ summary: 'x', selector: 'div' }] }
    ]
  };
  expect(failing).not.toHaveNoA11yViolations();

  const passing = {
    checksResults: [
      { ruleId: 'manual-rule', outcome: 'cantTell', severity: 'minor', occurrences: [{ summary: 'needs review', selector: 'div' }] }
    ]
  };
  expect(passing).toHaveNoA11yViolations();
});

test('throws a clear TypeError on invalid input', () => {
  expect(() => toHaveNoA11yViolations('not a node or result')).toThrow(TypeError);
  expect(() => toHaveNoA11yViolations('not a node or result')).toThrow(/expects a DOM element/);
});

test('a detached element fails the assertion, since nothing in it was scanned', () => {
  const detached = document.createElement('div');
  detached.innerHTML = '<img src="x.png">';
  expect(() => expect(detached).toHaveNoA11yViolations()).toThrow(/not in the document the scan runs in/);
});
