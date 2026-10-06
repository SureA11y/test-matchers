'use strict';

const { toHaveNoA11yViolations } = require('../src/matcher');

beforeEach(() => {
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

test('document-wide rules are notApplicable (not fail) when scanning a scoped element, since a subtree is not the whole page', () => {
  document.title = ''; // would break page-title-present if it applied here
  document.body.innerHTML = '<div id="widget"><main><h1>Hi</h1></main></div>';
  const widget = document.getElementById('widget');

  const { pass } = toHaveNoA11yViolations(widget, { rules: { include: 'page-title-present' } });

  expect(pass).toBe(true);
});

test('document-wide rules still fail when scanning the whole document directly', () => {
  document.title = ''; // no <title> text -- deliberately breaks page-title-present
  document.body.innerHTML = '<main><h1>Hi</h1></main>';

  const { pass, message } = toHaveNoA11yViolations(document, { rules: { include: 'page-title-present' } });

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

test('fails when the element is not in the document, since nothing in it was scanned', () => {
  const detached = document.createElement('div');
  detached.innerHTML = '<img src="x.png">';

  const { pass, message } = toHaveNoA11yViolations(detached);

  expect(pass).toBe(false);
  expect(message()).toMatch(/left out what it was asked to check/);
  expect(message()).toMatch(/not in the document the scan runs in/);
  expect(message()).toMatch(/Nothing was scanned/);
  expect(message()).not.toMatch(/No accessibility violations found/);
});

test('fails when a custom rule did not run, naming the rule and the reason', () => {
  document.body.innerHTML = '<main><h1>Hi</h1></main>';
  const brokenRule = { id: 'team-broken-rule', meta: {}, runInPage: 'not a function' };

  const { pass, message } = toHaveNoA11yViolations(document.body, { customRules: [brokenRule] });

  expect(pass).toBe(false);
  expect(message()).toMatch(/Custom rule "team-broken-rule" did not run: runInPage/);
});

test('a precomputed result whose scope matched nothing fails; one whose scope partly matched does not', () => {
  const noMatch = { checksResults: [], contextMatch: { elementCount: 0, unmatchedSelectors: ['#app'] } };
  expect(toHaveNoA11yViolations(noMatch).pass).toBe(false);
  expect(toHaveNoA11yViolations(noMatch).message()).toMatch(/"#app"/);

  const partMatch = { checksResults: [], contextMatch: { elementCount: 1, unmatchedSelectors: ['#gone'] } };
  expect(toHaveNoA11yViolations(partMatch).pass).toBe(true);
});

test('the failure message ends with the core release that produced the result', () => {
  document.body.innerHTML = '<main><img src="x.png"></main>';
  const { message } = toHaveNoA11yViolations(document.body, { rules: { include: 'img-alt-present' } });
  expect(message()).toMatch(/Scanned with @surea11y\/core \d+\.\d+\.\d+\.$/);
});

test('locates a finding inside a shadow root through its host', () => {
  document.body.innerHTML = '<main><div id="host"></div></main>';
  document.getElementById('host').attachShadow({ mode: 'open' }).innerHTML = '<img src="x.png">';

  const { pass, message } = toHaveNoA11yViolations(document.body, {
    includeShadowDom: true,
    rules: { include: 'img-alt-present' }
  });

  expect(pass).toBe(false);
  expect(message()).toMatch(/at .*#host >>> .*img/);
});

test('an engineOptions rule or tag list that names nothing throws INVALID_RUN_ONLY instead of passing', () => {
  document.body.innerHTML = '<main><img src="x.png"></main>';
  let caught;
  try {
    toHaveNoA11yViolations(document.body, { rules: { include: 'img-alt-presnt' } });
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeDefined();
  expect(caught.code).toBe('INVALID_RUN_ONLY');
  expect(caught.message).toMatch(/img-alt-presnt/);
});
