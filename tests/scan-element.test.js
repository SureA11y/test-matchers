'use strict';

beforeEach(() => {
  jest.resetModules();
  document.body.innerHTML = '';
});

afterEach(() => {
  // jest.doMock() registers a mock factory that outlives resetModules() in
  // the NEXT test unless explicitly cleared -- without this, the throwing
  // mock from the "even when the scan throws" test below leaks into every
  // subsequent test in this file.
  jest.dontMock('@surea11y/core');
});

test('scans an element scoped only to that element (siblings outside it are ignored)', () => {
  const { scanElement } = require('../src/scan-element');
  document.body.innerHTML = '<div id="target"><img src="x.png"></div><img src="y.png">';
  const target = document.getElementById('target');

  const result = scanElement(target);
  const imgRule = result.checksResults.find((r) => r.ruleId === 'img-alt-present');

  expect(imgRule.outcome).toBe('fail');
  expect(imgRule.occurrences).toHaveLength(1);
});

test('removes the temporary scope attribute after a successful scan', () => {
  const { scanElement, SCOPE_ATTR } = require('../src/scan-element');
  document.body.innerHTML = '<div id="target"></div>';
  const target = document.getElementById('target');

  scanElement(target);

  expect(target.hasAttribute(SCOPE_ATTR)).toBe(false);
});

test('removes the temporary scope attribute even when the scan throws', () => {
  jest.doMock('@surea11y/core', () => ({
    runDomRulesInPage: () => {
      throw new Error('boom');
    }
  }));
  const { scanElement, SCOPE_ATTR } = require('../src/scan-element');
  document.body.innerHTML = '<div id="target"></div>';
  const target = document.getElementById('target');

  expect(() => scanElement(target)).toThrow('boom');
  expect(target.hasAttribute(SCOPE_ATTR)).toBe(false);
});

test('scanning the Document itself scans the whole page without tagging anything', () => {
  const { scanElement } = require('../src/scan-element');
  document.body.innerHTML = '<img src="x.png">';

  const result = scanElement(document);
  const imgRule = result.checksResults.find((r) => r.ruleId === 'img-alt-present');

  expect(imgRule.outcome).toBe('fail');
});

test('passes engineOptions through to the underlying engine call', () => {
  const { scanElement } = require('../src/scan-element');
  document.body.innerHTML = '<img src="x.png"><button></button>';

  const result = scanElement(document, { rules: { include: 'button-name-present' } });

  expect(result.checksResults).toHaveLength(1);
  expect(result.checksResults[0].ruleId).toBe('button-name-present');
});
