'use strict';

// installListenerHook() under Jest. The hook changes the window for the
// whole file, so it is installed once, first, as a setup file would.

const { toHaveNoA11yViolations, installListenerHook } = require('../src/index');
const { scanElement } = require('../src/scan-element');

installListenerHook();
expect.extend({ toHaveNoA11yViolations });

beforeEach(() => {
  document.title = 'Test Page';
  document.documentElement.setAttribute('lang', 'en');
  document.body.innerHTML = '';
});

const keyboardRule = (result) => result.checksResults.find((r) => r.ruleId === 'click-handler-keyboard-operable');

test('records itself as early, and the result says so', () => {
  document.body.innerHTML = '<main><h1>Hi</h1></main>';
  expect(scanElement(document).engine.environment.listenerHook).toBe('early');
});

test('a button that only listens for clicks, added from script, fails: Enter and Space do nothing', () => {
  document.body.innerHTML = '<main><h1>Hi</h1><div class="save" role="button" tabindex="0">Save</div></main>';
  document.querySelector('.save').addEventListener('click', () => {});

  const check = keyboardRule(scanElement(document.body));
  expect(check.outcome).toBe('fail');
  expect(check.occurrences.map((o) => o.data.details.reasonCode)).toEqual(['CLICK_HANDLER_NO_KEY_LISTENER']);
  expect(() => expect(document.body).toHaveNoA11yViolations()).toThrow(/click-handler-keyboard-operable \(\w+\): /);
});

test('the same button with a key listener passes, and jsdom\'s own window listeners are not counted as the page\'s', () => {
  document.body.innerHTML = '<main><h1>Hi</h1><div class="save" role="button" tabindex="0">Save</div></main>';
  const save = document.querySelector('.save');
  save.addEventListener('click', () => {});
  save.addEventListener('keydown', () => {});

  expect(keyboardRule(scanElement(document.body)).outcome).toBe('pass');
  expect(document.body).toHaveNoA11yViolations();
});

test('a click handler set as a property is seen too', () => {
  document.body.innerHTML = '<main><h1>Hi</h1><div class="save" role="button" tabindex="0">Save</div></main>';
  document.querySelector('.save').onclick = () => {};
  expect(keyboardRule(scanElement(document.body)).outcome).toBe('fail');
});

test('a failure message has no listener-hook note', () => {
  document.body.innerHTML = '<main><h1>Hi</h1><div role="button" tabindex="0" onclick="save()">Save</div><img src="x.png"></main>';
  const { pass, message } = toHaveNoA11yViolations(document.body);
  expect(pass).toBe(false);
  expect(message()).not.toMatch(/listener hook/);
});

test('installing it again changes nothing', () => {
  const wrapped = EventTarget.prototype.addEventListener;
  installListenerHook();
  expect(EventTarget.prototype.addEventListener).toBe(wrapped);
});

test('throws a TypeError for anything but a window', () => {
  for (const bad of [null, {}, { document: {} }]) {
    expect(() => installListenerHook(bad)).toThrow(/installListenerHook\(\): no jsdom window/);
  }
});
