import { z } from 'zod'
import type { RemoteResult, TypertRemoteNamespace } from '@deepseek-ai/dsh-typert-protocol'
import type { PluginManifest } from '@snapmarketing/plugin-manifest'
import { PluginManifestSchema } from '@snapmarketing/plugin-manifest'
import type { InstalledPlugin, PluginOperationResult, SnapMarketingUpdateResult, SnapMarketingUpdateStatus, SnapMarketingVersion } from './types.ts'

const InstalledPluginSchema = z.object({
  pluginId: z.string(),
  packageName: z.string(),
  moduleName: z.string(),
  enabled: z.boolean(),
  phase: z.enum(['active', 'disabled', 'unobserved']),
}).strict()

const OperationSchema = z.object({
  pluginId: z.string(),
  status: z.enum(['installed', 'removed', 'failed']),
  needsReload: z.boolean(),
  message: z.string(),
}).strict()

const SnapMarketingVersionSchema = z.object({ currentVersion: z.string().min(1) }).strict()
const SnapMarketingUpdateStatusSchema = SnapMarketingVersionSchema.extend({
  latestVersion: z.string().min(1),
  updateAvailable: z.boolean(),
}).strict()
const SnapMarketingUpdateResultSchema = z.object({
  status: z.enum(['updated', 'failed']),
  needsReload: z.boolean(),
  message: z.string(),
}).strict()

export const TYPERT_REMOTE = {
  package: '@snapmarketing/dsh-plugin-center',
  descriptors: [
    {
      id: '@snapmarketing/dsh-plugin-center#pluginCenter/catalog',
      service: 'pluginCenter', namespace: 'pluginCenter', method: 'catalog', invocation: { kind: 'direct' }, parameters: [],
      result: { mode: 'strict', typeSymbol: '@snapmarketing/plugin-manifest#PluginManifest', schema: PluginManifestSchema },
    },
    {
      id: '@snapmarketing/dsh-plugin-center#pluginCenter/installed',
      service: 'pluginCenter', namespace: 'pluginCenter', method: 'installed', invocation: { kind: 'direct' }, parameters: [],
      result: { mode: 'strict', typeSymbol: '@snapmarketing/dsh-plugin-center#InstalledPlugin[]', schema: z.array(InstalledPluginSchema).readonly() },
    },
    {
      id: '@snapmarketing/dsh-plugin-center#pluginCenter/installPlugin',
      service: 'pluginCenter', namespace: 'pluginCenter', method: 'installPlugin', implementation: 'install', invocation: { kind: 'direct' },
      parameters: [{ name: 'pluginId', wire: 'pluginId', source: 'json', codec: { mode: 'strict', typeSymbol: 'string', schema: z.string() } }],
      result: { mode: 'strict', typeSymbol: '@snapmarketing/dsh-plugin-center#PluginOperationResult', schema: OperationSchema },
    },
    {
      id: '@snapmarketing/dsh-plugin-center#pluginCenter/uninstallPlugin',
      service: 'pluginCenter', namespace: 'pluginCenter', method: 'uninstallPlugin', implementation: 'uninstall', invocation: { kind: 'direct' },
      parameters: [{ name: 'pluginId', wire: 'pluginId', source: 'json', codec: { mode: 'strict', typeSymbol: 'string', schema: z.string() } }],
      result: { mode: 'strict', typeSymbol: '@snapmarketing/dsh-plugin-center#PluginOperationResult', schema: OperationSchema },
    },
    {
      id: '@snapmarketing/dsh-plugin-center#pluginCenter/currentVersion',
      service: 'pluginCenter', namespace: 'pluginCenter', method: 'currentVersion', invocation: { kind: 'direct' }, parameters: [],
      result: { mode: 'strict', typeSymbol: '@snapmarketing/dsh-plugin-center#SnapMarketingVersion', schema: SnapMarketingVersionSchema },
    },
    {
      id: '@snapmarketing/dsh-plugin-center#pluginCenter/updateStatus',
      service: 'pluginCenter', namespace: 'pluginCenter', method: 'updateStatus', invocation: { kind: 'direct' }, parameters: [],
      result: { mode: 'strict', typeSymbol: '@snapmarketing/dsh-plugin-center#SnapMarketingUpdateStatus', schema: SnapMarketingUpdateStatusSchema },
    },
    {
      id: '@snapmarketing/dsh-plugin-center#pluginCenter/updateSelf',
      service: 'pluginCenter', namespace: 'pluginCenter', method: 'updateSelf', invocation: { kind: 'direct' }, parameters: [],
      result: { mode: 'strict', typeSymbol: '@snapmarketing/dsh-plugin-center#SnapMarketingUpdateResult', schema: SnapMarketingUpdateResultSchema },
    },
  ],
} as const

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface TypertRemoteMap {
      'pluginCenter/catalog': () => Promise<import('@deepseek-ai/dsh-typert-protocol').RemoteResult<PluginManifest>>
    'pluginCenter/installed': () => Promise<import('@deepseek-ai/dsh-typert-protocol').RemoteResult<readonly InstalledPlugin[]>>
    'pluginCenter/installPlugin': (pluginId: string) => Promise<import('@deepseek-ai/dsh-typert-protocol').RemoteResult<PluginOperationResult>>
    'pluginCenter/uninstallPlugin': (pluginId: string) => Promise<import('@deepseek-ai/dsh-typert-protocol').RemoteResult<PluginOperationResult>>
    'pluginCenter/currentVersion': () => Promise<import('@deepseek-ai/dsh-typert-protocol').RemoteResult<SnapMarketingVersion>>
    'pluginCenter/updateStatus': () => Promise<import('@deepseek-ai/dsh-typert-protocol').RemoteResult<SnapMarketingUpdateStatus>>
    'pluginCenter/updateSelf': () => Promise<import('@deepseek-ai/dsh-typert-protocol').RemoteResult<SnapMarketingUpdateResult>>
  }
  interface TypertRemoteNamespaceMap {
    pluginCenter: import('@deepseek-ai/dsh-typert-protocol').TypertRemoteNamespace<'pluginCenter'>
  }
}

export default TYPERT_REMOTE
