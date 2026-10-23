'use strict';

// installListenerHook() under Vitest. Installed once, first, as a setup file
// would. Needs @surea11y/core 1.14.0; skipped with older ones.
//
// Core records the hook as 'late' here, as it does the internals hook,
// because Vitest defines the window's globals as getters, which core doesn't
// run when it reads the hook's registry. So a listener the hook saw counts,
// but a missing one proves nothing: a button with no key listener is asked
// about rather than failed.

import { test, expect, beforeEach, describe } from 'vitest';
import { installListenerHook } from '../src/index.js';
import { scanElement } from '../src/scan-element.js';
import core from '@surea11y/core';

const HAS_LISTENER_HOOK = typeof core.listenerHookScript === 'function';
if (HAS_LISTENER_HOOK) installListenerHook();

beforeEach(() => {
  document.title = 'Test Page';
  document.documentElement.setAttribute('lang', 'en');
  document.body.innerHTML = '';
});

function clickFinding(result) {
  const check = result.checksResults.find((r) => r.ruleId === 'click-handler-keyboard-operable');
  return [check.outcome, check.occurrences.map((o) => o.data.details.reasonCode)];
}

describe.skipIf(!HAS_LISTENER_HOOK)('installListenerHook() under Vitest', () => {
  test('a button given its click listener from script is seen; with no key listener it is asked about, with its own it passes', () => {
    document.body.innerHTML = '<main><h1>Hi</h1><div id="save" role="button" tabindex="0">Save</div></main>';
    const save = document.getElementById('save');
    save.addEventListener('click', () => {});
    const runOnly = { includeRuleIds: ['click-handler-keyboard-operable'] };
    const before = scanElement(document.body, null, runOnly);
    expect(before.engine.environment.listenerHook).toBe('late');
    expect(clickFinding(before)).toEqual(['cantTell', ['CLICK_HANDLER_NO_KEY_HANDLER']]);

    save.addEventListener('keydown', () => {});
    expect(clickFinding(scanElement(document.body, null, runOnly))).toEqual(['pass', []]);
  });
});
