'use strict';

// installLiveRegionHook() and toHaveAnnounced() under Jest. The hook
// changes the window for the whole file, so it is installed once, first, as
// a setup file would.
//
// The hook reads changes by task: what a test does with no await in
// between is one task, so a region added and filled in it was added with
// its text. Each test renders, then waits a tick, then acts, as a test that
// awaits a user event does.

const { toHaveNoA11yViolations, toHaveAnnounced, installLiveRegionHook } = require('../src/index');
const { scanElement } = require('../src/scan-element');

installLiveRegionHook();
expect.extend({ toHaveNoA11yViolations, toHaveAnnounced });

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  document.title = 'Test Page';
  document.documentElement.setAttribute('lang', 'en');
  document.body.innerHTML = '';
});

test('records itself as early, and the result says so', () => {
  document.body.innerHTML = '<main><h1>Hi</h1></main>';
  expect(scanElement(document).engine.environment.liveRegionHook).toBe('early');
});

test('a text given to a status region is announced, and the matcher says so', async () => {
  document.body.innerHTML = '<main><h1>Hi</h1><div id="status-1" role="status"></div></main>';
  await tick();
  document.getElementById('status-1').textContent = 'Saved   to drafts';

  expect(window).toHaveAnnounced('Saved to drafts');
  expect(document).toHaveAnnounced(/saved/i);
  expect(document.getElementById('status-1')).toHaveAnnounced();
  expect(document).not.toHaveAnnounced('Saved'); // a string is the whole text

  const { message } = toHaveAnnounced(document, 'Saved');
  expect(message()).toMatch(/^expected "Saved" to have been announced in this page, but the live regions were given:\n\n/);
  expect(message()).toMatch(/\d\) "Saved to drafts" \(polite, div#status-1\[role=status\]\)/);
});

test('on an element, only the regions in it count', async () => {
  document.body.innerHTML = '<main><h1>Hi</h1><section id="form"><p>Form</p></section><div id="status-2" aria-live="assertive"></div></main>';
  await tick();
  document.getElementById('status-2').textContent = 'Failed to save';

  const form = document.getElementById('form');
  expect(form).not.toHaveAnnounced('Failed to save');
  expect(toHaveAnnounced(form, 'Failed to save').message()).toMatch(/^expected "Failed to save" to have been announced in section#form, but no live region was given any text/);
  expect(() => expect(document).not.toHaveAnnounced('Failed to save')).toThrow(
    /expected "Failed to save" not to have been announced in this page, but the live regions were given:\n\n {2}\d+\) "Failed to save" \(assertive, div#status-2\[aria-live=assertive\]\)/
  );
});

test('a region added with its text already in it is no announcement, and the scan asks about it, leaning fail', async () => {
  document.body.innerHTML = '<main><h1>Hi</h1><div id="slot"></div></main>';
  await tick();
  document.getElementById('slot').innerHTML = '<div id="toast" role="status">Copied</div>';

  expect(document).not.toHaveAnnounced('Copied');
  const check = scanElement(document).checksResults.find((r) => r.ruleId === 'live-region-announcements');
  const toast = check.occurrences.find((o) => o.selector === '#toast');
  expect(toast.data.details.reasonCode).toBe('LIVE_REGION_INSERTED_WITH_CONTENT');
  expect(toast.lean.toward).toBe('fail');

  expect(document.body).toHaveNoA11yViolations();
  expect(() => expect(document.body).toHaveNoA11yViolations({ leanFail: true })).toThrow(/live-region-announcements \(\w+, likely fails\)/);
});

test('installing it again changes nothing', async () => {
  document.body.innerHTML = '<main><div id="status-3" role="status"></div></main>';
  installLiveRegionHook();
  await tick();
  document.getElementById('status-3').textContent = 'Once';
  const said = require('@surea11y/core').getAnnouncements(window).filter((a) => a.text === 'Once');
  expect(said).toHaveLength(1);
});

test('throws a TypeError for anything but a window', () => {
  for (const bad of [null, {}, { document: {} }]) {
    expect(() => installLiveRegionHook(bad)).toThrow(/installLiveRegionHook\(\): no jsdom window/);
  }
});
