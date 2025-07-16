import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@cryptoandcoffee/akash-jsdk-core': path.resolve(__dirname, '../core/src'),
      '@cryptoandcoffee/akash-jsdk-protobuf': path.resolve(__dirname, '../protobuf/src'),
    }
  }
})