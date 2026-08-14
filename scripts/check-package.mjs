import { access, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const packages = [
  'packages/manifest/package.json',
  'packages/plugin-center/package.json',
]
for (const path of packages) {
  const manifest = JSON.parse(await readFile(path, 'utf8'))
  if (manifest.license !== 'Apache-2.0') throw new Error(`${path}: license must be Apache-2.0`)
  if (!manifest.files?.includes('lib')) throw new Error(`${path}: package must publish lib`)
  const targets = new Set([manifest.main, manifest.types])
  collectExportTargets(manifest.exports, targets)
  for (const target of targets) {
    if (typeof target !== 'string' || !target.replace(/^\.\//, '').startsWith('lib/')) continue
    const absolute = resolve(dirname(path), target)
    await access(absolute).catch(() => { throw new Error(`${path}: export target does not exist: ${target}`) })
  }
  if (path === 'packages/plugin-center/package.json' && !manifest.files?.includes('registry/plugins.json')) {
    throw new Error(`${path}: bundled catalog must be published with the plugin`)
  }
}
const plugin = JSON.parse(await readFile('packages/plugin-center/registry/plugins.json', 'utf8'))
if (plugin.schemaVersion !== '1.0' || !Array.isArray(plugin.plugins)) throw new Error('registry: invalid Manifest V1 root')
const clientBundle = await readFile('packages/plugin-center/lib/client.js', 'utf8')
if (!clientBundle.startsWith('window.__ModuleLoader__.load({')) {
  throw new Error('plugin-center: client.js must register a Harness client module factory')
}
console.log(`package metadata valid: ${packages.length} packages, ${plugin.plugins.length} catalog entries`)

function collectExportTargets(value, targets) {
  if (typeof value === 'string') {
    targets.add(value)
    return
  }
  if (value === null || typeof value !== 'object') return
  for (const child of Object.values(value)) collectExportTargets(child, targets)
}
