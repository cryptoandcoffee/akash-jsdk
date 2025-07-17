import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
      all: true,
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95
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