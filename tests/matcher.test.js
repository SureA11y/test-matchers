'use strict';

const { toHaveNoA11yViolations } = require('../src/matcher');
const { scanElement } = require('../src/scan-element');

beforeEach(() => {
  document.title = 'Test Page';
  document.documentElement.setAttribute('lang', 'en');
  document.body.innerHTML = '';
});

test('passes when the element has no accessibility violations', () => {
  document.body.innerHTML = '<main><h1>Hi</h1></main>';
  const { pass } = toHaveNoA11yViolations(document.body, { tags: { include: 'wcag2a' } });
  expect(pass).toBe(true);
});

test('fails with a descriptive message when the element has a violation', () => {
  document.body.innerHTML = '<main><img src="x.png"></main>';
  const { pass, message } = toHaveNoA11yViolations(document.body, { rules: { include: 'img-alt-present' } });
  expect(pass).toBe(false);
  expect(message()).toMatch(/img-alt-present/);
  expect(message()).toMatch(/found 1/);
});

test('document-wide rules are notApplicable (not fail) when scanning a scoped element, since a subtree is not the whole page', () => {
  document.title = ''; // would break page-title-present if it applied here
  document.body.innerHTML = '<div id="widget"><main><h1>Hi</h1></main></div>';
  const widget = document.getElementById('widget');

  const { pass } = toHaveNoA11yViolations(widget, { rules: { include: 'page-title-present' } });

  expect(pass).toBe(true);
});

test('document-wide rules still fail when scanning the whole document directly', () => {
  document.title = ''; // no <title> text -- deliberately breaks page-title-present
  document.body.innerHTML = '<main><h1>Hi</h1></main>';

  const { pass, message } = toHaveNoA11yViolations(document, { rules: { include: 'page-title-present' } });

  expect(pass).toBe(false);
  expect(message()).toMatch(/page-title-present/);
});

test('accepts a precomputed surea11y result directly, without scanning', () => {
  const fakeResult = {
    checksResults: [
      { ruleId: 'fake-rule', outcome: 'fail', severity: 'serious', occurrences: [{ summary: 'x', selector: 'div' }] }
    ]
  };
  const { pass } = toHaveNoA11yViolations(fakeResult);
  expect(pass).toBe(false);
});

test('cantTell-only results pass (do not gate the assertion)', () => {
  const fakeResult = {
    checksResults: [
      { ruleId: 'manual-rule', outcome: 'cantTell', severity: 'minor', occurrences: [{ summary: 'needs review', selector: 'div' }] }
    ]
  };
  const { pass } = toHaveNoA11yViolations(fakeResult);
  expect(pass).toBe(true);
});

test('a failing result also surfaces cantTell rules for visibility, without them counting as failures', () => {
  const fakeResult = {
    checksResults: [
      { ruleId: 'fail-rule', outcome: 'fail', severity: 'serious', occurrences: [{ summary: 'broken', selector: 'div' }] },
      { ruleId: 'manual-rule', outcome: 'cantTell', severity: 'minor', occurrences: [{ summary: 'needs review', selector: 'span' }] }
    ]
  };
  const { pass, message } = toHaveNoA11yViolations(fakeResult);
  expect(pass).toBe(false);
  expect(message()).toMatch(/manual-rule/);
  expect(message()).toMatch(/cantTell/);
});

test('passes engineOptions through to the underlying scan', () => {
  document.body.innerHTML = '<img src="x.png"><button></button>';
  const { pass } = toHaveNoA11yViolations(document.body, { rules: { include: 'button-name-present' } });
  expect(pass).toBe(false); // button-name-present fails; img-alt-present is excluded by rules.include
});

test('throws a clear TypeError on invalid input', () => {
  expect(() => toHaveNoA11yViolations('not a node or result')).toThrow(TypeError);
  expect(() => toHaveNoA11yViolations('not a node or result')).toThrow(/expects a DOM element/);
});

test('registered via expect.extend, works as a real Jest matcher', () => {
  expect.extend({ toHaveNoA11yViolations });
  document.body.innerHTML = '<main><h1>Hi</h1></main>';
  expect(document.body).toHaveNoA11yViolations();
});

test('registered via expect.extend, .not. works for a violating element', () => {
  expect.extend({ toHaveNoA11yViolations });
  document.body.innerHTML = '<img src="x.png">';
  expect(document.body).not.toHaveNoA11yViolations();
});

test('fails when the element is not in the document, since nothing in it was scanned', () => {
  const detached = document.createElement('div');
  detached.innerHTML = '<img src="x.png">';

  const { pass, message } = toHaveNoA11yViolations(detached);

  expect(pass).toBe(false);
  expect(message()).toMatch(/left out what it was asked to check/);
  expect(message()).toMatch(/not in the document the scan runs in/);
  expect(message()).toMatch(/Nothing was scanned/);
  expect(message()).not.toMatch(/No accessibility violations found/);
});

