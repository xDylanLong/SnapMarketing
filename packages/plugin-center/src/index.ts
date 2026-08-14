import { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { loadBundledCatalog } from './catalog.ts'
import { createDshCliInstaller } from './installer.ts'
import { projectInstalled } from './inventory.ts'
import { PluginOperationCoordinator } from './operations.ts'
import type {
  InstalledPlugin,
  PluginCenterConfig,
  PluginManifest,
  PluginOperationResult,
} from './types.ts'

/** Host Remote service backing the Snap Plugin Marketing browser surface. */
export class PluginCenterGateway extends TypertRemoteService {
  static inject = ['loader']

  private readonly config: PluginCenterConfig
  private readonly operationCoordinator: PluginOperationCoordinator

  constructor(ctx: Context, config: PluginCenterConfig = {}) {
    super(ctx, 'pluginCenter')
    this.config = config
    const installer = config.installer ?? createDshCliInstaller({
      profile: config.profile ?? 'web',
      ...(config.command === undefined ? {} : { command: config.command }),
      ...(config.commandArgs === undefined ? {} : { commandArgs: config.commandArgs }),
      ...(config.commandTimeoutMs === undefined ? {} : { timeoutMs: config.commandTimeoutMs }),
      ...(config.cwd === undefined ? {} : { cwd: config.cwd }),
    })
    this.operationCoordinator = new PluginOperationCoordinator(() => this.catalog(), installer)
  }

  /** Return the validated static catalog. The strict export is declared in `./typert`. */
  async catalog(): Promise<PluginManifest> {
    return loadBundledCatalog()
  }

  /** Return current installed state for catalog plugins. */
  async installed(): Promise<readonly InstalledPlugin[]> {
    const manifest = await this.catalog()
    return projectInstalled(this.ctx.loader.entries() as Iterable<{ options: { name?: string }; disabled?: boolean; fiber?: unknown }>, manifest)
  }

  /** Install one allowlisted plugin by catalog id. */
  async install(pluginId: string): Promise<PluginOperationResult> {
    return this.operationCoordinator.install(pluginId)
  }

  /** Uninstall one allowlisted plugin by catalog id. */
  async uninstall(pluginId: string): Promise<PluginOperationResult> {
    return this.operationCoordinator.uninstall(pluginId)
  }
}

export type * from './types.ts'
export { loadBundledCatalog } from './catalog.ts'
export { createDshCliInstaller } from './installer.ts'
export { projectInstalled } from './inventory.ts'
export { PluginOperationCoordinator } from './operations.ts'
export default PluginCenterGateway
