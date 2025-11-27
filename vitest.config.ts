import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./client/src/test/setup.ts'],
    include: ['client/src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['client/src/**/*.{ts,tsx}'],
      exclude: [
        'client/src/**/*.test.{ts,tsx}',
        'client/src/**/*.spec.{ts,tsx}',
        'client/src/test/**',
        'client/src/main.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'client', 'src'),
      '@shared': path.resolve(import.meta.dirname, 'shared'),
    },
  },
});
