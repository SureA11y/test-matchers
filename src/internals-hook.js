'use strict';

// Installs @surea11y/core's opt-in internals hook in the test's jsdom window,
// so a scan reads the names, states and roles web components set through a
// private ElementInternals (`this.#internals = this.attachInternals()`).
//
// Meant for a Jest or Vitest setup file, which runs before the test file
// defines any component: the hook then sees every attachInternals() call.
// The document has finished loading by then, so core's own check would call
// the hook late; the setup file is in fact early, so it is installed as such
// (internalsHookScript({ early: true })). An element that attached internals
// before the hook isn't in its record, so call it before any component is
// defined, in the setup file rather than in a test.
//
// The script runs in the window's own realm (its Function constructor), as a
// page's init script would. Installing it twice in one window wraps once.
function installInternalsHook(win = typeof window !== 'undefined' ? window : undefined) {
  if (!win || typeof win !== 'object' || !win.document || typeof win.Function !== 'function') {
    throw new TypeError(
      'installInternalsHook(): no jsdom window to install the hook in. ' +
      "Call it from a setup file of a test environment that is jsdom (Jest: testEnvironment 'jsdom'; Vitest: test.environment 'jsdom')."
    );
  }
  const { internalsHookScript } = require('@surea11y/core');
  if (typeof internalsHookScript !== 'function') {
    throw new Error('installInternalsHook(): needs @surea11y/core 1.12.0 or later.');
  }
  new win.Function(internalsHookScript({ early: true }))();
}

module.exports = { installInternalsHook };
