import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// Custom plugin to copy generated files to dist
function copyGeneratedFiles() {
  return {
    name: 'copy-generated',
    apply: 'build',
    async closeBundle() {
      const srcDir = './generated'
      const distDir = './dist/generated'

      // Recursively copy files
      function copyDir(src: string, dest: string) {
        mkdirSync(dest, { recursive: true })
        const files = readdirSync(src)

        for (const file of files) {
          const srcPath = join(src, file)
          const destPath = join(dest, file)
          const stat = statSync(srcPath)

          if (stat.isDirectory()) {
            copyDir(srcPath, destPath)
          } else {
            copyFileSync(srcPath, destPath)
          }
        }
      }

      copyDir(srcDir, distDir)
    }
  }
}

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*', 'generated/**/*'],
      exclude: ['src/**/*.test.ts'],
      insertTypesEntry: true
    }),
    copyGeneratedFiles()
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'AkashProtobuf',
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['@bufbuild/protobuf', 'fs', 'path', 'url', 'long'],
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