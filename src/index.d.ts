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

import type { EngineOptions, LegacyTagRunOnly, RunOnly, ScanResult, StrictEngineOptions, StringList } from '@surea11y/core';

export type { EngineOptions, RunOnly, ScanResult, StrictEngineOptions };

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

export function toHaveNoA11yViolations(
  received: Node | ScanResult | A11yScanResult,
  engineOptions?: EngineOptions | StrictEngineOptions | null,
  runOnly?: A11yRunOnly | null,
  options?: A11yMatcherOptions | null
): { pass: boolean; message: () => string };

/** A rule result's severity, least to most severe. */
export type A11ySeverity = 'minor' | 'moderate' | 'serious' | 'critical';

export interface A11yMatcherOptions {
  /**
   * Only failing rules of this severity or above fail the assertion, as
   * `surea11y scan --fail-on-severity` counts them; the message still lists
   * every failure, marking those below the level. null turns a configured
   * default off for one assertion. Needs @surea11y/binding-base 1.6.0.
   */
  failOnSeverity?: A11ySeverity | null;
}

/**
 * Sets what every toHaveNoA11yViolations() assertion uses by default, from a
 * setup file. An assertion's own options override it. null clears it.
 */
export function configureA11yMatchers(options: A11yMatcherOptions | null): void;

/**
 * Installs @surea11y/core's internals hook in the test's jsdom window, so a
 * scan reads the names, states and roles web components set through a
 * private ElementInternals. Call it in a setup file, before any component is
 * defined. `win` defaults to the global `window`.
 */
export function installInternalsHook(win?: Window): void;

/**
 * Installs @surea11y/core's listener hook (core 1.14.0 and later) in the
 * test's jsdom window, so the keyboard rules see the listeners the code under
 * test adds from script. Call it in a setup file, before that code adds any.
 * `win` defaults to the global `window`.
 */
export function installListenerHook(win?: Window): void;

/**
 * Installs @surea11y/core's live-region hook (core 1.14.0 and later) in the
 * test's jsdom window, which records what live regions are given, for
 * toHaveAnnounced(). Call it in a setup file. `win` defaults to the global
 * `window`.
 */
export function installLiveRegionHook(win?: Window): void;

/**
 * Passes when a live region in `received` (an element, or a document for the
 * whole page) was given a text that contains `expected` (whitespace
 * collapsed) or matches it, as the live-region hook recorded it: what the
 * page made available to announce, not what a screen reader said. Fails,
 * saying so, without the hook.
 */
export function toHaveAnnounced(
  received: Node,
  expected: string | RegExp
): { pass: boolean; message: () => string };

interface A11yCustomMatchers<R = unknown> {
  toHaveNoA11yViolations(
    engineOptions?: EngineOptions | StrictEngineOptions | null,
    runOnly?: A11yRunOnly | null,
    options?: A11yMatcherOptions | null
  ): R;
  toHaveAnnounced(expected: string | RegExp): R;
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
