'use strict';

// installLiveRegionHook() and toHaveAnnounced() under Vitest, installed once,
// first, as a setup file would. Needs @surea11y/core 1.14.0; skipped with
// older ones.

import { test, expect, describe } from 'vitest';
import { toHaveAnnounced, installLiveRegionHook } from '../src/index.js';
import core from '@surea11y/core';

const HAS_LIVE_REGION_HOOK = typeof core.liveRegionHookScript === 'function';
if (HAS_LIVE_REGION_HOOK) installLiveRegionHook();
expect.extend({ toHaveAnnounced });

describe.skipIf(!HAS_LIVE_REGION_HOOK)('installLiveRegionHook() under Vitest', () => {
  test('a text a live region is given is made available to announce', async () => {
    document.body.innerHTML = '<main><h1>Hi</h1><div id="status" role="status"></div></main>';
    // Rendered first; given its text after, as an app does on an action.
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.getElementById('status').textContent = 'Saved';
    expect(document).toHaveAnnounced('Saved');
    expect(document).not.toHaveAnnounced('Deleted');
  });
});
