'use strict';

// toHaveAnnounced() on announcements given as core's getAnnouncements()
// returns them. jsdom has no HTMLDialogElement.showModal(), so a text given
// to a region behind a modal dialog can't be made in a test page; core's
// getAnnouncements() is mocked here to give one.

const region = (html) => {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder.firstElementChild;
};

let announcements;

beforeEach(() => {
  jest.resetModules();
  document.body.innerHTML = '<main><div id="status" role="status"></div></main>';
  const status = document.getElementById('status');
  const gone = region('<div class="toast" aria-live="polite"></div>');
  announcements = [
    { text: 'Saving', politeness: 'polite', time: 1, order: 1, behindModal: false, element: status },
    { text: 'Saved', politeness: 'polite', time: 2, order: 2, behindModal: true, element: status },
    { text: 'Copied', politeness: 'polite', time: 3, order: 3, behindModal: false, element: gone }
  ];
  jest.doMock('@surea11y/core', () => ({
    getAnnouncements: (win, options) => {
      expect(win).toBe(window);
      return options && options.includeBehindModal ? announcements : announcements.filter((a) => !a.behindModal);
    }
  }));
});

afterEach(() => {
  jest.dontMock('@surea11y/core');
});

test('a text given behind an open modal dialog counts only with includeBehindModal: true, and the message says why', () => {
  const { toHaveAnnounced } = require('../src/announced');

  const { pass, message } = toHaveAnnounced(document, 'Saved');
  expect(pass).toBe(false);
  expect(message()).toBe(
    'expected "Saved" to have been announced in this page, but the live regions were given:\n\n' +
      '  1) "Saving" (polite, div#status[role=status])\n' +
      '  2) "Saved" (polite, div#status[role=status], behind an open modal dialog)\n' +
      '  3) "Copied" (polite, div[aria-live=polite] (removed))' +
      '\n\nOne text was given to a region behind an open modal dialog, which assistive technology did not get, and not counted, ' +
      'among them "Saved"; pass { includeBehindModal: true } to count them.'
  );

  expect(toHaveAnnounced(document, 'Saved', { includeBehindModal: true }).pass).toBe(true);
});

test('a region that has left the page counts on the window and the document, not on an element', () => {
  const { toHaveAnnounced } = require('../src/announced');
  expect(toHaveAnnounced(window, 'Copied').pass).toBe(true);
  expect(toHaveAnnounced(document.body, 'Copied').pass).toBe(false);
  expect(toHaveAnnounced(document.getElementById('status'), 'Saving').pass).toBe(true);
});

test('without an expected text, any announcement passes, and none fails', () => {
  const { toHaveAnnounced } = require('../src/announced');
  expect(toHaveAnnounced(document).message()).toMatch(/^expected nothing to have been announced in this page, but the live regions were given:/);
  announcements = [];
  const { pass, message } = toHaveAnnounced(document);
  expect(pass).toBe(false);
  expect(message()).toBe('expected something to have been announced in this page, but no live region was given any text.');
});

test('throws a TypeError for what it cannot read', () => {
  const { toHaveAnnounced } = require('../src/announced');
  expect(() => toHaveAnnounced('page', 'Saved')).toThrow(/expects a window, a document or an element/);
  expect(() => toHaveAnnounced(document, 42)).toThrow(/expected must be a string, a RegExp, or left out/);
  expect(() => toHaveAnnounced(document, 'Saved', { behindModal: true })).toThrow(/no option named "behindModal"; use includeBehindModal/);
  expect(() => toHaveAnnounced(document, 'Saved', { includeBehindModal: 1 })).toThrow(/includeBehindModal must be true or false/);
});
