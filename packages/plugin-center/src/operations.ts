import { assertInstallable, type PluginManifest } from '@snapmarketing/plugin-manifest'
import type { HarnessPluginInstaller, PluginOperationResult } from './types.ts'

type Operation = 'install' | 'uninstall'

/** Resolve browser requests through the current allowlist and serialize each package operation. */
export class PluginOperationCoordinator {
  private readonly active = new Map<string, Promise<PluginOperationResult>>()

  constructor(
    private readonly loadCatalog: () => Promise<PluginManifest>,
    private readonly installer: HarnessPluginInstaller,
  ) {}

  install(pluginId: string): Promise<PluginOperationResult> {
    return this.serialize(pluginId, () => this.run(pluginId, 'install'))
  }

  uninstall(pluginId: string): Promise<PluginOperationResult> {
    return this.serialize(pluginId, () => this.run(pluginId, 'uninstall'))
  }

  private serialize(pluginId: string, operation: () => Promise<PluginOperationResult>): Promise<PluginOperationResult> {
    const current = this.active.get(pluginId)
    if (current !== undefined) return current
    const pending = operation().finally(() => { this.active.delete(pluginId) })
    this.active.set(pluginId, pending)
    return pending
  }

  private async run(pluginId: string, operation: Operation): Promise<PluginOperationResult> {
    const manifest = await this.loadCatalog()
    const plugin = manifest.plugins.find(candidate => candidate.id === pluginId)
    if (plugin === undefined) {
      return { pluginId, status: 'failed', needsReload: false, message: `plugin "${pluginId}" is not in the catalog` }
    }
    assertInstallable(plugin)
    let result
    try {
      result = await this.installer[operation](plugin.install.source)
    } catch (error) {
      return {
        pluginId,
        status: 'failed',
        needsReload: false,
        message: error instanceof Error ? error.message : String(error),
      }
    }
    if (!result.ok) {
      return { pluginId, status: 'failed', needsReload: false, message: result.message ?? `Harness ${operation} failed` }
    }
    return {
      pluginId,
      status: operation === 'install' ? 'installed' : 'removed',
      needsReload: true,
      message: operation === 'uninstall'
        ? `${plugin.name} 已卸载`
        : plugin.hasUI
          ? `${plugin.name} 已安装；刷新 Harness 后，插件会按自身设计呈现界面`
          : `${plugin.name} 已安装；该插件没有独立界面，刷新 Harness 后可通过 Agent 或对应工作流使用`,
    }
  }
}
