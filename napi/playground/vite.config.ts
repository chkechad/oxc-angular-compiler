import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
// Use our local vite-plugin implementation
import { angular } from '@voidzero-dev/vite-plugin-angular'
import { defineConfig } from 'vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const tsconfig = path.resolve(__dirname, './tsconfig.app.json')

export default defineConfig({
  plugins: [
    tailwindcss(),
    angular({
      tsconfig,
      liveReload: true,
    }),
  ],
})
