'use strict';

// installListenerHook() under Jest. The hook changes the window for the whole
// file, so it is installed once, first, as a setup file would. Needs
// @surea11y/core 1.14.0; skipped with older ones.

const { toHaveNoA11yViolations, installListenerHook } = require('../src/index');
const { scanElement } = require('../src/scan-element');

const HAS_LISTENER_HOOK = typeof require('@surea11y/core').listenerHookScript === 'function';
if (HAS_LISTENER_HOOK) installListenerHook();

const describeHook = HAS_LISTENER_HOOK ? describe : describe.skip;

beforeEach(() => {
  document.title = 'Test Page';
  document.documentElement.setAttribute('lang', 'en');
  document.body.innerHTML = '';
});

function clickFinding(result) {
  const check = result.checksResults.find((r) => r.ruleId === 'click-handler-keyboard-operable');
  return [check.outcome, check.occurrences.map((o) => o.data.details.reasonCode)];
}

describeHook('installListenerHook()', () => {
  test('records itself as early, and the result says so', () => {
    document.body.innerHTML = '<main><h1>Hi</h1></main>';
    expect(scanElement(document).engine.environment.listenerHook).toBe('early');
  });

  test('a button given its click listener from script, with no key listener, fails; with its own keydown listener it passes', () => {
    document.body.innerHTML = '<main><h1>Hi</h1><div id="save" role="button" tabindex="0">Save</div></main>';
    const save = document.getElementById('save');
    save.addEventListener('click', () => {});
    const runOnly = { includeRuleIds: ['click-handler-keyboard-operable'] };
    // jsdom's own key listeners on the window were set up before the hook,
    // so they don't read as the app's.
    expect(clickFinding(scanElement(document.body, null, runOnly))).toEqual(['fail', ['CLICK_HANDLER_NO_KEY_LISTENER']]);

    save.addEventListener('keydown', () => {});
    expect(clickFinding(scanElement(document.body, null, runOnly))).toEqual(['pass', []]);
  });

  test('the matcher fails on it, with the rule in its message', () => {
    document.body.innerHTML = '<main><h1>Hi</h1><div id="go" role="button" tabindex="0">Go</div></main>';
    document.getElementById('go').onclick = () => {};
    const { pass, message } = toHaveNoA11yViolations(document.body, null, { includeRuleIds: ['click-handler-keyboard-operable'] });
    expect(pass).toBe(false);
    expect(message()).toMatch(/click-handler-keyboard-operable/);
  });

  test('installing it again changes nothing', () => {
    const wrapped = EventTarget.prototype.addEventListener;
    installListenerHook();
    expect(EventTarget.prototype.addEventListener).toBe(wrapped);
  });
});

test('throws a TypeError for anything but a window', () => {
  for (const bad of [null, {}, { document: {} }]) {
    expect(() => installListenerHook(bad)).toThrow(/installListenerHook\(\): no jsdom window/);
  }
});
