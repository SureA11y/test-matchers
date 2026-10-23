'use strict';

// The severity gate: toHaveNoA11yViolations()'s third argument and
// configureA11yMatchers({ failOnSeverity }). Needs @surea11y/binding-base
// 1.6.0 (getGatingFailures); skipped with an older one.

const { toHaveNoA11yViolations, configureA11yMatchers } = require('../src/index');

const HAS_GATE = typeof require('@surea11y/binding-base').getGatingFailures === 'function';
const describeGate = HAS_GATE ? describe : describe.skip;

expect.extend({ toHaveNoA11yViolations });

const result = {
  checksResults: [
    { ruleId: 'aria-allowed-attr', title: 'ARIA', outcome: 'fail', severity: 'moderate', occurrences: [{ selector: 'div', summary: 'Not allowed.' }] },
    { ruleId: 'empty-heading', title: 'Headings', outcome: 'fail', severity: 'minor', occurrences: [{ selector: 'h2', summary: 'Empty.' }] },
    { ruleId: 'page-title-present', title: 'Title', outcome: 'pass', severity: 'serious', occurrences: [] }
  ]
};
const withSerious = {
  checksResults: [
    ...result.checksResults,
    { ruleId: 'img-alt-present', title: 'Images', outcome: 'fail', severity: 'serious', occurrences: [{ selector: 'img', summary: 'No alt.' }] }
  ]
};

describeGate('failOnSeverity', () => {
  afterEach(() => configureA11yMatchers(null));

  test('per assertion: failures below the level pass; one at the level fails, and the message marks the rest', () => {
    expect(result).not.toHaveNoA11yViolations();
    expect(result).toHaveNoA11yViolations(null, null, { failOnSeverity: 'serious' });
    const { pass, message } = toHaveNoA11yViolations(withSerious, null, null, { failOnSeverity: 'serious' });
    expect(pass).toBe(false);
    expect(message()).toMatch(/of severity serious or above, but found 1:/);
    expect(message()).toMatch(/img-alt-present \(serious\): No alt\./);
    expect(message()).toMatch(/aria-allowed-attr \(moderate, below failOnSeverity serious, does not fail the test\)/);
  });

  test('a default from configureA11yMatchers(), which an assertion overrides, or turns off with null', () => {
    configureA11yMatchers({ failOnSeverity: 'serious' });
    expect(result).toHaveNoA11yViolations();
    expect(result).not.toHaveNoA11yViolations(null, null, { failOnSeverity: 'minor' });
    expect(result).not.toHaveNoA11yViolations(null, null, { failOnSeverity: null });
    configureA11yMatchers({ failOnSeverity: 'critical' });
    expect(withSerious).toHaveNoA11yViolations();
    configureA11yMatchers(null);
    expect(result).not.toHaveNoA11yViolations();
  });

  test('a level or an option that is not one is a TypeError', () => {
    expect(() => configureA11yMatchers({ failOnSeverity: 'high' })).toThrow(/must be "critical", "serious", "moderate" or "minor", not "high"/);
    expect(() => configureA11yMatchers({ failOnSeverty: 'serious' })).toThrow(/no option named "failOnSeverty"/);
    expect(() => toHaveNoA11yViolations(result, null, null, { failOnSeverity: 3 })).toThrow(TypeError);
    expect(() => toHaveNoA11yViolations(result, null, null, 'serious')).toThrow(TypeError);
  });
});
