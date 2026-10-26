'use strict';

// installLiveRegionHook() and toHaveAnnounced() under Vitest, whose window
// globals are getters on Node's global. Installed once, first, as a setup
// file would. See live-region-hook.test.js for why each test waits a tick.

import { test, expect, beforeEach } from 'vitest';
import { toHaveNoA11yViolations, toHaveAnnounced, installLiveRegionHook } from '../src/index.js';
import { scanElement } from '../src/scan-element.js';

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

test('a text given to a status region is announced', async () => {
  document.body.innerHTML = '<main><h1>Hi</h1><div id="status" role="status"></div></main>';
  await tick();
  document.getElementById('status').textContent = 'Saved';

  expect(window).toHaveAnnounced('Saved');
  expect(document.getElementById('status')).toHaveAnnounced(/^Sav/);
  expect(() => expect(document).toHaveAnnounced('Deleted')).toThrow(/expected "Deleted" to have been announced in this page, but the live regions were given:\n\n {2}1\) "Saved" \(polite, div#status\[role=status\]\)/);
});

test('a region added with its text already in it is no announcement, and fails the assertion with leanFail: true', async () => {
  document.body.innerHTML = '<main><h1>Hi</h1><div id="slot"></div></main>';
  await tick();
  document.getElementById('slot').innerHTML = '<div role="status">Copied</div>';

  expect(document).not.toHaveAnnounced('Copied');
  expect(document.body).toHaveNoA11yViolations();
  expect(() => expect(document.body).toHaveNoA11yViolations({ leanFail: true })).toThrow(/live-region-announcements \(\w+, likely fails\)/);
});
