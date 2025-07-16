import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*', 'generated/**/*'],
      exclude: ['src/**/*.test.ts'],
      insertTypesEntry: true
    })
  ],
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        generated: 'generated/index.ts'
      },
      name: 'AkashProtobuf',
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['@bufbuild/protobuf'],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src'
      }
    },
    sourcemap: true,
    minify: false,
    target: 'es2022'
  },
  resolve: {
    alias: {
      '@generated': new URL('./generated', import.meta.url).pathname
    }
  }
})