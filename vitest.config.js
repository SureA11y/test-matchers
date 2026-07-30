'use strict';

module.exports = {
  test: {
    environment: 'jsdom',
    // Mirrors jest.config.js's testMatch, restricted to the Vitest-specific
    // test files (ESM imports, `vi` mocking) -- the shared *.test.js suite
    // in tests/ and examples/ runs under Jest via `npm run test:jest`.
    include: ['**/*.vitest.test.js'],
    exclude: ['**/node_modules/**']
  }
};
