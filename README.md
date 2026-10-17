# @surea11y/test-matchers

**Fail a Jest or Vitest test when a component has accessibility violations.** Render your React, Vue, Angular or Svelte component (or any DOM) in a jsdom test, then:

```js
expect(container).toHaveNoA11yViolations();
```

The checks come from [`@surea11y/core`](https://github.com/SureA11y/core), surea11y's accessibility engine. This package is the small layer that turns a core scan into a test assertion: it scans the element you give it, fails the test on proven violations, and prints a failure message that says what is wrong, where, and how to fix it.

surea11y's engine is synchronous, so this matcher is too. No `await`, no forgetting it and silently passing on a resolved Promise.

## Quick start

```sh
npm install --save-dev @surea11y/core @surea11y/test-matchers
```

```js
// Jest: jest.setup.js (with testEnvironment: 'jsdom')
expect.extend({ toHaveNoA11yViolations: require('@surea11y/test-matchers').toHaveNoA11yViolations });
```

```js
// Vitest: vitest.setup.js (with test.environment: 'jsdom')
import { expect } from 'vitest';
import { toHaveNoA11yViolations } from '@surea11y/test-matchers';
expect.extend({ toHaveNoA11yViolations });
```

```js
import { render } from '@testing-library/react';

test('MyComponent has no accessibility violations', () => {
  const { container } = render(<MyComponent />);
  expect(container).toHaveNoA11yViolations();
});
```

`@surea11y/core`, the engine, is a peer dependency: install it beside this package, 1.12.0 or later, as the line above does, so your tests and anything else in your project that uses core share one copy. Full [Setup](#setup), including the config files and TypeScript, is below.

## Do you need this package?

surea11y comes as a few packages. Pick by where you want the check to run:

| You want to… | Install |
|---|---|
| Fail a **Jest or Vitest** test (component or unit test, jsdom) on accessibility violations | **`@surea11y/test-matchers`** (this package) |
| Check built HTML or a page from the **terminal or CI**, outside a test runner | [`@surea11y/cli`](https://github.com/SureA11y/cli) |
| Call the **engine** yourself and work with the raw scan result | [`@surea11y/core`](https://github.com/SureA11y/core) |

If you write component tests with Jest or Vitest, this is the one to start with: it brings core with it. You don't need it to use the CLI, or to call core directly.

### If you've used another accessibility matcher

Registration is the usual one: `expect.extend()` once in a setup file, then assert on a rendered container. What may differ from what you know:

- **No `await` and no separate scan call.** Pass the container itself; the matcher scans it, synchronously.
- **Only proven violations fail the test.** Findings that need a person to judge (is this alt text *meaningful*?) are reported as `cantTell` and listed in the message, but never fail a test on their own. See [Why](#why).
- **A scan that checked nothing fails.** A detached element, or a custom rule or pack that did not run, fails the assertion instead of passing on nothing. See [Scans that left something out](#scans-that-left-something-out).
- **Rule ids, tags and options are surea11y's.** See [Filtering and configuring scans](#filtering-and-configuring-scans-engineoptions).

The matcher itself has no framework-specific code — `toHaveNoA11yViolations()` is a plain function returning Jest's/Vitest's shared `{ pass, message }` matcher shape, so it plugs into either framework's `expect.extend()` unmodified. Everything below applies identically to both; where setup differs (registration, TypeScript types), both are shown side by side.

## Why

surea11y is built around a conservative philosophy: **never report a violation unless it can be proven**. Each rule makes one deterministic decision — `fail` when a violation is objectively certain, `cantTell` when it requires human judgement (e.g. whether alt text is *meaningful*, not just present). This matcher keeps that same contract: `fail` outcomes gate the assertion, and `cantTell` findings are surfaced for visibility but never break a passing test. A scan that could not check what it was asked to (an element not in the document, a custom rule or a pack that did not run) fails too, rather than passing on nothing. See ["What it checks and doesn't"](#what-it-checks-and-doesnt) below.

## Requirements

Your test environment must be jsdom-based — this matcher scans whatever `document`/`window` your test environment already provides; it does not depend on `jsdom` itself or set one up for you.

- **Jest**: `testEnvironment: 'jsdom'` (or `jest-environment-jsdom` explicitly, depending on your Jest version).
- **Vitest**: `test.environment: 'jsdom'` in `vitest.config.js`/`vite.config.js`, and `jsdom` itself installed as a devDependency (Vitest doesn't bundle it).

## Install

```sh
npm install --save-dev @surea11y/core @surea11y/test-matchers
```

`@surea11y/core` 1.12.0 or later is a peer dependency, so name it yourself: Yarn, npm 6 and npm with `legacy-peer-deps` don't install peers for you, and npm 7 and later refuse the install when your project pins an older core. Up to 1.3.0 core came with this package as a regular dependency; if your `package.json` names only `@surea11y/test-matchers`, add `@surea11y/core` when you upgrade.

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

`engineOptions` is typed with `@surea11y/core`'s own `EngineOptions` (or `StrictEngineOptions`, with `strictOptions: true`), `runOnly` with core's `RunOnly` and its other accepted forms (`A11yRunOnly`), and a precomputed result may be core's `ScanResult`; all are re-exported from this package (`import type { EngineOptions, RunOnly, ScanResult } from '@surea11y/test-matchers'`). `engineOptions.packs` takes the packs `definePack` from `@surea11y/core/pack` returns. A precomputed result's `skippedPacks` is typed on `A11yScanResult` beside `skippedCustomRules`. `installInternalsHook(win?)` is typed too.

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

If `#main` matches nothing, `@surea11y/core` (1.10.0 and later) scans nothing and says so in the result's `contextMatch`, and the assertion fails (see [Scans that left something out](#scans-that-left-something-out)).

## API

### `toHaveNoA11yViolations(received, engineOptions?, runOnly?)`

| Param | Type | Meaning |
|---|---|---|
| `received` | `Element`, `Document`, `ScanResult` or `A11yScanResult` | What to check. A DOM `Element`/`Document` is scanned automatically; an object shaped like `{ checksResults: [...] }` (such as `@surea11y/core`'s `ScanResult`) is asserted on directly, with no scan performed. Anything else throws a `TypeError`. |
| `engineOptions` | `object` (optional) | Passed straight through to `@surea11y/core`'s scan — the same options object used everywhere else in the surea11y ecosystem. See [Filtering and configuring scans](#filtering-and-configuring-scans-engineoptions) below and the engine's own [`ENGINE_OPTIONS.md`](https://github.com/SureA11y/core/blob/main/docs/ENGINE_OPTIONS.md). Ignored when `received` is already a scan result. |
| `runOnly` | `object`, `string` or `string[]` (optional) | Passed straight through as the scan's `runOnly`, `runDomRulesInPage`'s fourth argument: a WCAG target (`{ wcag: { version: '2.2', level: 'AA' } }`), `bestPractices`, rule ids or tags. See [Choosing a WCAG target](#choosing-a-wcag-target-runonly). Ignored when `received` is already a scan result. |

Returns the `{ pass, message }` shape both Jest's and Vitest's `expect.extend()` expect — you never call this directly in a test; it's wired up once via `expect.extend()` as shown in [Setup](#setup).

`pass` is `false` when any rule reports `fail`, or when the scan left out what it was asked to check ([below](#scans-that-left-something-out)).

The scan itself can throw, and the test then fails with the engine's error, which carries a `code`:

- `INVALID_RUN_ONLY` (`@surea11y/core` 1.10.0 and later): an `engineOptions` rule or tag list, or a `runOnly`, in which no value names a rule or a tag (`rules.include`, `tags.include`, a typo such as `{ tags: { include: 'wcag2.2aa' } }`), or a `runOnly.wcag` target that isn't one (`{ version: '3.0', level: 'AA' }`). It would otherwise run no rule and pass. An unknown value beside known ones is ignored with a `console.warn`.
- `INVALID_ENGINE_OPTIONS` (1.11 and later): with `strictOptions: true`, an option the engine doesn't read or a value it can't use. The message names each, with the closest known option (`unknown option "lcoale" (did you mean "locale"?)`). Without `strictOptions`, a likely typo is only warned about.
- `PAGE_BUILTINS_BROKEN` (1.11 and later): the test's or the page's own code broke a JavaScript built-in the engine relies on (`Array.prototype.filter`, `Map`, `JSON.stringify`, ...), so no result it gave could be trusted. The message names each one.

```js
// Catch a misspelt option instead of scanning without it
expect(container).toHaveNoA11yViolations({ strictOptions: true, locale: 'fr' });
```

### `installInternalsHook(win?)`

Opt-in, for web components: installs core's internals hook in the test's jsdom window, so the scan reads names, states and roles that components set through a private `ElementInternals`. Call it once in your setup file, before any component is defined. `win` defaults to the global `window`. See [Web components](#web-components-names-set-through-elementinternals).

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

Rule ids change between core releases only by addition or deprecation, never by removal within 1.x. `label-title-only`, deprecated in 1.10.0, always reports `notApplicable`; its id still resolves, so `rules: { include: 'label-title-only' }` doesn't throw, but include `form-control-programmatic-label-quality` instead.

### Choosing a WCAG target (`runOnly`)

The third argument is the scan's `runOnly`, passed to the engine as it is. `runOnly.wcag` selects by conformance target: `{ wcag: { version: '2.2', level: 'AA' } }` runs the rules for WCAG 2.2's Level A and AA criteria, by the level each criterion has in that version (4.1.1 Parsing, which 2.2 removed, is part of a `'2.1'` target and not of a `'2.2'` one). `bestPractices: true` adds the rules that name no WCAG criterion, such as `region` and `heading-order`; on its own it runs only those, and beside `engineOptions.profile` it adds them to the profile's rules. Both need `@surea11y/core` 1.11 or later.

```js
// WCAG 2.2 A and AA
expect(container).toHaveNoA11yViolations({}, { wcag: { version: '2.2', level: 'AA' } });

// The same, and the best practices
expect(container).toHaveNoA11yViolations({}, { wcag: { version: '2.2', level: 'AA' }, bestPractices: true });

// A pack's checklist profile, and the best practices
expect(container).toHaveNoA11yViolations({ packs: [acmePolicy], profile: 'acme-web-2026' }, { bestPractices: true });
```

**Gating on a level when you pick rules yourself.** `engineOptions.wcagLevel` (`@surea11y/core` 1.12.0 and later) sets the WCAG level of the criteria a scan reports, without changing which rules run. A target already implies its level; this is for a test that names rules or tags. `contrast-computable` checks 1.4.3 (AA) and 1.4.6 (AAA), so the scan below reports only 1.4.3:

```js
expect(container).toHaveNoA11yViolations({ wcagLevel: 'AA' }, { includeRuleIds: ['contrast-computable'] });
```

The assertion gates on `fail` outcomes, so this changes the criteria in the result (`rulesResults`, what a report built from it shows) rather than what fails the test.

`runOnly` also takes rule ids and tags (`includeRuleIds`, `tags`, `excludeRuleIds`, ...), which add to a target's rules; the excludes apply after. A `runOnly` that selects anything replaces the selection in `engineOptions.rules`/`.tags` outright, so `{ rules: { include: 'img-alt-present' } }` beside a WCAG target runs the whole target: give a selection one way or the other, not both. Pass `{}` or `null` as `engineOptions` when you only need `runOnly`.

For the complete, current option surface (locale, contrast modes, shadow DOM, custom rules, WCAG-version tag combinations, etc.), see [`ENGINE_OPTIONS.md`](https://github.com/SureA11y/core/blob/main/docs/ENGINE_OPTIONS.md) — this package doesn't duplicate or reinterpret that reference, it just forwards whatever you pass.

### Checking against EN 301 549

EN 301 549, the standard the European Accessibility Act refers to, restates WCAG's Level A and AA criteria in its chapter 9. `engineOptions.profile` runs the rules for its version, and each finding in the scan result carries its EN 301 549 clause beside its WCAG criterion, in `meta.normativeMappings` (WCAG 1.1.1 is clause 9.1.1.1):

```js
// EN 301 549 V4.1.1 (WCAG 2.2 A and AA); 'en301549-v3.2.1' for V3.2.1 (WCAG 2.1 A and AA)
expect(container).toHaveNoA11yViolations({ profile: 'en301549-v4.1.1' });
```

As with any target, passing means no rule found a violation, not that the component conforms: most criteria need a person to check them (see [What it checks and doesn't](#what-it-checks-and-doesnt)). A profile name core doesn't know is not an error: the scan runs without it and core logs a `console.warn`.

## Scanning with packs: standards, checklists and your own rules

A pack brings rules, variants of core's rules, a standard or a checklist, and their profiles and messages, from a package of its own: a national standard such as RGAA, or your organisation's accessibility policy. `@surea11y/core` runs a pack as it runs its own rules and standards, so its findings, rollups and failure messages look like core's. Packs need `@surea11y/core` 1.11.1 or later.

The matcher scans in Node, so a pack is passed as the object itself, in `engineOptions.packs`, and its profile is chosen with `engineOptions.profile`:

```js
const acmePolicy = require('@acme/a11y-policy'); // a pack

test('the page meets the Acme web policy', () => {
  document.body.innerHTML = '<main><h1>Welcome</h1><video autoplay src="intro.mp4"></video></main>';
  expect(document).toHaveNoA11yViolations({ packs: [acmePolicy], profile: 'acme-web-2026' });
  // fails: acme-no-autoplay (serious): This video plays with sound as the page opens.
});
```

A pack's own rules appear in the result like core's, with ids that start with its namespace (`acme-no-autoplay`). Without its profile, a pack's rules run only when selected, by id (`rules: { include: 'acme-no-autoplay' }`) or by a tag. List several packs in the array to scan with them all. Keep the pack objects in one place (a setup file or a module): core prepares an engine for each set of pack objects and keeps it for the next scan with the same ones.

**Writing a pack.** A pack is an object made with `definePack` from `@surea11y/core/pack`. [`examples/acme-policy-pack.js`](./examples/acme-policy-pack.js) is a small one: a house rule, a checklist profile (WCAG 2.2 A and AA, `region`, and the house rule) and two checklist items. [`examples/pack.test.js`](./examples/pack.test.js) (Jest) and [`examples/pack.vitest.test.js`](./examples/pack.vitest.test.js) (Vitest) use it as a test gate. For a pack of your own, `npx surea11y-pack new <folder>` (from `@surea11y/core`) writes a package that works as generated, with its tests, docs and lint; core's [`PACKS.md`](https://github.com/SureA11y/core/blob/main/docs/PACKS.md) is the guide.

**When a pack doesn't run.** A pack core can't run (its `core` range leaves out the installed core, it isn't valid, or its namespace clashes with another pack's) is left out of the scan and listed in the result's `skippedPacks` with the reason. The matcher fails on it ([below](#scans-that-left-something-out)) rather than passing with the pack's rules never run. Install the pack beside this package, so npm resolves one `@surea11y/core` for both.

## What it checks and doesn't

`fail` outcomes gate the assertion — matching every other surea11y binding's convention that `cantTell` results are advisory (need human review), not failures. If a scan produces `cantTell` results, they're still surfaced in the failure message when the assertion *does* fail for other reasons, but they never cause a passing test to fail on their own:

```js
test('cantTell rules do not fail a passing test', () => {
  document.body.innerHTML = '<a href="/pricing">Click here</a>'; // vague link text: link-name-quality reports cantTell, not fail
  expect(document.body).toHaveNoA11yViolations();
});
```

Being explicit about the boundaries of automation is part of surea11y's design — it will not, for example, confirm alt text is *meaningful* (only that it's present), judge color contrast aesthetically (only whether it meets the ratio), or detect a keyboard focus trap (that requires simulating real interaction over time). Those are exactly the cases reported as `cantTell` rather than guessed at. See the engine's [`LIMITATIONS.md`](https://github.com/SureA11y/core/blob/main/docs/LIMITATIONS.md) for the full list.

### Scans that left something out

A scan can come back with nothing failed because it checked nothing. Since `@surea11y/core` 1.10.0 the result says so, and the matcher fails on it (the `surea11y` CLI likewise exits with code 2 on a scope that matches nothing):

- **The element is not in the document the scan runs in** — detached (created with `document.createElement()` and never appended), or from another document. The scan runs on the global `document`, so it finds nothing to scan. Before core 1.10.0 it fell back to scanning the whole page instead. Attach the element before asserting. The same applies to a precomputed result whose `contextMatch.elementCount` is 0.
- **A custom rule did not run** (`engineOptions.customRules`: no id, a `runInPage` that isn't a function, an invalid `meta`, a duplicate id). The result lists it in `skippedCustomRules`, and the message names it with the reason.

  A custom rule your test turns off itself is not a gap, and doesn't fail the assertion. Core lists it in `skippedCustomRules` too, with `excluded: true` (`@surea11y/core` 1.12.0 and later):

  ```js
  // Two house rules; this test doesn't want org-b
  expect(container).toHaveNoA11yViolations(
    { customRules: [orgA, orgB] },
    { includeRuleIds: ['org-a', 'org-b'], excludeRuleIds: ['org-b'] }
  ); // passes when org-a finds nothing
  ```
- **A pack did not run** (`engineOptions.packs`, `@surea11y/core` 1.11 and later): its `core` range leaves out the installed core, it isn't valid, or its namespace clashes with another pack's. The result lists it in `skippedPacks`, and the message names it with the reason, so the assertion can't pass with the pack's rules never run.

These are the gap kinds binding-base's `getScanGaps()` reports as `'context-not-found'`, `'custom-rule-skipped'` and `'pack-skipped'`; the fourth, `'context-partly-not-found'`, is only reported.

A precomputed result whose scope was only partly found (several selectors, some matching nothing) is not failed for it: the rest was scanned. The message names the missing selectors whenever it is shown.

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

- **Any `Element`** (React Testing Library's `container`, `document.body`, etc.) is inherently a scoped subtree, so these rules report `notApplicable` rather than `fail` — a missing `<title>` never breaks a component-level test. Since `@surea11y/core` 1.10.0 the same goes for rules that compare elements across the page, such as `landmark-unique`, `heading-order`, `accesskeys` and `identical-links-same-purpose`: a scoped scan can't know what sits outside the element, so they report `notApplicable` rather than `pass`. What they find inside the element is still reported.
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

## Web components: names set through `ElementInternals`

Many web components keep their `ElementInternals` in a private field and name themselves, set their states or give themselves a role through it:

```js
class SubscribeCheckbox extends HTMLElement {
  #internals = this.attachInternals();
  constructor() {
    super();
    this.#internals.ariaLabel = 'Subscribe';
    this.#internals.ariaChecked = 'false';
  }
}
```

No script can read those back, so by default the scan asks about such an element (`cantTell`) instead of judging it. That doesn't fail the test, but nothing is checked either, and a role set this way isn't seen at all. A failure message says when it happened: `1 custom element was asked about because the scan could not read the name or states they set through ElementInternals...`.

`installInternalsHook()` lets the scan read them. Call it in the setup file, before any component is defined, so it sees every `attachInternals()` call:

<table>
<tr><th>Jest</th><th>Vitest</th></tr>
<tr valign="top"><td>

```js
// jest.setup.js
const {
  toHaveNoA11yViolations,
  installInternalsHook
} = require('@surea11y/test-matchers');

installInternalsHook();
expect.extend({ toHaveNoA11yViolations });
```

</td><td>

```js
// vitest.setup.js
import { expect } from 'vitest';
import {
  toHaveNoA11yViolations,
  installInternalsHook
} from '@surea11y/test-matchers';

installInternalsHook();
expect.extend({ toHaveNoA11yViolations });
```

</td></tr>
</table>

With it, the checkbox above passes: the scan reads its name and its `aria-checked`. A component that attaches internals but sets no name fails like any unnamed control, and a component that is a `switch` only through its internals (`this.#internals.role = 'switch'`) is checked as one, so it fails without a name. To see it worked, look at a scan result's `engine.environment.internalsHook`, which is `'early'` (or `'late'`, see below) once the hook is installed, and absent without it.

Things to know:

- **Before any component is defined.** An element that attached its internals before the hook isn't in its record. The setup file runs before your test file imports any component, so call it there, not in a test.
- **It changes the test window.** It wraps `HTMLElement.prototype.attachInternals` (the component gets the same internals back), and keeps a record under a global symbol. That's harmless in a test, and it's why the hook is opt-in.
- **Jest's jsdom.** `jest-environment-jsdom` 30 ships jsdom 26, where a component that sets an ARIA property on its internals (`internals.ariaLabel = ...`) throws, hook or not. Vitest with jsdom 29 handles it. With Jest, the hook still lets the scan tell that a component which never attached internals has none.
- **Vitest and `'late'`.** Under Vitest, `@surea11y/core` 1.12.0 records the hook as `'late'`, though it ran first, because Vitest defines the window's globals differently from a page. Names and states set through internals are still read; a component that never attached internals stays a question until core reads Vitest's window as it reads a page's.

## Failure messages

When the assertion fails, the message lists every occurrence (not just every rule — one rule can flag several elements), with the rule ID, severity, a human-readable summary, the failing element's selector, and a fix hint where available. It names the `@surea11y/core` release that produced the result, to quote in a bug report:

```
expected no accessibility violations, but found 1:

1) img-alt-present (serious): This <img> has no alt attribute.
   at body > img
   Add an alt attribute that says what the image shows, or alt="" if the image is purely decorative.

Scanned with @surea11y/core 1.12.0.

1 rule(s) need manual review (cantTell, not counted as failures): manual-review
```

An element inside a shadow root (with `engineOptions.includeShadowDom`) is located through its shadow hosts, outermost first: `at #host >>> img`.

Before the version line, the message can carry a note on how the scan ran. Today that's the [internals hook](#web-components-names-set-through-elementinternals): when the scan asked about custom elements it could have read with it, a line says how many and to install it.

The last line is the `cantTell` note: any `cantTell` results alongside the failures are appended as a separate note so they stay visible without affecting `pass`/`fail`. With a vague link beside the image (`<a href="/pricing">Click here</a>`), it reads:

```
3 rule(s) need manual review (cantTell, not counted as failures): contrast-computable, link-name-quality, manual-review
```

A scan that left something out says what, in place of findings:

```
expected no accessibility violations, but the scan left out what it was asked to check:

The element given to toHaveNoA11yViolations() is not in the document the scan runs in (it is detached, or belongs to another document), so nothing in it was checked. Attach it to the document before asserting.

Nothing was scanned: the scan scope matched no element ("[data-surea11y-jest-scope=\"…\"]").

Scanned with @surea11y/core 1.12.0.
```

A pack that did not run is named with the reason; the findings line above it covers the rules that did run:

```
expected no accessibility violations, but the scan left out what it was asked to check:

No accessibility violations found in what was scanned.

Pack "@acme/a11y-policy" did not run: it supports core ^2.0.0, and this is core 1.12.0.

Scanned with @surea11y/core 1.12.0.

2 rule(s) need manual review (cantTell, not counted as failures): contrast-computable, manual-review
```

## Upgrading to `@surea11y/core` 1.12

This release requires `@surea11y/core` 1.12.0. What changes for a test (core's [`CHANGELOG.md`](https://github.com/SureA11y/core/blob/main/CHANGELOG.md) has the full list):

- **An empty heading now fails a default call.** `empty-heading` used to ask about a heading with no accessible name; it now fails it. It's a best-practice rule, and a call with no selection runs best practices, so a component that renders `<h2></h2>` (often a heading whose text comes from a prop that's empty in the test) now fails:

  ```js
  render(<Card title="" />);
  expect(container).toHaveNoA11yViolations(); // fails: empty-heading
  ```

  That's a real barrier: a screen reader announces a heading with nothing in it. Give the test real content, or fix the component. To check WCAG only, which leaves best practices out, pass a target:

  ```js
  expect(container).toHaveNoA11yViolations({}, { wcag: { version: '2.2', level: 'AA' } });
  ```

  Turning the one rule off also works, but it hides the barrier for every heading in the test, so prefer the fixes above:

  ```js
  expect(container).toHaveNoA11yViolations({}, { excludeRuleIds: ['empty-heading'] });
  ```

  A heading whose name may come from content no script can read is still asked about, which doesn't fail the test.
- **Unnamed custom elements are questions, not failures.** A defined custom element with no visible name may name itself through `ElementInternals`, so it's now `cantTell` where it used to fail. A test that expected such a failure passes now; [`installInternalsHook()`](#web-components-names-set-through-elementinternals) lets the scan decide.
- **A custom rule your test excludes no longer fails it** as "did not run" ([above](#scans-that-left-something-out)).
- **`engineOptions.wcagLevel`** sets the level of the criteria reported, without changing which rules run ([above](#choosing-a-wcag-target-runonly)).
- **Rule ids in another case select their rule**: `includeRuleIds: ['IMG-ALT-PRESENT']` used to throw `INVALID_RUN_ONLY`.
- **`runOnly.optInTags` on its own throws** `INVALID_RUN_ONLY`; it was accepted and did nothing. Opt-in rules are unlocked with `engineOptions.optInRules`.
- **An inline `policyContract` with an unknown value** in `allowedOutcomes` drops that value with a warning. It used to turn every check into `cantTell`, which made every assertion pass.
- **Messages:** a failure message can carry a note about the [internals hook](#web-components-names-set-through-elementinternals).

## What changes with `@surea11y/core` 1.11

The matcher passes `engineOptions` and `runOnly` through to the engine, so these show in results without a change here (see core's [`CHANGELOG.md`](https://github.com/SureA11y/core/blob/main/CHANGELOG.md) for the full list):

- **Messages are reworded** in all five languages to say plainly what is wrong and what to do (`This <img> has no alt attribute.`). Message keys, rule ids and reason codes are unchanged; a test that matches message text needs the new wording.
- **Packs** run in a scan, from `engineOptions.packs` ([above](#scanning-with-packs-standards-checklists-and-your-own-rules)), and a pack that did not run fails the assertion.
- **WCAG targets and best practices** can be chosen with `runOnly.wcag` and `runOnly.bestPractices`, the matcher's third argument ([above](#choosing-a-wcag-target-runonly)).
- **`aria-hidden-focus` maps to 4.1.2 only**, no longer to 2.4.7 Focus Visible, so `{ tags: { include: 'wcag2aa' } }` alone no longer selects it.
- **A custom rule counts toward its WCAG criterion.** A `customRules` rule with `meta.wcagSc` (or a WCAG `normativeMappings` entry) fails that criterion's rollup when it fails, and custom and pack rules run after core's, with read-only helpers.
- **On/off options read as meant**: `{ includeShadowDom: 'false' }` is off, where it was on. `strictOptions: true` rejects any option the engine doesn't read, and a rule selection whose includes and excludes cancel out, which runs no rule, is warned about (see [the API](#tohavenoa11yviolationsreceived-engineoptions-runonly)).
- **Under jsdom**, a font size given as a keyword (`xx-large`) or a `calc()` is read as a browser reads it, where the contrast rules read it as 0px; contrast still runs in `visibilityMode: 'styleOnly'`, since jsdom has no layout.


## Examples

Runnable, side-by-side examples for both frameworks live in [`examples/`](./examples): [`basic.test.js`](./examples/basic.test.js) (Jest) and [`basic.vitest.test.js`](./examples/basic.vitest.test.js) (Vitest) — same two assertions, same matcher, only the registration syntax differs — and [`pack.test.js`](./examples/pack.test.js) and [`pack.vitest.test.js`](./examples/pack.vitest.test.js), the same with the [`acme-policy-pack.js`](./examples/acme-policy-pack.js) pack and its profile. To try them locally:

```sh
npm install
npm test          # runs both suites
npm run test:jest    # Jest only
npm run test:vitest  # Vitest only
```

## Tests

This package tests itself under both frameworks it supports:

- [`tests/matcher.test.js`](./tests/matcher.test.js) and [`tests/scan-element.test.js`](./tests/scan-element.test.js) — the exhaustive logic suite (rule scoping, document-wide rules, `cantTell` handling, scans that left something out, packs that run and packs that don't, shadow-DOM locations, `engineOptions` and `runOnly` passthrough, WCAG targets and best practices, `INVALID_RUN_ONLY` and `INVALID_ENGINE_OPTIONS`, thrown-input validation, mocked-throw cleanup), run under Jest since this is where the underlying logic lives; it doesn't depend on which framework eventually calls it.
- [`tests/internals-hook.test.js`](./tests/internals-hook.test.js) and [`tests/internals-hook.vitest.test.js`](./tests/internals-hook.vitest.test.js) — `installInternalsHook()` under each runner: under Jest, the hook records itself early and a component with no internals is no longer a question; under Vitest, a component that names itself through private internals passes.
- [`tests/types.test.js`](./tests/types.test.js) — compiles [`tests/types/usage.ts`](./tests/types/usage.ts) with `tsc --strict` against `@surea11y/core`'s own types, so the bundled `.d.ts` can't drift from the engine's.
- [`tests/matcher.vitest.test.js`](./tests/matcher.vitest.test.js) — proves the same matcher, completely unmodified, integrates correctly with Vitest's own `expect.extend` (registration, `.not`, `engineOptions` and `runOnly` passthrough, packs, precomputed-result assertions, thrown `TypeError`), so this isn't just a documentation claim.

## Related

- [`@surea11y/core`](https://github.com/SureA11y/core) — the underlying accessibility engine (rule catalog, output schema, engine options).
- [`@surea11y/cli`](https://github.com/SureA11y/cli) — the `surea11y` command-line scanner, for checking built HTML outside a test runner.
- [`@surea11y/binding-base`](https://github.com/SureA11y/binding-base) — shared, framework-agnostic helpers (like `formatFailures`) reused across surea11y's test-framework bindings.

## Maintainer

Maintained by [Jorge Rumoroso](https://github.com/rumoroso).

## License

MIT — see [`LICENSE`](./LICENSE).

This package depends on [`@surea11y/core`](https://github.com/SureA11y/core), which is MPL-2.0. MPL-2.0's copyleft is file-level and applies only to `@surea11y/core`'s own source files; consuming it as a normal package dependency doesn't affect this package's license.
