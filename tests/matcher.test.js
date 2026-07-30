'use strict';

const { toHaveNoA11yViolations } = require('../src/matcher');

beforeEach(() => {
  // A realistic ambient document -- a bare jsdom document (no <title>, no
  // <html lang>) would otherwise fail page-title-present/html-lang-attr-present
  // on every single test regardless of the container under test, since those
  // rules deliberately check document.title/document.documentElement
  // directly (a page's title/language is a whole-document fact, not a
  // per-subtree one -- see README's "What it checks and doesn't" section).
  document.title = 'Test Page';
  document.documentElement.setAttribute('lang', 'en');
  document.body.innerHTML = '';
});

test('passes when the element has no accessibility violations', () => {
  document.body.innerHTML = '<main><h1>Hi</h1></main>';
  const { pass } = toHaveNoA11yViolations(document.body, { tags: { include: 'wcag2a' } });
  expect(pass).toBe(true);
});

test('fails with a descriptive message when the element has a violation', () => {
  document.body.innerHTML = '<main><img src="x.png"></main>';
  const { pass, message } = toHaveNoA11yViolations(document.body, { rules: { include: 'img-alt-present' } });
  expect(pass).toBe(false);
  expect(message()).toMatch(/img-alt-present/);
  expect(message()).toMatch(/found 1/);
});

test('document-wide rules (e.g. page title/lang) still apply even when scanning a specific element, not just the whole document', () => {
  document.title = ''; // no <title> text -- deliberately breaks page-title-present
  document.body.innerHTML = '<div id="widget"><main><h1>Hi</h1></main></div>';
  const widget = document.getElementById('widget');

  const { pass, message } = toHaveNoA11yViolations(widget, { rules: { include: 'page-title-present' } });

  expect(pass).toBe(false);
  expect(message()).toMatch(/page-title-present/);
});

test('accepts a precomputed surea11y result directly, without scanning', () => {
  const fakeResult = {
    checksResults: [
      { ruleId: 'fake-rule', outcome: 'fail', severity: 'serious', occurrences: [{ summary: 'x', selector: 'div' }] }
    ]
  };
  const { pass } = toHaveNoA11yViolations(fakeResult);
  expect(pass).toBe(false);
});

test('cantTell-only results pass (do not gate the assertion)', () => {
  const fakeResult = {
    checksResults: [
      { ruleId: 'manual-rule', outcome: 'cantTell', severity: 'minor', occurrences: [{ summary: 'needs review', selector: 'div' }] }
    ]
  };
  const { pass } = toHaveNoA11yViolations(fakeResult);
  expect(pass).toBe(true);
});

test('a failing result also surfaces cantTell rules for visibility, without them counting as failures', () => {
  const fakeResult = {
    checksResults: [
      { ruleId: 'fail-rule', outcome: 'fail', severity: 'serious', occurrences: [{ summary: 'broken', selector: 'div' }] },
      { ruleId: 'manual-rule', outcome: 'cantTell', severity: 'minor', occurrences: [{ summary: 'needs review', selector: 'span' }] }
    ]
  };
  const { pass, message } = toHaveNoA11yViolations(fakeResult);
  expect(pass).toBe(false);
  expect(message()).toMatch(/manual-rule/);
  expect(message()).toMatch(/cantTell/);
});

test('passes engineOptions through to the underlying scan', () => {
  document.body.innerHTML = '<img src="x.png"><button></button>';
  const { pass } = toHaveNoA11yViolations(document.body, { rules: { include: 'button-name-present' } });
  expect(pass).toBe(false); // button-name-present fails; img-alt-present is excluded by rules.include
});

test('throws a clear TypeError on invalid input', () => {
  expect(() => toHaveNoA11yViolations('not a node or result')).toThrow(TypeError);
  expect(() => toHaveNoA11yViolations('not a node or result')).toThrow(/expects a DOM element/);
});

test('registered via expect.extend, works as a real Jest matcher', () => {
  expect.extend({ toHaveNoA11yViolations });
  document.body.innerHTML = '<main><h1>Hi</h1></main>';
  expect(document.body).toHaveNoA11yViolations();
});

test('registered via expect.extend, .not. works for a violating element', () => {
  expect.extend({ toHaveNoA11yViolations });
  document.body.innerHTML = '<img src="x.png">';
  expect(document.body).not.toHaveNoA11yViolations();
});
