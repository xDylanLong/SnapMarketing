import { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { assertInstallable } from '@snapmarketing/plugin-manifest'
import { fetchCatalog } from './catalog.ts'
import { createDshCliInstaller } from './installer.ts'
import { projectInstalled } from './inventory.ts'
import type {
  HarnessPluginInstaller,
  InstalledPlugin,
  PluginCenterConfig,
  PluginManifest,
  PluginOperationResult,
} from './types.ts'

/** Host Remote service backing the Snap Plugin Marketing browser surface. */
export class PluginCenterGateway extends TypertRemoteService {
  static inject = ['loader']

  private readonly config: PluginCenterConfig
  private readonly installer: HarnessPluginInstaller

  constructor(ctx: Context, config: PluginCenterConfig = {}) {
    super(ctx, 'pluginCenter')
    this.config = config
    this.installer = config.installer ?? createDshCliInstaller({
      profile: config.profile ?? 'web',
      ...(config.command === undefined ? {} : { command: config.command }),
      ...(config.cwd === undefined ? {} : { cwd: config.cwd }),
    })
  }

  /** Return the validated static catalog. The strict export is declared in `./typert`. */
  async catalog(): Promise<PluginManifest> {
    return fetchCatalog(this.config)
  }

  /** Return current installed state for catalog plugins. */
  async installed(): Promise<readonly InstalledPlugin[]> {
    const manifest = await this.catalog()
    return projectInstalled(this.ctx.loader.entries() as unknown as readonly { options: { name?: string }; disabled?: boolean; fiber?: unknown }[], manifest)
  }

  /** Install one allowlisted plugin by catalog id. */
  async install(pluginId: string): Promise<PluginOperationResult> {
    return this.runOperation(pluginId, 'install')
  }

  /** Uninstall one allowlisted plugin by catalog id. */
  async uninstall(pluginId: string): Promise<PluginOperationResult> {
    return this.runOperation(pluginId, 'uninstall')
  }

  private async runOperation(pluginId: string, operation: 'install' | 'uninstall'): Promise<PluginOperationResult> {
    const manifest = await this.catalog()
    const plugin = manifest.plugins.find(candidate => candidate.id === pluginId)
    if (plugin === undefined) {
      return { pluginId, status: 'failed', needsReload: false, message: `plugin "${pluginId}" is not in the catalog` }
    }
    assertInstallable(plugin)
    const result = await this.installer[operation](plugin.install.source)
    if (!result.ok) {
      return { pluginId, status: 'failed', needsReload: false, message: result.message ?? `Harness ${operation} failed` }
    }
    return {
      pluginId,
      status: operation === 'install' ? 'installed' : 'removed',
      needsReload: true,
      message: result.message ?? `plugin ${operation} completed; refresh Harness to apply it`,
    }
  }
}

export type * from './types.ts'
export { DEFAULT_CATALOG_URL } from './catalog.ts'
export { createDshCliInstaller } from './installer.ts'
export { projectInstalled } from './inventory.ts'
export default PluginCenterGateway
