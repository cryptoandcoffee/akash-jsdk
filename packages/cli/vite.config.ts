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
      entry: {
        index: 'src/index.ts',
        cli: 'src/cli.ts'
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        return format === 'es' ? `${entryName}.js` : `${entryName}.cjs`
      }
    },
    rollupOptions: {
      external: [
        'commander',
        'chalk',
        'ora',
        'inquirer',
        '@cryptoandcoffee/akash-jsdk-core',
        'fs',
        'path',
        'os'
      ],
      output: {
        banner: (chunk) => {
          return ''
        }
      }
    },
    sourcemap: true,
    minify: false
  }
})