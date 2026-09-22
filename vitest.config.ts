import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: [
        'src/engine/**/*.ts',
        'src/state/**/*.ts',
        'src/lib/storage.ts',
        'src/i18n/translate.ts',
      ],
      exclude: ['src/**/*.test.ts'],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
      reporter: ['text', 'html'],
    },
  },
});
