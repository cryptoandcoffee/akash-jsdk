import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*'],
      exclude: ['src/**/*.test.ts']
    })
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'AkashSDKCore',
      formats: ['es', 'cjs'],
      fileName: (format) => format === 'es' ? 'index.js' : 'index.cjs'
    },
    rollupOptions: {
      external: [
        '@cosmjs/stargate',
        '@cosmjs/proto-signing',
        '@cosmjs/encoding',
        '@cryptoandcoffee/akash-jsdk-protobuf'
      ]
    },
    sourcemap: true,
    minify: false
  }
})