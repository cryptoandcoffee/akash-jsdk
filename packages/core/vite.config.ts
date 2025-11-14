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
      output: {
        exports: 'named'
      },
       external: [
         '@cosmjs/stargate',
         '@cosmjs/proto-signing',
         '@cosmjs/encoding',
         '@cosmjs/amino',
         '@cryptoandcoffee/akash-jsdk-protobuf',
         'module'
       ]
    },
    sourcemap: true,
    minify: false
  }
})