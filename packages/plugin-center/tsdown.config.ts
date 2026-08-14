import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    client: 'src/client/index.ts',
    typert: 'src/typert.ts',
    remote: 'src/remote.ts',
  },
  outDir: 'lib',
  format: ['esm'],
  dts: false,
  sourcemap: true,
  clean: true,
})
