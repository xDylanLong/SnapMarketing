import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { TYPERT_REMOTE } from '../remote.ts'
import { PluginCenterTab, type PluginCenterTabInjected } from './PluginCenterTab.tsx'

export type { PluginCenterTabInjected, PluginCenterTabProps } from './PluginCenterTab.tsx'

/** Services required by the Snap Plugin Marketing browser surface. */
export const inject = ['slots', 'remote']

/** Register the lazy Snap Plugin Marketing tab in Harness's existing Plugins settings section. */
export async function apply(ctx: ClientContext): Promise<() => Promise<void>> {
  const disposeRemote = await ctx.remote.$mount(TYPERT_REMOTE)
  // The namespace is mounted by this plugin, so it cannot be listed in this
  // plugin's inject array without creating a startup cycle. Read the live
  // Service directly after mounting it instead of using the inject-guarded
  // `ctx.remote.pluginCenter` property.
  const pluginCenter = (ctx as unknown as { get(key: string): unknown }).get('remote.pluginCenter') as ClientContext['remote']['pluginCenter']
  const load: PluginCenterTabInjected['load'] = async () => {
    const [manifest, installed] = await Promise.all([
      pluginCenter.catalog(),
      pluginCenter.installed(),
    ])
    if (!manifest.ok) throw new Error(`${manifest.error.code}: ${manifest.error.message}`)
    if (!installed.ok) throw new Error(`${installed.error.code}: ${installed.error.message}`)
    return { manifest: manifest.value, installed: installed.value }
  }
  const install: PluginCenterTabInjected['install'] = async (pluginId) => {
    const result = await pluginCenter.installPlugin(pluginId)
    if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
    return result.value
  }
  const uninstall: PluginCenterTabInjected['uninstall'] = async (pluginId) => {
    const result = await pluginCenter.uninstallPlugin(pluginId)
    if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
    return result.value
  }

  ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
    name: 'settings.plugins.tab',
    id: 'snapmarketing',
    order: 0,
    label: 'Snap Plugin Marketing',
    inject: () => ({ load, install, uninstall }),
  }, PluginCenterTab))

  return async () => {
    await disposeRemote()
  }
}
