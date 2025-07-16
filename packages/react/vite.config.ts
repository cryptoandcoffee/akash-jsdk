import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*'],
      exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx']
    })
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'AkashSDKReact',
      formats: ['es', 'cjs'],
      fileName: (format) => format === 'es' ? 'index.js' : 'index.cjs'
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        '@cryptoandcoffee/akash-jsdk-core'
      ]
    },
    sourcemap: true,
    minify: false
  }
})