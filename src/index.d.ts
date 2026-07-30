// Minimal, dependency-free type declarations -- no @types/jest or vitest
// import, so this package doesn't force a specific version of either on
// consumers. Both augmentation blocks below are verified safe to ship
// unconditionally, regardless of which (if either) testing framework a given
// consumer actually has installed:
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

export interface A11yScanResult {
  checksResults: Array<{ ruleId: string; outcome: string; severity?: string; occurrences: unknown[] }>;
  [key: string]: unknown;
}

export function toHaveNoA11yViolations(
  received: Node | A11yScanResult,
  engineOptions?: Record<string, unknown>
): { pass: boolean; message: () => string };

interface A11yCustomMatchers<R = unknown> {
  toHaveNoA11yViolations(engineOptions?: Record<string, unknown>): R;
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
