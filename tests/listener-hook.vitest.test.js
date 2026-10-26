'use strict';

// installListenerHook() under Vitest, which copies the jsdom window's
// classes onto Node's global as getters; the hook keeps the prototype it
// patched in its registry, so core still finds it there. Installed once,
// first, as a setup file would.

import { test, expect, beforeEach } from 'vitest';
import { toHaveNoA11yViolations, installListenerHook } from '../src/index.js';
import { scanElement } from '../src/scan-element.js';

installListenerHook();
expect.extend({ toHaveNoA11yViolations });

beforeEach(() => {
  document.title = 'Test Page';
  document.documentElement.setAttribute('lang', 'en');
  document.body.innerHTML = '';
});

const keyboardRule = (result) => result.checksResults.find((r) => r.ruleId === 'click-handler-keyboard-operable');

test('records itself as early, and the result says so', () => {
  document.body.innerHTML = '<main><h1>Hi</h1></main>';
  expect(scanElement(document).engine.environment.listenerHook).toBe('early');
});

test('a button that only listens for clicks, added from script, fails', () => {
  document.body.innerHTML = '<main><h1>Hi</h1><div class="save" role="button" tabindex="0">Save</div></main>';
  document.querySelector('.save').addEventListener('click', () => {});

  const check = keyboardRule(scanElement(document.body));
  expect(check.outcome).toBe('fail');
  expect(check.occurrences.map((o) => o.data.details.reasonCode)).toEqual(['CLICK_HANDLER_NO_KEY_LISTENER']);
  expect(() => expect(document.body).toHaveNoA11yViolations()).toThrow(/click-handler-keyboard-operable/);
});

test('the same button with a key listener passes', () => {
  document.body.innerHTML = '<main><h1>Hi</h1><div class="save" role="button" tabindex="0">Save</div></main>';
  const save = document.querySelector('.save');
  save.addEventListener('click', () => {});
  save.addEventListener('keydown', () => {});

  expect(keyboardRule(scanElement(document.body)).outcome).toBe('pass');
  expect(document.body).toHaveNoA11yViolations();
});
