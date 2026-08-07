# @surea11y/test-matchers

An accessibility matcher for [`@surea11y/core`](https://github.com/SureA11y/core), for jsdom-based component and unit tests — works with **Jest** and **Vitest** alike:

```js
expect(container).toHaveNoA11yViolations();
```

surea11y's engine is synchronous, so this matcher is too. No `await`, no forgetting it and silently passing on a resolved Promise.

The matcher itself has no framework-specific code — `toHaveNoA11yViolations()` is a plain function returning Jest's/Vitest's shared `{ pass, message }` matcher shape, so it plugs into either framework's `expect.extend()` unmodified. Everything below applies identically to both; where setup differs (registration, TypeScript types), both are shown side by side.

## Why

surea11y is built around a conservative philosophy: **never report a violation unless it can be proven**. Each rule makes one deterministic decision — `fail` when a violation is objectively certain, `cantTell` when it requires human judgement (e.g. whether alt text is *meaningful*, not just present). This matcher keeps that same contract: only `fail` outcomes gate the assertion, and `cantTell` findings are surfaced for visibility but never break a passing test. See ["What it checks and doesn't"](#what-it-checks-and-doesnt) below.

## Requirements

Your test environment must be jsdom-based — this matcher scans whatever `document`/`window` your test environment already provides; it does not depend on `jsdom` itself or set one up for you.

- **Jest**: `testEnvironment: 'jsdom'` (or `jest-environment-jsdom` explicitly, depending on your Jest version).
- **Vitest**: `test.environment: 'jsdom'` in `vitest.config.js`/`vite.config.js`, and `jsdom` itself installed as a devDependency (Vitest doesn't bundle it).

## Install

```sh
npm install --save-dev @surea11y/test-matchers
```

## Setup

<table>
<tr><th>Jest</th><th>Vitest</th></tr>
<tr valign="top"><td>

```js
// jest.setup.js
expect.extend({
  toHaveNoA11yViolations:
    require('@surea11y/test-matchers').toHaveNoA11yViolations
});
```

```js
// jest.config.js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./jest.setup.js']
};
```

</td><td>

```js
// vitest.setup.js
import { expect } from 'vitest';
import { toHaveNoA11yViolations } from '@surea11y/test-matchers';

expect.extend({ toHaveNoA11yViolations });
```

```js
// vitest.config.js
export default {
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js']
  }
};
```

</td></tr>
</table>

### TypeScript

The bundled `.d.ts` augments **both** Jest's global `jest.Matchers` interface and Vitest's `@vitest/expect` `Assertion`/`AsymmetricMatchersContaining` interfaces, with no `@types/jest` or `vitest` import required to ship it — whichever framework (or neither) is actually installed, only the matching augmentation takes effect; the other is simply inert. Nothing further to configure beyond making sure the setup file above is included in your `tsconfig`.

## Usage

### Plain DOM

```js
test('no accessibility violations', () => {
  document.body.innerHTML = '<img src="logo.png">';
  expect(document.body).toHaveNoA11yViolations(); // fails: missing alt
});
```

### React Testing Library

```js
const { render } = require('@testing-library/react');

test('MyComponent has no accessibility violations', () => {
  const { container } = render(<MyComponent />);
  expect(container).toHaveNoA11yViolations();
});
```

Any framework exposing a rendered DOM element works the same way — Vue Test Utils' `wrapper.element`, Angular Testing Library's `container`, Svelte Testing Library's `container`, or a raw `document.body`. This is also framework-agnostic on the *test-runner* side: the snippet above is identical whether it runs under Jest or Vitest.

### Asserting `.not`

```js
test('a page with a violation fails the assertion', () => {
  document.body.innerHTML = '<main><img src="logo.png"></main>';
  expect(document.body).not.toHaveNoA11yViolations();
});
```

### Reusing one scan across multiple assertions

If you're already computing a surea11y scan result yourself (e.g. to assert on specific rules across several `it()` blocks without re-scanning each time), pass the result object directly instead of a DOM node:

```js
const { runDomRulesInPage } = require('@surea11y/core');

const result = runDomRulesInPage(null, '#main', {}, null);
expect(result).toHaveNoA11yViolations();
```

## API

### `toHaveNoA11yViolations(received, engineOptions?)`

| Param | Type | Meaning |
|---|---|---|
| `received` | `Element`, `Document`, or `A11yScanResult` | What to check. A DOM `Element`/`Document` is scanned automatically; an object shaped like `{ checksResults: [...] }` is asserted on directly, with no scan performed. Anything else throws a `TypeError`. |
| `engineOptions` | `object` (optional) | Passed straight through to `@surea11y/core`'s scan — the same options object used everywhere else in the surea11y ecosystem. See [Filtering and configuring scans](#filtering-and-configuring-scans-engineoptions) below and the engine's own [`ENGINE_OPTIONS.md`](https://github.com/SureA11y/core/blob/main/docs/ENGINE_OPTIONS.md). Ignored when `received` is already a scan result. |

Returns the `{ pass, message }` shape both Jest's and Vitest's `expect.extend()` expect — you never call this directly in a test; it's wired up once via `expect.extend()` as shown in [Setup](#setup).

## Filtering and configuring scans (`engineOptions`)

The second argument accepts anything `@surea11y/core` accepts. A few common cases:

```js
// Only run rules relevant to WCAG 2.0 A
expect(container).toHaveNoA11yViolations({ tags: { include: 'wcag2a' } });

// Skip a rule you've decided not to enforce yet
expect(container).toHaveNoA11yViolations({ rules: { exclude: 'target-size-minimum' } });

// Ignore a third-party widget you don't control
expect(container).toHaveNoA11yViolations({ excludeSelectors: ['.intercom-launcher'] });

// Run only specific rules
expect(container).toHaveNoA11yViolations({ rules: { include: 'img-alt-present, button-name-present' } });
```

For the complete, current option surface (locale, contrast modes, shadow DOM, custom rules, WCAG-version tag combinations, etc.), see [`ENGINE_OPTIONS.md`](https://github.com/SureA11y/core/blob/main/docs/ENGINE_OPTIONS.md) — this package doesn't duplicate or reinterpret that reference, it just forwards whatever you pass.

## What it checks and doesn't

Only `fail` outcomes gate the assertion — matching every other surea11y binding's convention that `cantTell` results are advisory (need human review), not failures. If a scan produces `cantTell` results, they're still surfaced in the failure message when the assertion *does* fail for other reasons, but they never cause a passing test to fail on their own:

```js
test('cantTell rules do not fail a passing test', () => {
  document.body.innerHTML = '<a href="/pricing">Click here</a>'; // vague link text: cantTell, not fail
  expect(document.body).toHaveNoA11yViolations();
});
```

Being explicit about the boundaries of automation is part of surea11y's design — it will not, for example, confirm alt text is *meaningful* (only that it's present), judge color contrast aesthetically (only whether it meets the ratio), or detect a keyboard focus trap (that requires simulating real interaction over time). Those are exactly the cases reported as `cantTell` rather than guessed at. See the engine's [`LIMITATIONS.md`](https://github.com/SureA11y/core/blob/main/docs/LIMITATIONS.md) for the full list.

### Scoping

Scoping to a specific element (rather than the whole `document`) works by temporarily tagging that element with a unique attribute, scanning by that attribute selector, then removing the tag — regardless of pass/fail/throw. This is invisible to your test; it's mentioned here only so you know why a scan is scoped exactly to the element you passed in, not the whole page:

```js
test('only failures inside the scanned element are reported', () => {
  document.body.innerHTML = '<div id="widget"><img src="ok.png" alt="ok"></div><img src="unrelated.png">';
  const widget = document.getElementById('widget');
  expect(widget).toHaveNoA11yViolations(); // passes -- the unrelated sibling <img> outside #widget is ignored
});
```

### Document-wide rules

A handful of rules check a whole-page fact rather than anything in a specific subtree — `page-title-present`, `html-lang-attr-present`, and a few others check `document.title`/`document.documentElement`/document-wide navigation structure directly, because what they check (does *the page* have a title? a declared language? a way to skip repeated blocks?) doesn't make sense to ask of an arbitrary component snippet.

Because of that, these rules behave differently depending on what you pass to `toHaveNoA11yViolations`:

- **Any `Element`** (React Testing Library's `container`, `document.body`, etc.) is inherently a scoped subtree, so these rules report `notApplicable` rather than `fail` — a missing `<title>` never breaks a component-level test.
- **`document` itself** is the whole page, so these rules are evaluated for real:

```js
test('a full-page scan still enforces document-wide rules', () => {
  document.title = ''; // no <title> text
  expect(document).toHaveNoA11yViolations({ rules: { include: 'page-title-present' } }); // fails
});
```

If you do scan `document` directly in a test suite, set these up once in whichever setup file you already have from [Setup](#setup) rather than per test:

```js
document.title = 'Test Page';
document.documentElement.setAttribute('lang', 'en');
```

## Failure messages

When the assertion fails, the message lists every occurrence (not just every rule — one rule can flag several elements), with the rule ID, severity, a human-readable summary, the failing element's selector, and a fix hint where available:

```
expected no accessibility violations, but found 1:

1) img-alt-present (serious): Missing alt attribute on <img>.
   at html > body > img
   Add an alt attribute or use alt="" for decorative images.
```

If any `cantTell` results exist alongside the failures, they're appended as a separate note so they stay visible without affecting `pass`/`fail`:

```
2 rule(s) need manual review (cantTell, not counted as failures): link-name-quality-manual, color-contrast-computable
```

## Examples

Runnable, side-by-side examples for both frameworks live in [`examples/`](./examples): [`basic.test.js`](./examples/basic.test.js) (Jest) and [`basic.vitest.test.js`](./examples/basic.vitest.test.js) (Vitest) — same two assertions, same matcher, only the registration syntax differs. To try them locally:

```sh
npm install
npm test          # runs both suites
npm run test:jest    # Jest only
npm run test:vitest  # Vitest only
```

## Tests

This package tests itself under both frameworks it supports:

- [`tests/matcher.test.js`](./tests/matcher.test.js) and [`tests/scan-element.test.js`](./tests/scan-element.test.js) — the exhaustive logic suite (rule scoping, document-wide rules, `cantTell` handling, `engineOptions` passthrough, thrown-input validation, mocked-throw cleanup), run under Jest since this is where the underlying logic lives; it doesn't depend on which framework eventually calls it.
- [`tests/matcher.vitest.test.js`](./tests/matcher.vitest.test.js) — proves the same matcher, completely unmodified, integrates correctly with Vitest's own `expect.extend` (registration, `.not`, `engineOptions` passthrough, precomputed-result assertions, thrown `TypeError`), so this isn't just a documentation claim.

## Related

- [`@surea11y/core`](https://github.com/SureA11y/core) — the underlying accessibility engine (rule catalog, CLI, output schema, engine options).
- [`@surea11y/binding-base`](https://github.com/SureA11y/binding-base) — shared, framework-agnostic helpers (like `formatFailures`) reused across surea11y's test-framework bindings.

## Maintainer

Maintained by [Jorge Rumoroso](https://github.com/rumoroso).

## License

MIT — see [`LICENSE`](./LICENSE).

This package depends on [`@surea11y/core`](https://github.com/SureA11y/core), which is MPL-2.0. MPL-2.0's copyleft is file-level and applies only to `@surea11y/core`'s own source files; consuming it as a normal package dependency doesn't affect this package's license.
