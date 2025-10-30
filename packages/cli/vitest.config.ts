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
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90
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