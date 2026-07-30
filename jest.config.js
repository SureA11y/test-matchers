'use strict';

module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/**/*.test.js', '**/examples/**/*.test.js'],
  // *.vitest.test.js files use Vitest-only APIs (ESM imports, `vi` mocking) --
  // run separately via `npm run test:vitest` / vitest.config.js, not here.
  testPathIgnorePatterns: ['/node_modules/', '\\.vitest\\.test\\.js$']
};
