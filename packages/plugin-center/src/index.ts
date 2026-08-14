import { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { loadBundledCatalog } from './catalog.ts'
import { createDshCliInstaller } from './installer.ts'
import { createSnapMarketingUpdater } from './self-update.ts'
import { projectInstalled, readProfileDependencyNames } from './inventory.ts'
import { PluginOperationCoordinator } from './operations.ts'
import type {
  InstalledPlugin,
  PluginCenterConfig,
  PluginManifest,
  PluginOperationResult,
  SnapMarketingUpdateResult,
  SnapMarketingUpdateStatus,
  SnapMarketingVersion,
} from './types.ts'

/** Host Remote service backing the Snap Plugin Marketing browser surface. */
export class PluginCenterGateway extends TypertRemoteService {
  static inject = ['loader']

  private readonly config: PluginCenterConfig
  private readonly operationCoordinator: PluginOperationCoordinator
  private readonly selfUpdater: ReturnType<typeof createSnapMarketingUpdater>

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
    this.selfUpdater = createSnapMarketingUpdater({
      profile: config.profile ?? 'web',
      ...(config.command === undefined ? {} : { command: config.command }),
      ...(config.commandArgs === undefined ? {} : { commandArgs: config.commandArgs }),
      ...(config.commandTimeoutMs === undefined ? {} : { timeoutMs: config.commandTimeoutMs }),
      ...(config.cwd === undefined ? {} : { cwd: config.cwd }),
    })
  }

  /** Return the validated static catalog. The strict export is declared in `./typert`. */
  async catalog(): Promise<PluginManifest> {
    return loadBundledCatalog()
  }

  /** Return current installed state for catalog plugins. */
  async installed(): Promise<readonly InstalledPlugin[]> {
    const manifest = await this.catalog()
    const profile = this.config.profile ?? 'web'
    const profileDependencies = await readProfileDependencyNames(profile)
    return projectInstalled(
      this.ctx.loader.entries() as Iterable<{ options: { name?: string }; disabled?: boolean; fiber?: unknown }>,
      manifest,
      profileDependencies,
    )
  }

  /** Install one allowlisted plugin by catalog id. */
  async install(pluginId: string): Promise<PluginOperationResult> {
    return this.operationCoordinator.install(pluginId)
  }

  /** Uninstall one allowlisted plugin by catalog id. */
  async uninstall(pluginId: string): Promise<PluginOperationResult> {
    return this.operationCoordinator.uninstall(pluginId)
  }

  /** Return the locally installed SnapMarketing version without contacting npm. */
  async currentVersion(): Promise<SnapMarketingVersion> {
    return this.selfUpdater.currentVersion()
  }

  /** Check npm for a newer SnapMarketing package. */
  async updateStatus(): Promise<SnapMarketingUpdateStatus> {
    return this.selfUpdater.check()
  }

  /** Update only SnapMarketing itself through the active DSH profile. */
  async updateSelf(): Promise<SnapMarketingUpdateResult> {
    return this.selfUpdater.update()
  }
}

export type * from './types.ts'
export { loadBundledCatalog } from './catalog.ts'
export { createDshCliInstaller } from './installer.ts'
export { projectInstalled } from './inventory.ts'
export { readProfileDependencyNames } from './inventory.ts'
export { PluginOperationCoordinator } from './operations.ts'
export { createSnapMarketingUpdater, readSnapMarketingVersion, SNAPMARKETING_PACKAGE_NAME } from './self-update.ts'
export default PluginCenterGateway
