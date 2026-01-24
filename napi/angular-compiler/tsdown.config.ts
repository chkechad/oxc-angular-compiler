import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'tsdown'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  entry: [
    'vite-plugin/index.ts',
    'vite-plugin/angular-build-optimizer-plugin.ts',
    'vite-plugin/angular-jit-plugin.ts',
  ],
  outDir: 'dist',
  format: 'esm',
  dts: true,
  external: [join(__dirname, 'index.js')],
})