test('fails when a custom rule did not run, naming the rule and the reason', () => {
  document.body.innerHTML = '<main><h1>Hi</h1></main>';
  const brokenRule = { id: 'team-broken-rule', meta: {}, runInPage: 'not a function' };

  const { pass, message } = toHaveNoA11yViolations(document.body, { customRules: [brokenRule] });

  expect(pass).toBe(false);
  expect(message()).toMatch(/Custom rule "team-broken-rule" did not run: runInPage/);
});

test('a custom rule the test excluded does not fail the assertion; one the scan skipped still does', () => {
  document.body.innerHTML = '<main><h1>Hi</h1></main>';
  const rule = (id) => ({
    id,
    meta: { title: id, description: id, tags: ['org'], wcagSc: [], type: 'automatic' },
    runInPage: "function (ctx) { return { ruleId: ctx.rule.ruleId, outcome: 'pass', occurrences: [] }; }"
  });
  const engineOptions = { customRules: [rule('org-a'), rule('org-b')] };

  const excluded = toHaveNoA11yViolations(document.body, engineOptions, { includeRuleIds: ['org-a', 'org-b'], excludeRuleIds: ['org-b'] });
  expect(excluded.pass).toBe(true);

  const skipped = toHaveNoA11yViolations(document.body, { customRules: [rule('org-a'), { id: 'org-c', runInPage: 'not a function' }] });
  expect(skipped.pass).toBe(false);
  expect(skipped.message()).toMatch(/Custom rule "org-c" did not run/);
});

test('a precomputed result whose scope matched nothing fails; one whose scope partly matched does not', () => {
  const noMatch = { checksResults: [], contextMatch: { elementCount: 0, unmatchedSelectors: ['#app'] } };
  expect(toHaveNoA11yViolations(noMatch).pass).toBe(false);
  expect(toHaveNoA11yViolations(noMatch).message()).toMatch(/"#app"/);

  const partMatch = { checksResults: [], contextMatch: { elementCount: 1, unmatchedSelectors: ['#gone'] } };
  expect(toHaveNoA11yViolations(partMatch).pass).toBe(true);
});

test('the failure message ends with the core release that produced the result', () => {
  document.body.innerHTML = '<main><img src="x.png"></main>';
  const { message } = toHaveNoA11yViolations(document.body, { rules: { include: 'img-alt-present' } });
  expect(message()).toMatch(/Scanned with @surea11y\/core \d+\.\d+\.\d+\.$/);
});

test('locates a finding inside a shadow root through its host', () => {
  document.body.innerHTML = '<main><div id="host"></div></main>';
  document.getElementById('host').attachShadow({ mode: 'open' }).innerHTML = '<img src="x.png">';

  const { pass, message } = toHaveNoA11yViolations(document.body, {
    includeShadowDom: true,
    rules: { include: 'img-alt-present' }
  });

  expect(pass).toBe(false);
  expect(message()).toMatch(/at .*#host >>> .*img/);
});

test('an engineOptions rule or tag list that names nothing throws INVALID_RUN_ONLY instead of passing', () => {
  document.body.innerHTML = '<main><img src="x.png"></main>';
  let caught;
  try {
    toHaveNoA11yViolations(document.body, { rules: { include: 'img-alt-presnt' } });
  } catch (e) {
    caught = e;
  }
  expect(caught).toBeDefined();
  expect(caught.code).toBe('INVALID_RUN_ONLY');
  expect(caught.message).toMatch(/img-alt-presnt/);
});

describe('packs', () => {
  const { definePack } = require('@surea11y/core/pack');
  const acmePolicy = require('../examples/acme-policy-pack');

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    console.warn.mockRestore();
  });

  test('fails when a pack did not run, naming the pack and the reason', () => {
    document.body.innerHTML = '<main><h1>Hi</h1><video autoplay src="intro.mp4"></video></main>';
    const futurePack = definePack({ ...acmePolicy, core: '^2.0.0' });

    const { pass, message } = toHaveNoA11yViolations(document, { packs: [futurePack] });

    expect(pass).toBe(false);
    expect(message()).toMatch(/left out what it was asked to check/);
    expect(message()).toMatch(/Pack "@acme\/a11y-policy" did not run: it supports core \^2\.0\.0/);
  });

  test("a pack that runs fails the assertion on the pack's finding", () => {
    document.body.innerHTML = '<main><h1>Hi</h1><video autoplay src="intro.mp4"></video></main>';

    const { pass, message } = toHaveNoA11yViolations(document, { packs: [acmePolicy], profile: 'acme-web-2026' });

    expect(pass).toBe(false);
    expect(message()).toMatch(/found 1:/);
    expect(message()).toMatch(/acme-no-autoplay \(serious\): This video plays with sound as the page opens\./);
  });

  test("a pack's profile passes a page that meets it", () => {
    document.body.innerHTML = '<main><h1>Hi</h1><video autoplay src="intro.mp4"></video></main>';
    document.querySelector('video').muted = true;
    expect(toHaveNoA11yViolations(document, { packs: [acmePolicy], profile: 'acme-web-2026' }).pass).toBe(true);
  });
});

