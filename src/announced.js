'use strict';

// Jest custom matcher:
//   expect(received).toHaveAnnounced(expected?, { includeBehindModal? })
//
// What the page's live regions were given while shown and reachable by
// assistive technology, as core's live-region hook recorded it
// (getAnnouncements(window), @surea11y/core 1.14.0 and later): what the page
// made available to announce, not what a screen reader said.
//
// `received` is a window, a document, or an element. On a window or a
// document, every announcement in it counts; on an element, those of the
// live regions it is or contains, so a test can name the component it
// rendered. `expected` is a string, which must be the whole text (whitespace
// collapsed, as the hook keeps it), or a RegExp; without it, any
// announcement passes.
//
// A text given to a region behind an open modal dialog, which assistive
// technology did not get, counts only with `includeBehindModal: true`; the
// failure message lists it either way, so a test sees why it didn't count.

const NO_HOOK =
  'toHaveAnnounced(): the live-region hook is not installed in this window, so nothing records what live regions are given. ' +
  'Call installLiveRegionHook() from @surea11y/test-matchers in a setup file, before the code under test runs.';

function collapse(text) {
  return String(text).replace(/\s+/g, ' ').trim();
}

function windowOf(received) {
  if (received && typeof received === 'object') {
    if (received.window === received && received.document) return { win: received, within: null };
    if (received.nodeType === 9 /* Node.DOCUMENT_NODE */) return { win: received.defaultView, within: null };
    if (received.nodeType === 1 /* Node.ELEMENT_NODE */) {
      return { win: received.ownerDocument && received.ownerDocument.defaultView, within: received };
    }
  }
  throw new TypeError('toHaveAnnounced() expects a window, a document or an element.');
}

function readOptions(options) {
  if (options === undefined || options === null) return { includeBehindModal: false };
  if (typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('toHaveAnnounced(expected, options): options must be an object.');
  }
  const unknown = Object.keys(options).filter((k) => k !== 'includeBehindModal');
  if (unknown.length) {
    throw new TypeError(
      `toHaveAnnounced(expected, options): no option named ${unknown.map((k) => `"${k}"`).join(', ')}; use includeBehindModal.`
    );
  }
  if (options.includeBehindModal !== undefined && typeof options.includeBehindModal !== 'boolean') {
    throw new TypeError('toHaveAnnounced(expected, options): includeBehindModal must be true or false.');
  }
  return { includeBehindModal: options.includeBehindModal === true };
}

function matcherFor(expected) {
  if (expected === undefined) return { test: () => true, label: 'anything' };
  if (expected instanceof RegExp || Object.prototype.toString.call(expected) === '[object RegExp]') {
    return {
      test: (text) => {
        expected.lastIndex = 0;
        return expected.test(text);
      },
      label: String(expected)
    };
  }
  if (typeof expected === 'string') {
    const want = collapse(expected);
    return { test: (text) => text === want, label: JSON.stringify(want) };
  }
  throw new TypeError('toHaveAnnounced(expected): expected must be a string, a RegExp, or left out.');
}

// The region, for a reader: its tag, id and role or aria-live, as
// `div#status[role=status]`; `(removed)` once it has left the page.
function describeRegion(element) {
  if (!element || typeof element.tagName !== 'string') return 'a region';
  let text = element.tagName.toLowerCase();
  if (element.id) text += `#${element.id}`;
  for (const name of ['role', 'aria-live']) {
    const value = element.getAttribute(name);
    if (value) text += `[${name}=${value}]`;
  }
  return element.isConnected ? text : `${text} (removed)`;
}

function describeAnnouncement(a, i) {
  const where = describeRegion(a.element);
  const modal = a.behindModal ? ', behind an open modal dialog' : '';
  return `  ${i + 1}) ${JSON.stringify(a.text)} (${a.politeness}, ${where}${modal})`;
}

function toHaveAnnounced(received, expected, options) {
  const { win, within } = windowOf(received);
  const { includeBehindModal } = readOptions(options);
  const match = matcherFor(expected);
  const { getAnnouncements } = require('@surea11y/core');
  if (typeof getAnnouncements !== 'function') {
    throw new Error('toHaveAnnounced(): needs @surea11y/core 1.14.0 or later.');
  }
  const all = getAnnouncements(win, { includeBehindModal: true });
  if (!all) throw new Error(NO_HOOK);

  const inScope = within ? all.filter((a) => a.element === within || within.contains(a.element)) : all;
  const counted = includeBehindModal ? inScope : inScope.filter((a) => !a.behindModal);
  const matches = counted.filter((a) => match.test(a.text));
  const pass = matches.length > 0;

  const scope = within ? `in ${describeRegion(within)}` : 'in this page';
  const what = expected === undefined ? 'something' : match.label;

  const message = () => {
    if (pass) {
      const list = matches.map((a) => describeAnnouncement(a, inScope.indexOf(a))).join('\n');
      const expectation = expected === undefined ? 'nothing to have been announced' : `${what} not to have been announced`;
      return `expected ${expectation} ${scope}, but the live regions were given:\n\n${list}`;
    }
    if (!inScope.length) {
      return `expected ${what} to have been announced ${scope}, but no live region was given any text` +
        (within ? ' (a region removed from the element is not in it; assert on the document to see it)' : '') + '.';
    }
    const list = inScope.map(describeAnnouncement).join('\n');
    const hidden = inScope.filter((a) => a.behindModal && !includeBehindModal);
    const hiddenMatch = hidden.some((a) => match.test(a.text));
    let note = '';
    if (hidden.length) {
      note =
        `\n\n${hidden.length === 1 ? 'One text was' : `${hidden.length} texts were`} given to a region behind an open modal dialog, ` +
        'which assistive technology did not get, and not counted' +
        (hiddenMatch ? `, among them ${what}` : '') +
        '; pass { includeBehindModal: true } to count them.';
    }
    return `expected ${what} to have been announced ${scope}, but the live regions were given:\n\n${list}${note}`;
  };

  return { pass, message };
}

module.exports = { toHaveAnnounced };
