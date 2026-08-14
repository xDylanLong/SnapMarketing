import { defineConfig, type UserConfig } from 'tsdown'

const hostConfig: UserConfig = {
  entry: {
    index: 'src/index.ts',
    typert: 'src/typert.ts',
    remote: 'src/remote.ts',
  },
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2022',
  dts: false,
  sourcemap: true,
  clean: true,
}

const clientConfig: UserConfig = {
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: ['cjs'],
  platform: 'browser',
  target: 'es2022',
  dts: false,
  sourcemap: true,
  clean: false,
  external: ['react', 'react/jsx-runtime'],
  noExternal: (id: string) => id === 'react' || id === 'react/jsx-runtime' ? undefined : true,
  outputOptions: {
    entryFileNames: 'client.js',
    banner: 'window.__ModuleLoader__.load({ id: "@snapmarketing/dsh-plugin-center", factory: (require) => {',
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}

export default defineConfig([hostConfig, clientConfig])
