'use strict';

// Installs @surea11y/core's opt-in live-region hook (core 1.14.0 and later)
// in the test's jsdom window, and the toHaveAnnounced() matcher that reads
// what it recorded.
//
// The hook records each text a shown live region, reachable by assistive
// technology, is given: what the page made available to announce, not what
// a screen reader said. It records nothing until the document has loaded,
// which a test's jsdom document has by the time a setup file runs; in a
// setup file nothing the test cares about has happened yet, so it is
// installed as early (liveRegionHookScript({ early: true })).
function installLiveRegionHook(win = typeof window !== 'undefined' ? window : undefined) {
  if (!win || typeof win !== 'object' || !win.document || typeof win.Function !== 'function') {
    throw new TypeError(
      'installLiveRegionHook(): no jsdom window to install the hook in. ' +
      "Call it from a setup file of a test environment that is jsdom (Jest: testEnvironment 'jsdom'; Vitest: test.environment 'jsdom')."
    );
  }
  const { liveRegionHookScript } = require('@surea11y/core');
  if (typeof liveRegionHookScript !== 'function') {
    throw new Error('installLiveRegionHook(): needs @surea11y/core 1.14.0 or later.');
  }
  new win.Function(liveRegionHookScript({ early: true }))();
}

const NO_HOOK =
  'The live-region hook is not installed in this window, so nothing was recorded. ' +
  'Call installLiveRegionHook() in your setup file (@surea11y/core 1.14.0 and later).';

function describeExpected(expected) {
  return expected instanceof RegExp ? String(expected) : JSON.stringify(expected);
}

// expect(container).toHaveAnnounced(expected): passes when a live region in
// `container` (an element, or a document for the whole page) was given a
// text that contains `expected` (a string, whitespace collapsed) or matches
// it (a RegExp), as the live-region hook recorded it.
function toHaveAnnounced(received, expected) {
  if (!received || typeof received.nodeType !== 'number') {
    throw new TypeError('toHaveAnnounced() expects a DOM element or document.');
  }
  if (typeof expected !== 'string' && !(expected instanceof RegExp)) {
    throw new TypeError('toHaveAnnounced(expected): expected must be a string or a RegExp.');
  }
  const { getAnnouncements } = require('@surea11y/core');
  if (typeof getAnnouncements !== 'function') {
    throw new Error('toHaveAnnounced(): needs @surea11y/core 1.14.0 or later.');
  }
  const doc = received.nodeType === 9 ? received : received.ownerDocument;
  const all = getAnnouncements(doc && doc.defaultView);
  if (!all) {
    return { pass: false, message: () => NO_HOOK };
  }
  const inside =
    received.nodeType === 9 ? all : all.filter((a) => a.element === received || received.contains(a.element));
  const want = typeof expected === 'string' ? expected.replace(/\s+/g, ' ').trim() : expected;
  const matches = (text) => (typeof want === 'string' ? text.includes(want) : want.test(text));
  const pass = inside.some((a) => matches(a.text));
  const listed = inside.length
    ? inside.map((a) => `  - "${a.text}" (${a.politeness})`).join('\n')
    : '  (nothing)';
  const where = received.nodeType === 9 ? 'the page' : 'the element';
  return {
    pass,
    message: () =>
      pass
        ? `expected ${where} not to have made ${describeExpected(expected)} available to announce, but a live region in it was given:\n${listed}`
        : `expected ${where} to have made ${describeExpected(expected)} available to announce, but its live regions were given:\n${listed}`
  };
}

module.exports = { installLiveRegionHook, toHaveAnnounced };
