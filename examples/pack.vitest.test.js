'use strict';

// Vitest equivalent of examples/pack.test.js -- same pack, same assertions;
// only the import/registration syntax differs.

import { test, expect, beforeEach } from 'vitest';
import { toHaveNoA11yViolations } from '../src/index.js';
import acmePolicy from './acme-policy-pack.js';

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
