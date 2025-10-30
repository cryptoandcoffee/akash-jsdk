import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 10000, // Increase timeout for subprocess and async operations
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
      all: true,
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100
      }
    }
  },
  resolve: {
    alias: {
      '@cryptoandcoffee/akash-jsdk-core': path.resolve(__dirname, '../core/src'),
      '@cryptoandcoffee/akash-jsdk-protobuf': path.resolve(__dirname, '../protobuf/src'),
    }
  }
})