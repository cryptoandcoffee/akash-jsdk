import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [
      ['packages/react/**', 'jsdom']
    ],
    setupFiles: [
      './packages/react/vitest.setup.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['packages/*/src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/',
        'dist/',
        'build/',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/test-setup.ts',
        '**/generated/**',
        '**/scripts/**',
        '**/__mocks__/**',
        '**/cli/src/commands/*-action.ts',
        '**/cli/src/utils/config-action.ts'
      ],
      all: true
    }
  },
  resolve: {
    alias: {
      '@cryptoandcoffee/akash-jsdk-core': path.resolve(__dirname, './packages/core/src'),
      '@cryptoandcoffee/akash-jsdk-react': path.resolve(__dirname, './packages/react/src'),
      '@cryptoandcoffee/akash-jsdk-cli': path.resolve(__dirname, './packages/cli/src'),
      '@cryptoandcoffee/akash-jsdk-protobuf': path.resolve(__dirname, './packages/protobuf/src')
    }
  }
})