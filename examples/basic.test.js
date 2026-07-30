'use strict';

// A realistic example of how a consumer would use this package -- mirrors
// the examples/ convention already used by the other surea11y bindings.

const { toHaveNoA11yViolations } = require('../src/index');

expect.extend({ toHaveNoA11yViolations });

beforeEach(() => {
  // A real app's HTML template already has these; a bare jsdom test document
  // doesn't -- set them once so a component-level scan isn't drowned out by
  // unrelated page-level findings (see README's "What it checks and doesn't").
  document.title = 'Test Page';
  document.documentElement.setAttribute('lang', 'en');
});

test('a page with a violation fails the assertion', () => {
  document.body.innerHTML = '<main><img src="logo.png"></main>';
  expect(document.body).not.toHaveNoA11yViolations();
});

test('a clean page passes the assertion', () => {
  document.body.innerHTML = '<main><h1>Welcome</h1><img src="logo.png" alt="Company logo"></main>';
  expect(document.body).toHaveNoA11yViolations();
});
