'use strict';

// The listener and live-region hooks, and toHaveAnnounced(). In a project
// these three lines go in the setup file (see the README's "Setup file with
// the hooks"); here they open the file, which has a window of its own.

const { toHaveNoA11yViolations, toHaveAnnounced, installListenerHook, installLiveRegionHook } = require('../src/index');

installListenerHook();
installLiveRegionHook();
expect.extend({ toHaveNoA11yViolations, toHaveAnnounced });

// A small component: a save control that says when it's done.
function renderSaveBar({ keyboard }) {
  const container = document.createElement('div');
  container.innerHTML = '<div class="save" role="button" tabindex="0">Save</div><p role="status"></p>';
  const save = container.querySelector('.save');
  const status = container.querySelector('[role="status"]');
  const run = () => {
    status.textContent = 'Saved';
  };
  save.addEventListener('click', run);
  if (keyboard) {
    save.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') run();
    });
  }
  document.body.appendChild(container);
  return container;
}

beforeEach(() => {
  document.title = 'Test Page';
  document.documentElement.setAttribute('lang', 'en');
  document.body.innerHTML = '';
});

test('a control that only listens for clicks fails: Enter and Space do nothing', () => {
  const container = renderSaveBar({ keyboard: false });
  expect(container).not.toHaveNoA11yViolations();
});

test('saving says so to assistive technology', async () => {
  const container = renderSaveBar({ keyboard: true });
  expect(container).toHaveNoA11yViolations();

  await new Promise((resolve) => setTimeout(resolve, 0)); // as a user event would
  container.querySelector('.save').click();
  expect(container).toHaveAnnounced('Saved');
});

test('leanFail also fails on the questions that likely fail', () => {
  document.body.innerHTML = '<main><h1>Account</h1><h3>Billing</h3></main>';
  expect(document.body).toHaveNoA11yViolations(); // heading-order is a question
  expect(document.body).not.toHaveNoA11yViolations({ leanFail: true }); // that leans fail
});
