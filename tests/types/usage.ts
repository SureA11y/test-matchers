// Compiled, not run, by tests/types.test.js: this package's hand-written
// types against @surea11y/core's own, as a test suite uses them.
import { runDomRulesInPage } from '@surea11y/core';
import type { ScanResult } from '@surea11y/core';
import { toHaveNoA11yViolations } from '../../src/index';
import type { A11yScanResult, EngineOptions } from '../../src/index';

declare const container: HTMLElement;

const options: EngineOptions = { rules: { include: 'img-alt-present' }, includeShadowDom: true };
const scoped = toHaveNoA11yViolations(container, options);
const whole = toHaveNoA11yViolations(document, { tags: { include: ['wcag2a', 'wcag2aa'] } });

const result: ScanResult = runDomRulesInPage(null, '#main', {}, null);
const reused = toHaveNoA11yViolations(result);

const handBuilt: A11yScanResult = {
  checksResults: [{ ruleId: 'img-alt-present', outcome: 'fail', occurrences: [] }],
  contextMatch: { elementCount: 0, unmatchedSelectors: ['#app'] },
  skippedCustomRules: [{ id: null, reason: 'no id' }],
  engine: { version: '1.10.0' }
};
const fromObject = toHaveNoA11yViolations(handBuilt);

const passed: boolean = scoped.pass && whole.pass && reused.pass && fromObject.pass;
const message: string = scoped.message();

export { passed, message };
