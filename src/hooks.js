'use strict';

// Installs @surea11y/core's opt-in hooks in the test's jsdom window:
//
//   - the internals hook, so a scan reads the names, states and roles web
//     components set through a private ElementInternals
//     (`this.#internals = this.attachInternals()`);
//   - the listener hook (core 1.14.0), so the keyboard rules see the click,
//     key, focus and mouse listeners added from script;
//   - the live-region hook (core 1.14.0), which records what live regions
//     are given, for the scan and for getAnnouncements().
//
// Meant for a Jest or Vitest setup file, which runs before the test file
// defines any component or adds any listener: the hook then sees all of it.
// The document has finished loading by then, so core's own check would call
// the hook late; the setup file is in fact early, so each is installed as
// such ({ early: true }). What happened before the hook isn't in its record,
// so call it in the setup file rather than in a test.
//
// Each script runs in the window's own realm (its Function constructor), as
// a page's init script would. Each hook keeps the prototype it patched in
// its registry, so core finds it under Vitest too, where the window's
// classes reach Node's global as getters. Installing one twice in a window
// wraps once.

const HOOKS = {
  installInternalsHook: { script: 'internalsHookScript', since: '1.12.0' },
  installListenerHook: { script: 'listenerHookScript', since: '1.14.0' },
  installLiveRegionHook: { script: 'liveRegionHookScript', since: '1.14.0' }
};

function installHook(name, win) {
  if (!win || typeof win !== 'object' || !win.document || typeof win.Function !== 'function') {
    throw new TypeError(
      `${name}(): no jsdom window to install the hook in. ` +
      "Call it from a setup file of a test environment that is jsdom (Jest: testEnvironment 'jsdom'; Vitest: test.environment 'jsdom')."
    );
  }
  const { script, since } = HOOKS[name];
  const hookScript = require('@surea11y/core')[script];
  if (typeof hookScript !== 'function') {
    throw new Error(`${name}(): needs @surea11y/core ${since} or later.`);
  }
  new win.Function(hookScript({ early: true }))();
}

function defaultWindow() {
  return typeof window !== 'undefined' ? window : undefined;
}

function installInternalsHook(win = defaultWindow()) {
  installHook('installInternalsHook', win);
}

function installListenerHook(win = defaultWindow()) {
  // jsdom's selector engine adds keydown and keyup listeners to the window
  // the first time a selector runs, for its own :focus-visible. Recorded as
  // the page's, they would put a key listener above every element, so one
  // selector runs first (core's INTEGRATION.md, "Early and late").
  if (win && win.document && typeof win.document.querySelector === 'function') {
    win.document.querySelector('*');
  }
  installHook('installListenerHook', win);
}

function installLiveRegionHook(win = defaultWindow()) {
  installHook('installLiveRegionHook', win);
}

module.exports = { installInternalsHook, installListenerHook, installLiveRegionHook };
