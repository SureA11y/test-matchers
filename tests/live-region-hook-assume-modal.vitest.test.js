'use strict';

// installLiveRegionHook(window, { assumeModal: true }) under Vitest
// (@surea11y/core 1.16.0 and later). See
// live-region-hook-assume-modal.test.js.

import { test, expect, beforeEach } from 'vitest';
import { toHaveAnnounced, installLiveRegionHook } from '../src/index.js';

installLiveRegionHook(window, { assumeModal: true });
expect.extend({ toHaveAnnounced });

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  document.title = 'Test Page';
  document.documentElement.setAttribute('lang', 'en');
  document.body.innerHTML = '';
});

test('a text given behind an open aria-modal dialog counts only with includeBehindModal: true', async () => {
  document.body.innerHTML =
    '<main><h1>Hi</h1><div id="status-behind" role="status"></div></main>' +
    '<dialog id="dlg" aria-label="Confirm"><p>Sure?</p><button>Yes</button></dialog>';
  await tick();
  const dialog = document.getElementById('dlg');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('open', '');
  await tick();
  document.getElementById('status-behind').textContent = 'Saved behind';

  expect(document).not.toHaveAnnounced('Saved behind');
  expect(document).toHaveAnnounced('Saved behind', { includeBehindModal: true });
});
