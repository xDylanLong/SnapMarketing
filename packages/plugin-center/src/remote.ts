import { z } from 'zod'
import type { RemoteResult, TypertRemoteNamespace } from '@deepseek-ai/dsh-typert-protocol'
import type { PluginManifest } from '@snapmarketing/plugin-manifest'
import { PluginManifestSchema } from '@snapmarketing/plugin-manifest'
import type { InstalledPlugin, PluginOperationResult } from './types.ts'

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
      id: '@snapmarketing/dsh-plugin-center#pluginCenter/install',
      service: 'pluginCenter', namespace: 'pluginCenter', method: 'install', invocation: { kind: 'direct' },
      parameters: [{ name: 'pluginId', wire: 'pluginId', source: 'json', codec: { mode: 'strict', typeSymbol: 'string', schema: z.string() } }],
      result: { mode: 'strict', typeSymbol: '@snapmarketing/dsh-plugin-center#PluginOperationResult', schema: OperationSchema },
    },
    {
      id: '@snapmarketing/dsh-plugin-center#pluginCenter/uninstall',
      service: 'pluginCenter', namespace: 'pluginCenter', method: 'uninstall', invocation: { kind: 'direct' },
      parameters: [{ name: 'pluginId', wire: 'pluginId', source: 'json', codec: { mode: 'strict', typeSymbol: 'string', schema: z.string() } }],
      result: { mode: 'strict', typeSymbol: '@snapmarketing/dsh-plugin-center#PluginOperationResult', schema: OperationSchema },
    },
  ],
} as const

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface TypertRemoteMap {
      'pluginCenter/catalog': () => Promise<import('@deepseek-ai/dsh-typert-protocol').RemoteResult<PluginManifest>>
    'pluginCenter/installed': () => Promise<import('@deepseek-ai/dsh-typert-protocol').RemoteResult<readonly InstalledPlugin[]>>
    'pluginCenter/install': (pluginId: string) => Promise<import('@deepseek-ai/dsh-typert-protocol').RemoteResult<PluginOperationResult>>
    'pluginCenter/uninstall': (pluginId: string) => Promise<import('@deepseek-ai/dsh-typert-protocol').RemoteResult<PluginOperationResult>>
  }
  interface TypertRemoteNamespaceMap {
    pluginCenter: import('@deepseek-ai/dsh-typert-protocol').TypertRemoteNamespace<'pluginCenter'>
  }
}

export default TYPERT_REMOTE
