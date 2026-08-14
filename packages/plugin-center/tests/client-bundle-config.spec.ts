import { describe, expect, it } from 'vitest'
import config from '../tsdown.config.ts'

describe('DSH client bundle configuration', () => {
  it('emits a ModuleLoader factory registration for the package client entry', () => {
    type InspectableConfig = {
      entry?: unknown
      format?: unknown
      platform?: unknown
      deps?: unknown
      outputOptions?: unknown
    }
    const configs = (Array.isArray(config) ? config : [config]) as readonly InspectableConfig[]
    const clientConfig = configs.find(candidate => {
      const entry = candidate.entry
      return typeof entry === 'object' && entry !== null && 'client' in entry
    })

    expect(clientConfig).toBeDefined()
    expect(clientConfig?.format).toContain('cjs')
    expect(clientConfig?.platform).toBe('browser')

    const outputOptions = clientConfig?.outputOptions as {
      banner?: string
      footer?: string
      entryFileNames?: string
    } | undefined
    expect(outputOptions?.entryFileNames).toBe('client.js')
    expect(outputOptions?.banner).toContain('window.__ModuleLoader__.load')
    expect(outputOptions?.banner).toContain('@snapmarketing/dsh-plugin-center')
    expect(outputOptions?.footer).toContain('return module.exports')

    const deps = clientConfig?.deps as {
      neverBundle?: unknown
      alwaysBundle?: unknown
    } | undefined
    expect(deps?.neverBundle).toEqual(['react', 'react/jsx-runtime'])
    const alwaysBundle = deps?.alwaysBundle as ((id: string) => boolean | undefined) | undefined
    expect(alwaysBundle?.('zod')).toBe(true)
    expect(alwaysBundle?.('react')).toBe(false)
  })
})
