import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { TYPERT_REMOTE } from '../remote.ts'
import { PluginCenterTab, type PluginCenterTabInjected } from './PluginCenterTab.tsx'
import { PLUGIN_CENTER_STYLES } from './styles.ts'

export type { PluginCenterTabInjected, PluginCenterTabProps } from './PluginCenterTab.tsx'

/** Services required by the Snap Plugin Marketing browser surface. */
export const inject = ['slots', 'remote']

const STYLE_SELECTOR = 'style[data-snapmarketing-plugin-center]'

/** Mount the client-only stylesheet once and remove it with the plugin. */
function mountStyles(): () => void {
  if (typeof document === 'undefined' || document.querySelector(STYLE_SELECTOR) !== null) return () => {}
  const style = document.createElement('style')
  style.setAttribute('data-snapmarketing-plugin-center', 'true')
  style.textContent = PLUGIN_CENTER_STYLES
  document.head.appendChild(style)
  return () => { style.remove() }
}

/** Register the lazy SnapMarketing Plugin Market page in Harness Settings. */
export async function apply(ctx: ClientContext): Promise<() => Promise<void>> {
  const disposeRemote = await ctx.remote.$mount(TYPERT_REMOTE)
  const disposeStyles = mountStyles()
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
  const updateStatus: NonNullable<PluginCenterTabInjected['updateStatus']> = async () => {
    const result = await pluginCenter.updateStatus()
    if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
    return result.value
  }
  const updateSelf: NonNullable<PluginCenterTabInjected['updateSelf']> = async () => {
    const result = await pluginCenter.updateSelf()
    if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
    return result.value
  }

  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'plugin-market',
    order: 21,
    label: '插件市场',
    inject: () => ({ load, install, uninstall, updateStatus, updateSelf }),
  }, PluginCenterTab))

  return async () => {
    disposeStyles()
    await disposeRemote()
  }
}
