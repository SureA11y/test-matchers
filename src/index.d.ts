// Minimal type declarations -- no @types/jest or vitest import, so this
// package doesn't force a specific version of either on consumers. The scan
// result and engine options come from @surea11y/core's own types (shipped
// since core 1.9.0), so they stay in step with the engine. Both
// augmentation blocks below are verified safe to ship unconditionally,
// regardless of which (if either) testing framework a given consumer
// actually has installed:
//
//   - `declare module '@vitest/expect'` (Vitest's own home for the Assertion/
//     AsymmetricMatchersContaining interfaces as of Vitest 3+) is a no-op if
//     '@vitest/expect' is never resolved -- TypeScript only needs to merge it
//     if some other file in the program actually imports that module.
//   - `declare global { namespace jest { ... } }` likewise only takes effect
//     if something (e.g. @types/jest) already put a `jest` global in scope;
//     otherwise it just introduces an unused ambient namespace.
//
// So a consumer using only one framework -- or neither, e.g. a plain Node
// test runner calling toHaveNoA11yViolations() directly -- never sees an
// error from the other framework's block.

import type {
  Announcement,
  EngineOptions,
  LegacyTagRunOnly,
  RunOnly,
  ScanResult,
  StrictEngineOptions,
  StringList
} from '@surea11y/core';

export type { Announcement, EngineOptions, RunOnly, ScanResult, StrictEngineOptions };

/** core's 4th scan argument: a WCAG target, best practices, rule ids or tags. */
export type A11yRunOnly = RunOnly | LegacyTagRunOnly | StringList;

/**
 * What toHaveNoA11yViolations() reads from a precomputed result. Any
 * @surea11y/core ScanResult fits; so does a hand-built object with just
 * `checksResults`. A result whose `contextMatch.elementCount` is 0, or that
 * lists `skippedCustomRules` (@surea11y/core 1.10.0 and later) or
 * `skippedPacks` (1.11 and later), fails the assertion. A custom rule the
 * test excluded itself (`excluded: true`, core 1.12.0) doesn't.
 */
export interface A11yScanResult {
  checksResults: ReadonlyArray<{ ruleId: string; outcome: string; severity?: string; occurrences: readonly unknown[] }>;
  /** How the scan's contextSelector resolved; null without one. */
  contextMatch?: { elementCount: number; unmatchedSelectors: string[] } | null;
  /** Custom rules that did not run, and why; `excluded` when the test's own selection left the rule out. */
  skippedCustomRules?: Array<{ id: string | null; reason: string; excluded?: true }>;
  /** Packs that did not run, and why. */
  skippedPacks?: Array<{ name: string | null; reason: string }>;
  /** `version` is the @surea11y/core release that produced the result. */
  engine?: { version?: string; [key: string]: unknown };
  [key: string]: unknown;
}

/**
 * toHaveNoA11yViolations()'s options form, in place of (engineOptions,
 * runOnly). Failures gate the assertion, counted by each occurrence's own
 * outcome; questions (cantTell) don't, unless `leanFail` adds those that
 * lean fail.
 */
export interface A11yMatcherOptions {
  /** core's third scan argument. Ignored for a precomputed result. */
  engineOptions?: EngineOptions | StrictEngineOptions | null;
  /** core's fourth scan argument. Ignored for a precomputed result. */
  runOnly?: A11yRunOnly | null;
  /**
   * Also fail on the questions that lean fail (core's leaningFailures(),
   * @surea11y/core 1.14.0 and later), leaving out the rules whose WCAG
   * criteria are all outside the scan's target. Default: false.
   */
  leanFail?: boolean;
  /** With leanFail: only the questions of rules mapped to a WCAG criterion in the target. */
  wcagOnly?: boolean;
  /** List every question in the failure message in full, with the steps that answer it. */
  howToCheck?: boolean;
}

export function toHaveNoA11yViolations(
  received: Node | ScanResult | A11yScanResult,
  engineOptions?: EngineOptions | StrictEngineOptions | null,
  runOnly?: A11yRunOnly | null
): { pass: boolean; message: () => string };
export function toHaveNoA11yViolations(
  received: Node | ScanResult | A11yScanResult,
  options: A11yMatcherOptions
): { pass: boolean; message: () => string };

export interface ToHaveAnnouncedOptions {
  /**
   * Also count a text given to a region behind an open modal dialog, which
   * assistive technology did not get. Default: false.
   */
  includeBehindModal?: boolean;
}

/**
 * Passes when a live region was given `expected` (the whole text, as a
 * string, or a RegExp; anything, when left out), as core's live-region
 * hook recorded it (getAnnouncements(), @surea11y/core 1.14.0 and later).
 * On an element, only the regions it is or contains count. Throws without
 * the hook: call installLiveRegionHook() in a setup file.
 */
export function toHaveAnnounced(
  received: Window | Document | Element,
  expected?: string | RegExp,
  options?: ToHaveAnnouncedOptions
): { pass: boolean; message: () => string };

/**
 * Installs @surea11y/core's internals hook in the test's jsdom window, so a
 * scan reads the names, states and roles web components set through a
 * private ElementInternals. Call it in a setup file, before any component is
 * defined. `win` defaults to the global `window`.
 */
export function installInternalsHook(win?: Window): void;

/**
 * Installs @surea11y/core's listener hook (1.14.0 and later) in the test's
 * jsdom window, so the keyboard rules see the click, key, focus and mouse
 * listeners added from script. Call it in a setup file, before any code
 * under test adds a listener. `win` defaults to the global `window`.
 */
export function installListenerHook(win?: Window): void;

/**
 * Installs @surea11y/core's live-region hook (1.14.0 and later) in the
 * test's jsdom window, so a scan sees what live regions were given and
 * toHaveAnnounced() can read it. Call it in a setup file. `win` defaults
 * to the global `window`.
 */
export function installLiveRegionHook(win?: Window): void;

interface A11yCustomMatchers<R = unknown> {
  toHaveNoA11yViolations(engineOptions?: EngineOptions | StrictEngineOptions | null, runOnly?: A11yRunOnly | null): R;
  toHaveNoA11yViolations(options: A11yMatcherOptions): R;
  toHaveAnnounced(expected?: string | RegExp, options?: ToHaveAnnouncedOptions): R;
}

declare global {
  namespace jest {
    interface Matchers<R> extends A11yCustomMatchers<R> {}
  }
}

declare module '@vitest/expect' {
  interface Assertion<T = any> extends A11yCustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends A11yCustomMatchers {}
}
