'use strict';

// The severity gate: failOnSeverity in toHaveNoA11yViolations()'s options
// (its options form, or the third argument after engineOptions and
// runOnly), and the defaults configureA11yMatchers() sets.

const { toHaveNoA11yViolations, configureA11yMatchers } = require('../src/index');

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

describe('failOnSeverity', () => {
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
    expect(() => configureA11yMatchers({ wcagOnly: true })).toThrow(/wcagOnly narrows leanFail/);
  });

  test('the options form takes it too, beside leanFail', () => {
    expect(result).toHaveNoA11yViolations({ failOnSeverity: 'serious' });
    expect(withSerious).not.toHaveNoA11yViolations({ failOnSeverity: 'serious' });
    expect(() => toHaveNoA11yViolations(result, { failOnSeverity: 'serious' }, null, {})).toThrow(/inside the options object/);
  });

  test('a likely failure below the level stays a question', () => {
    const question = { selector: 'h3', summary: 'Skips a level.', lean: { toward: 'fail', why: 'It skips.' } };
    const leaning = {
      checksResults: [
        { ruleId: 'heading-order', title: 'Headings', outcome: 'cantTell', severity: 'moderate', tags: ['wcag2a', 'wcag131'], occurrences: [question] }
      ]
    };
    expect(leaning).not.toHaveNoA11yViolations({ leanFail: true });
    expect(leaning).toHaveNoA11yViolations({ leanFail: true, failOnSeverity: 'serious' });
    configureA11yMatchers({ leanFail: true });
    expect(leaning).not.toHaveNoA11yViolations();
    expect(leaning).toHaveNoA11yViolations({ leanFail: false });
  });
});
