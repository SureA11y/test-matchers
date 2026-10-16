'use strict';

// installInternalsHook() under Jest. The hook changes the window for the
// whole file, so it is installed once, first, as a setup file would.
//
// jest-environment-jsdom 30 ships jsdom 26, which throws when a component
// sets an ARIA property on its ElementInternals (internals.ariaLabel = ...),
// so the name read through the hook is tested under Vitest
// (internals-hook.vitest.test.js). What an early hook adds here: a custom
// element that never attached internals is known to have none, so it is no
// internals question.

const { toHaveNoA11yViolations, installInternalsHook } = require('../src/index');
const { scanElement } = require('../src/scan-element');

installInternalsHook();

beforeEach(() => {
  document.title = 'Test Page';
  document.documentElement.setAttribute('lang', 'en');
  document.body.innerHTML = '';
});

test('records itself as early, and the result says so', () => {
  document.body.innerHTML = '<main><h1>Hi</h1></main>';
  expect(scanElement(document).engine.environment.internalsHook).toBe('early');
});

test('a custom element that never attached internals is no internals question, and a failure message has no hook note', () => {
  customElements.define('x-plain-button', class extends HTMLElement {});
  document.body.innerHTML = '<main><h1>Hi</h1><x-plain-button role="button"></x-plain-button><img src="x.png"></main>';

  const result = scanElement(document.body);
  const reasons = result.checksResults.flatMap((r) => r.occurrences.map((o) => o.data && o.data.details && o.data.details.reasonCode));
  expect(reasons).not.toContain('name_internals');

  const { pass, message } = toHaveNoA11yViolations(result);
  expect(pass).toBe(false); // the <img>
  expect(message()).not.toMatch(/internals hook/);
});

test('installing it again changes nothing', () => {
  const wrapped = HTMLElement.prototype.attachInternals;
  installInternalsHook();
  expect(HTMLElement.prototype.attachInternals).toBe(wrapped);
});

test('throws a TypeError for anything but a window', () => {
  for (const bad of [null, {}, { document: {} }]) {
    expect(() => installInternalsHook(bad)).toThrow(/installInternalsHook\(\): no jsdom window/);
  }
});
