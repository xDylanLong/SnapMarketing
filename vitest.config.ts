import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@snapmarketing/plugin-manifest': resolve(__dirname, 'packages/manifest/src/index.ts'),
    },
  },
  test: {
    include: ['packages/**/tests/**/*.spec.ts', 'packages/**/tests/**/*.spec.tsx'],
    environmentMatchGlobs: [
      ['packages/plugin-center/tests/**/*.client.spec.tsx', 'jsdom'],
    ],
    setupFiles: ['./vitest.setup.ts'],
  },
})
