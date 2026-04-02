const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.{js,ts}', 'tests/**/*.spec.{js,ts}'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
  },
});
