import { readFile } from 'node:fs/promises'

const packages = [
  'packages/manifest/package.json',
  'packages/plugin-center/package.json',
]
for (const path of packages) {
  const manifest = JSON.parse(await readFile(path, 'utf8'))
  if (manifest.license !== 'Apache-2.0') throw new Error(`${path}: license must be Apache-2.0`)
  if (!manifest.files?.includes('lib')) throw new Error(`${path}: package must publish lib`)
}
const plugin = JSON.parse(await readFile('packages/plugin-center/registry/plugins.json', 'utf8'))
if (plugin.schemaVersion !== '1.0' || !Array.isArray(plugin.plugins)) throw new Error('registry: invalid Manifest V1 root')
console.log(`package metadata valid: ${packages.length} packages, ${plugin.plugins.length} catalog entries`)
