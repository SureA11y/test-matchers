// Compiled, not run, by tests/types.test.js: this package's hand-written
// types against @surea11y/core's own, as a test suite uses them.
import { runDomRulesInPage } from '@surea11y/core';
import type { ScanResult } from '@surea11y/core';
import { definePack } from '@surea11y/core/pack';
import { toHaveNoA11yViolations } from '../../src/index';
import type { A11yRunOnly, A11yScanResult, EngineOptions, StrictEngineOptions } from '../../src/index';

declare const container: HTMLElement;

const options: EngineOptions = { rules: { include: 'img-alt-present' }, includeShadowDom: true };
const scoped = toHaveNoA11yViolations(container, options);
const whole = toHaveNoA11yViolations(document, { tags: { include: ['wcag2a', 'wcag2aa'] } });

const pack = definePack({ name: '@acme/a11y-policy', version: '1.0.0', namespace: 'acme', core: '^1.11.1' });
const withPack = toHaveNoA11yViolations(document, { packs: [pack], profile: 'acme-web-2026' });
const wcag22: A11yRunOnly = { wcag: { version: '2.2', level: 'AA' }, bestPractices: true };
const targeted = toHaveNoA11yViolations(container, null, wcag22);
const byTag = toHaveNoA11yViolations(container, {}, ['wcag2a', 'wcag2aa']);
const strict: StrictEngineOptions = { strictOptions: true, locale: 'fr' };
const strictScan = toHaveNoA11yViolations(container, strict);

const result: ScanResult = runDomRulesInPage(null, '#main', {}, null);
const reused = toHaveNoA11yViolations(result);

const handBuilt: A11yScanResult = {
  checksResults: [{ ruleId: 'img-alt-present', outcome: 'fail', occurrences: [] }],
  contextMatch: { elementCount: 0, unmatchedSelectors: ['#app'] },
  skippedCustomRules: [{ id: null, reason: 'no id' }],
  skippedPacks: [{ name: '@acme/a11y-policy', reason: 'it supports core ^2.0.0, and this is core 1.11.1' }],
  engine: { version: '1.11.1' }
};
const fromObject = toHaveNoA11yViolations(handBuilt);

const passed: boolean =
  scoped.pass && whole.pass && withPack.pass && targeted.pass && byTag.pass && strictScan.pass && reused.pass && fromObject.pass;
const message: string = scoped.message();

export { passed, message };
