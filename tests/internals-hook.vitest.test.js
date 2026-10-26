'use strict';

// installInternalsHook() under Vitest, whose jsdom (29) lets a component set
// ARIA properties on its ElementInternals. Installed once, first, as a setup
// file would.

import { test, expect, beforeEach } from 'vitest';
import { toHaveNoA11yViolations, installInternalsHook } from '../src/index.js';
import { scanElement } from '../src/scan-element.js';

installInternalsHook();
expect.extend({ toHaveNoA11yViolations });

// Names itself and sets its state through a private field, where no script
// but the hook can read them.
customElements.define('x-check', class extends HTMLElement {
  #internals;
  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.ariaLabel = 'Subscribe';
    this.#internals.ariaChecked = 'false';
  }
});

// A switch only through its internals, with no name: unseen without the hook.
customElements.define('x-toggle', class extends HTMLElement {
  #internals;
  constructor() {
    super();
    this.#internals = this.attachInternals();
    this.#internals.role = 'switch';
  }
});

beforeEach(() => {
  document.title = 'Test Page';
  document.documentElement.setAttribute('lang', 'en');
  document.body.innerHTML = '';
});

test('a component that names itself through private internals passes', () => {
  document.body.innerHTML = '<main><h1>Hi</h1><x-check role="checkbox"></x-check></main>';
  expect(document.body).toHaveNoA11yViolations();

  const result = scanElement(document.body);
  const outcome = (id) => result.checksResults.find((r) => r.ruleId === id).outcome;
  expect(outcome('binary-control-name-present')).toBe('pass');
  expect(outcome('aria-required-attr')).toBe('pass');
  expect(result.engine.environment.internalsHook).toBe('early');
});

test('a custom element that never attached internals is no internals question', () => {
  customElements.define('x-plain-button', class extends HTMLElement {});
  document.body.innerHTML = '<main><h1>Hi</h1><x-plain-button role="button"></x-plain-button></main>';
  const result = scanElement(document.body);
  const reasons = result.checksResults.flatMap((r) => r.occurrences.map((o) => o.data && o.data.details && o.data.details.reasonCode));
  expect(reasons).not.toContain('name_internals');
});

test('a component that is a switch only through its internals is checked as one, and fails without a name', () => {
  document.body.innerHTML = '<main><h1>Hi</h1><x-toggle></x-toggle></main>';
  expect(document.body).not.toHaveNoA11yViolations();

  const result = scanElement(document.body);
  const check = result.checksResults.find((r) => r.ruleId === 'binary-control-name-present');
  expect(check.outcome).toBe('fail');
  expect(check.occurrences.map((o) => o.selector)).toEqual([expect.stringMatching(/x-toggle$/)]);
});
