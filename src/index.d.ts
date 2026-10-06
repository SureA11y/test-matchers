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

import type { EngineOptions, ScanResult } from '@surea11y/core';

export type { EngineOptions, ScanResult };

/**
 * What toHaveNoA11yViolations() reads from a precomputed result. Any
 * @surea11y/core ScanResult fits; so does a hand-built object with just
 * `checksResults`. A result whose `contextMatch.elementCount` is 0, or that
 * lists `skippedCustomRules`, fails the assertion (@surea11y/core 1.10.0
 * and later).
 */
export interface A11yScanResult {
  checksResults: ReadonlyArray<{ ruleId: string; outcome: string; severity?: string; occurrences: readonly unknown[] }>;
  /** How the scan's contextSelector resolved; null without one. */
  contextMatch?: { elementCount: number; unmatchedSelectors: string[] } | null;
  /** Custom rules that did not run, and why. */
  skippedCustomRules?: Array<{ id: string | null; reason: string }>;
  /** `version` is the @surea11y/core release that produced the result. */
  engine?: { version?: string; [key: string]: unknown };
  [key: string]: unknown;
}

export function toHaveNoA11yViolations(
  received: Node | ScanResult | A11yScanResult,
  engineOptions?: EngineOptions
): { pass: boolean; message: () => string };

interface A11yCustomMatchers<R = unknown> {
  toHaveNoA11yViolations(engineOptions?: EngineOptions): R;
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
