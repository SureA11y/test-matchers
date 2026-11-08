'use strict';

// installLiveRegionHook(window, { assumeModal: true }) under Jest
// (@surea11y/core 1.16.0 and later). jsdom can't open a modal dialog, so a
// test that stands in for showModal() with `open` and aria-modal="true"
// installs the hook with assumeModal, and scans with
// engineOptions.assumeModal, to have that dialog taken as modal. Installed
// once, first, as a setup file would; see live-region-hook.test.js for why
// each test waits a tick.

const { toHaveNoA11yViolations, toHaveAnnounced, installLiveRegionHook } = require('../src/index');
const { scanElement } = require('../src/scan-element');

installLiveRegionHook(window, { assumeModal: true });
expect.extend({ toHaveNoA11yViolations, toHaveAnnounced });

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  document.title = 'Test Page';
  document.documentElement.setAttribute('lang', 'en');
  document.body.innerHTML = '';
});

test('records itself as early', () => {
  document.body.innerHTML = '<main><h1>Hi</h1></main>';
  expect(scanElement(document, { assumeModal: true }).engine.environment.liveRegionHook).toBe('early');
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
  expect(toHaveAnnounced(document, 'Saved behind').message()).toMatch(/\(polite, div#status-behind\[role=status\], behind an open modal dialog\)/);
});

test('a text given in the dialog itself counts', async () => {
  document.body.innerHTML =
    '<main><h1>Hi</h1></main>' +
    '<dialog id="dlg-2" aria-label="Confirm" open aria-modal="true"><p id="status-in" role="status"></p></dialog>';
  await tick();
  document.getElementById('status-in').textContent = 'Saved inside';
  expect(document).toHaveAnnounced('Saved inside');
});

test('the scan judges the page behind such a dialog, unless engineOptions.assumeModal is set', () => {
  document.body.innerHTML =
    '<main><h1>Hi</h1><img src="a.png"></main>' +
    '<dialog aria-label="Confirm" open aria-modal="true"><p>Sure?</p><button>Yes</button></dialog>';
  expect(() => expect(document).toHaveNoA11yViolations()).toThrow(/img-alt-present/);
  expect(document).toHaveNoA11yViolations({ assumeModal: true });
});

test('throws a TypeError for options it does not take', () => {
  expect(() => installLiveRegionHook(window, 'yes')).toThrow(/installLiveRegionHook\(win, options\): options must be an object/);
  expect(() => installLiveRegionHook(window, { assume: true })).toThrow(/no option named "assume"; use assumeModal/);
  expect(() => installLiveRegionHook(window, { assumeModal: 1 })).toThrow(/assumeModal must be true or false/);
});
