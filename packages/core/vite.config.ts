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
       external: (id: string) => {
         // Mark all protobuf src imports as external
         if (id.includes('@cryptoandcoffee/akash-jsdk-protobuf') || id.includes('../../protobuf/src')) {
           return true
         }
         return [
           '@cosmjs/stargate',
           '@cosmjs/proto-signing',
           '@cosmjs/encoding',
           '@cosmjs/amino',
           '@bufbuild/protobuf',
           'long',
           'crypto',
           'module'
         ].includes(id)
       }
    },
    sourcemap: true,
    minify: false
  }
})