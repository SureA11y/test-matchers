'use strict';

// Scanning with a pack: examples/acme-policy-pack.js adds a house rule and a
// checklist profile. The scan runs in Node, so the pack is passed as the
// object itself.

const { toHaveNoA11yViolations } = require('../src/index');
const acmePolicy = require('./acme-policy-pack');

expect.extend({ toHaveNoA11yViolations });

const policy = { packs: [acmePolicy], profile: 'acme-web-2026' };

beforeEach(() => {
  document.title = 'Test Page';
  document.documentElement.setAttribute('lang', 'en');
});

test("a page that breaks the pack's house rule fails the assertion", () => {
  document.body.innerHTML = '<main><h1>Welcome</h1><video autoplay src="intro.mp4"></video></main>';
  expect(document).not.toHaveNoA11yViolations(policy);
});

test("a page that meets the pack's profile passes the assertion", () => {
  document.body.innerHTML = '<main><h1>Welcome</h1><img src="logo.png" alt="Company logo"></main>';
  expect(document).toHaveNoA11yViolations(policy);
});
