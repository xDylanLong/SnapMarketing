import { describe, expect, it, vi } from 'vitest'
import { loadBundledCatalog } from '../src/catalog.ts'

describe('loadBundledCatalog', () => {
  it('loads the validated catalog from the installed package without a network request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await loadBundledCatalog()

    expect(result.schemaVersion).toBe('1.0')
    expect(result.plugins.length).toBeGreaterThan(0)
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
