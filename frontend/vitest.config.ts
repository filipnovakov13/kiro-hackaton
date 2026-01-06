import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.property.test.ts'],
    exclude: ['tests/ux-validation.spec.ts'], // Playwright tests handled separately
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    testTimeout: 30000, // 30 seconds for property tests
  },
});
