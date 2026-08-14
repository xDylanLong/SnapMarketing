import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-api-gateway/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '../remote.ts'
import { PluginCenterTab, type PluginCenterTabInjected } from './PluginCenterTab.tsx'

export type { PluginCenterTabInjected, PluginCenterTabProps } from './PluginCenterTab.tsx'

/** Services required by the Plugin Center browser surface. */
export const inject = ['slots', 'remote', 'remote.pluginCenter']

/** Register the lazy Plugin Center tab in Harness's existing Plugins settings section. */
export function apply(ctx: ClientContext): void {
  const load: PluginCenterTabInjected['load'] = async () => {
    const [manifest, installed] = await Promise.all([
      ctx.remote.pluginCenter.catalog(),
      ctx.remote.pluginCenter.installed(),
    ])
    if (!manifest.ok) throw new Error(`${manifest.error.code}: ${manifest.error.message}`)
    if (!installed.ok) throw new Error(`${installed.error.code}: ${installed.error.message}`)
    return { manifest: manifest.value, installed: installed.value }
  }
  const install: PluginCenterTabInjected['install'] = async (pluginId) => {
    const result = await ctx.remote.pluginCenter.install(pluginId)
    if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
    return result.value
  }
  const uninstall: PluginCenterTabInjected['uninstall'] = async (pluginId) => {
    const result = await ctx.remote.pluginCenter.uninstall(pluginId)
    if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
    return result.value
  }

  ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
    name: 'settings.plugins.tab',
    id: 'snapmarketing',
    order: 0,
    label: 'Plugin Center',
    inject: () => ({ load, install, uninstall }),
  }, PluginCenterTab))
}
