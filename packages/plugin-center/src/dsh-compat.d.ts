declare module '@deepseek-ai/cordis' {
  export class Context {
    readonly loader: { entries(): readonly unknown[] }
  }
}

declare module '@deepseek-ai/cordis-plugin-loader' {}

declare module '@deepseek-ai/dsh-typert-protocol' {
  export interface TypertRemoteMap {}
  export interface TypertRemoteNamespaceMap {}
  export type RemoteResult<T> =
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } }
  export type TypertRemoteNamespace<Namespace extends string> = Namespace extends 'pluginCenter'
    ? {
      readonly catalog: () => Promise<RemoteResult<import('@snapmarketing/plugin-manifest').PluginManifest>>
      readonly installed: () => Promise<RemoteResult<readonly import('./types.ts').InstalledPlugin[]>>
      readonly installPlugin: (pluginId: string) => Promise<RemoteResult<import('./types.ts').PluginOperationResult>>
      readonly uninstallPlugin: (pluginId: string) => Promise<RemoteResult<import('./types.ts').PluginOperationResult>>
    }
    : Record<string, never>
  export class TypertRemoteService {
    protected readonly ctx: import('@deepseek-ai/cordis').Context
    constructor(ctx: import('@deepseek-ai/cordis').Context, serviceKey: string)
  }
}

declare module '@deepseek-ai/dsh-api-gateway/client' {}

declare module '@deepseek-ai/dsh-client-ui-settings/client' {}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  export interface SlotContext {
    inject(name: string, factory: () => unknown): void
    register(options: Record<string, unknown>, component: unknown): unknown
  }
  export type InjectFace<T> = T
  export type PropsRuntime<_Name extends string> = Record<string, unknown>
}

declare module '@deepseek-ai/dsh-client-runtime/client' {
  export interface ClientContext {
    readonly slots: import('@deepseek-ai/dsh-client-ui-slots').SlotContext
    readonly remote: {
      $mount(contribution: unknown): Promise<() => Promise<void>>
      readonly pluginCenter: import('@deepseek-ai/dsh-typert-protocol').TypertRemoteNamespace<'pluginCenter'>
    }
  }
}
