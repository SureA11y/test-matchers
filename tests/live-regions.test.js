'use strict';

// installLiveRegionHook() and toHaveAnnounced() under Jest. The hook stays in
// the window for the whole file, so it is installed once, first, as a setup
// file would. Needs @surea11y/core 1.14.0; skipped with older ones.

const { toHaveAnnounced, installLiveRegionHook } = require('../src/index');
const { scanElement } = require('../src/scan-element');

const HAS_LIVE_REGION_HOOK = typeof require('@surea11y/core').liveRegionHookScript === 'function';

expect.extend({ toHaveAnnounced });

const describeHook = HAS_LIVE_REGION_HOOK ? describe : describe.skip;

describeHook('toHaveAnnounced() without the hook', () => {
  test('fails, saying how to install it', () => {
    // Before the hook is installed below.
    expect(() => expect(document).toHaveAnnounced('Saved')).toThrow(/Call installLiveRegionHook\(\) in your setup file/);
  });
});

describeHook('installLiveRegionHook() and toHaveAnnounced()', () => {
  beforeAll(() => installLiveRegionHook());

  // Rendered first; given their text in the test, as an app does on an action.
  beforeEach(async () => {
    document.title = 'Test Page';
    document.documentElement.setAttribute('lang', 'en');
    document.body.innerHTML = '<main><h1>Hi</h1><div id="status" role="status"></div><div id="other" aria-live="polite"></div></main>';
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  test('passes for a text a live region was given, as a substring or a RegExp, and .not for one it was not', () => {
    document.getElementById('status').textContent = 'Saved   your  draft';
    expect(document).toHaveAnnounced('your draft');
    expect(document.body).toHaveAnnounced(/^Saved/);
    expect(document).not.toHaveAnnounced('Deleted');
  });

  test('looks only at the live regions inside the element given', () => {
    document.getElementById('other').textContent = 'Elsewhere';
    expect(document.getElementById('status')).not.toHaveAnnounced('Elsewhere');
    expect(document.querySelector('main')).toHaveAnnounced('Elsewhere');
  });

  test('a region added with its text was not made available to announce, and the rule asks about it', () => {
    document.querySelector('main').insertAdjacentHTML('beforeend', '<div role="status">Copied</div>');
    expect(document).not.toHaveAnnounced('Copied');
    const result = scanElement(document, null, { includeRuleIds: ['live-region-announcements'] });
    expect(result.engine.environment.liveRegionHook).toBe('early');
    const check = result.checksResults.find((r) => r.ruleId === 'live-region-announcements');
    expect(check.occurrences.map((o) => o.data.details.reasonCode)).toContain('LIVE_REGION_INSERTED_WITH_CONTENT');
  });

  test('the failure message lists what was made available to announce', () => {
    document.getElementById('status').textContent = 'Saved';
    expect(() => expect(document).toHaveAnnounced('Deleted')).toThrow(/"Saved" \(polite\)/);
  });

  test('checks what it is given', () => {
    expect(() => expect({}).toHaveAnnounced('x')).toThrow(TypeError);
    expect(() => expect(document).toHaveAnnounced(3)).toThrow(TypeError);
  });
});

test('installLiveRegionHook() needs a window', () => {
  expect(() => installLiveRegionHook({})).toThrow(TypeError);
});