describe('core 1.12', () => {
  test('without the internals hook, an unnamed custom element is a question, and a failure message says how to read it', () => {
    customElements.define('x-unhooked-button', class extends HTMLElement {});
    document.body.innerHTML = '<main><h1>Hi</h1><x-unhooked-button role="button"></x-unhooked-button></main>';
    expect(toHaveNoA11yViolations(document.body).pass).toBe(true);

    document.body.insertAdjacentHTML('beforeend', '<img src="x.png">');
    const { pass, message } = toHaveNoA11yViolations(document.body);
    expect(pass).toBe(false);
    expect(message()).toMatch(/1 custom element was asked about .*installInternalsHook\(\)/);
  });

  test('an empty heading fails a default call, and not a WCAG-only one', () => {
    document.body.innerHTML = '<main><h1>Title</h1><h2></h2></main>';

    const byDefault = toHaveNoA11yViolations(document.body);
    expect(byDefault.pass).toBe(false);
    expect(byDefault.message()).toMatch(/empty-heading/);

    expect(toHaveNoA11yViolations(document.body, {}, { wcag: { version: '2.2', level: 'AA' } }).pass).toBe(true);
    expect(toHaveNoA11yViolations(document.body, {}, { excludeRuleIds: ['empty-heading'] }).pass).toBe(true);
  });

  test('engineOptions.wcagLevel reaches the scan', () => {
    document.body.innerHTML = '<main><h1>Hi</h1></main>';
    const result = scanElement(document.body, { wcagLevel: 'AA' }, { includeRuleIds: ['contrast-computable'] });
    expect(result.engine.wcagLevel).toBe('AA');
    expect(result.rulesResults.map((r) => r.ruleId)).toEqual(['wcag-1.4.3-contrast-minimum']);
    expect(toHaveNoA11yViolations(result).pass).toBe(true);
  });
});

describe('runOnly', () => {
  const duplicateIds = '<main><h1>Hi</h1><div id="a"></div><div id="a"></div></main>';

  test('a WCAG 2.1 target runs 4.1.1 Parsing, which a 2.2 target leaves out', () => {
    document.body.innerHTML = duplicateIds;

    const wcag21 = toHaveNoA11yViolations(document, {}, { wcag: { version: '2.1', level: 'A' } });
    const wcag22 = toHaveNoA11yViolations(document, {}, { wcag: { version: '2.2', level: 'AA' } });

    expect(wcag21.pass).toBe(false);
    expect(wcag21.message()).toMatch(/duplicate-id/);
    expect(wcag22.pass).toBe(true);
  });

  test('bestPractices adds the best-practice rules to a WCAG target', () => {
    document.body.innerHTML = '<main><img src="x.png"></main><p>Outside any landmark</p>';

    const target = toHaveNoA11yViolations(document, {}, { wcag: { version: '2.2', level: 'AA' } });
    const withBestPractices = toHaveNoA11yViolations(document, {}, { wcag: { version: '2.2', level: 'AA' }, bestPractices: true });

    expect(target.message()).not.toMatch(/\bregion\b/);
    expect(withBestPractices.message()).toMatch(/manual review.*\bregion\b/);
  });

  test('a WCAG target the engine does not know throws INVALID_RUN_ONLY', () => {
    document.body.innerHTML = '<main><h1>Hi</h1></main>';
    expect(() => toHaveNoA11yViolations(document.body, {}, { wcag: { version: '3.0', level: 'AA' } })).toThrow(
      expect.objectContaining({ code: 'INVALID_RUN_ONLY' })
    );
  });

  test('registered via expect.extend, takes runOnly as the second argument', () => {
    expect.extend({ toHaveNoA11yViolations });
    document.body.innerHTML = duplicateIds;
    expect(document).not.toHaveNoA11yViolations({}, { wcag: { version: '2.1', level: 'A' } });
    expect(document).toHaveNoA11yViolations({}, { wcag: { version: '2.2', level: 'AA' } });
  });
});

test('strictOptions throws INVALID_ENGINE_OPTIONS on an option the engine does not read', () => {
  document.body.innerHTML = '<main><h1>Hi</h1></main>';
  expect(() => toHaveNoA11yViolations(document.body, { strictOptions: true, lcoale: 'fr' })).toThrow(
    expect.objectContaining({ code: 'INVALID_ENGINE_OPTIONS', message: expect.stringMatching(/did you mean "locale"/) })
  );
});
