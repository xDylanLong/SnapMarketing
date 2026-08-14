import { describe, expect, it } from 'vitest'
import { assertInstallable, packageNameFromSource } from '../src/policy.ts'
import type { PluginMetadata } from '../src/index.ts'

const plugin = {
  id: 'example',
  name: 'Example',
  description: 'Example plugin.',
  author: { name: 'Example', url: 'https://github.com/example' },
  repository: 'https://github.com/example/plugin',
  version: '0.1.0',
  install: { type: 'package', source: '@example/plugin@1.0.0' },
  hasUI: false,
  category: 'capability',
} satisfies PluginMetadata

describe('assertInstallable', () => {
  it('accepts a package source', () => {
    expect(() => assertInstallable(plugin)).not.toThrow()
  })

  it('rejects arbitrary URLs and local paths', () => {
    expect(() => assertInstallable({ ...plugin, install: { type: 'package', source: 'https://evil.test/a.tgz' } }))
      .toThrow('non-package install source')
    expect(() => assertInstallable({ ...plugin, install: { type: 'package', source: '../local-plugin' } }))
      .toThrow('non-package install source')
  })
})

describe('packageNameFromSource', () => {
  it('handles scoped and unscoped package versions', () => {
    expect(packageNameFromSource('@example/plugin@1.0.0')).toBe('@example/plugin')
    expect(packageNameFromSource('plugin@1.0.0')).toBe('plugin')
  })
})
