'use strict';

// Installs @surea11y/core's opt-in listener hook (core 1.14.0 and later) in
// the test's jsdom window, so the keyboard rules see the click, key, focus
// and mouse listeners the code under test adds from script
// (addEventListener, or an onclick-style property), not only inline handler
// attributes.
//
// Meant for a Jest or Vitest setup file, as installInternalsHook() is: run
// before the code under test adds any listener, the hook sees every one, so
// it is installed as early (listenerHookScript({ early: true })). A listener
// added before it isn't in its record.
//
// jsdom's selector engine adds keydown and keyup listeners to the window the
// first time a selector runs, for its own :focus-visible. One selector is run
// first, so those are in place before the hook and never read as the app's.
function installListenerHook(win = typeof window !== 'undefined' ? window : undefined) {
  if (!win || typeof win !== 'object' || !win.document || typeof win.Function !== 'function') {
    throw new TypeError(
      'installListenerHook(): no jsdom window to install the hook in. ' +
      "Call it from a setup file of a test environment that is jsdom (Jest: testEnvironment 'jsdom'; Vitest: test.environment 'jsdom')."
    );
  }
  const { listenerHookScript } = require('@surea11y/core');
  if (typeof listenerHookScript !== 'function') {
    throw new Error('installListenerHook(): needs @surea11y/core 1.14.0 or later.');
  }
  try {
    win.document.querySelector('*');
  } catch (e) {
    // A document that can't be queried yet has no selector engine to set up.
  }
  new win.Function(listenerHookScript({ early: true }))();
}

module.exports = { installListenerHook };
