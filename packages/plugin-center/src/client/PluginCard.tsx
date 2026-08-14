import { useState, type ReactNode } from 'react'
import type { PluginMetadata } from '@snapmarketing/plugin-manifest'

export interface PluginCardActions {
  readonly installed: boolean
  readonly busy: boolean
  readonly onInstall: () => void
  readonly onUninstall: () => void
}

interface PluginCardProps extends PluginCardActions {
  readonly plugin: PluginMetadata
  readonly message?: string | undefined
}

/** Render one catalog card and its opt-in detail preview. */
export function PluginCard({ plugin, installed, busy, onInstall, onUninstall, message }: PluginCardProps): ReactNode {
  const [open, setOpen] = useState(false)
  return (
    <article data-plugin-id={plugin.id} data-installed={installed ? 'true' : 'false'}>
      <header>
        {plugin.icon ? <img src={plugin.icon} alt="" width="40" height="40" /> : <span aria-hidden="true">🧩</span>}
        <div>
          <h3>{plugin.name}</h3>
          <p>{plugin.hasUI ? 'UI 插件' : '能力插件'} · v{plugin.version}</p>
        </div>
      </header>
      <p>{plugin.description}</p>
      <p>作者：{plugin.author.name}</p>
      {plugin.tags?.length ? <p>标签：{plugin.tags.join(' · ')}</p> : null}
      <div>
        <button type="button" onClick={() => { setOpen(value => !value) }} aria-expanded={open}>
          {open ? '收起详情' : '查看详情'}
        </button>
        {installed ? (
          <button type="button" onClick={onUninstall} disabled={busy}>
            {busy ? '处理中…' : '卸载'}
          </button>
        ) : (
          <button type="button" onClick={onInstall} disabled={busy}>
            {busy ? '安装中…' : '安装'}
          </button>
        )}
      </div>
      {message ? <p role="alert">{message}</p> : null}
      {open ? (
        <section>
          <h4>插件详情</h4>
          {plugin.longDescription ? <p>{plugin.longDescription}</p> : null}
          <p><a href={plugin.repository} target="_blank" rel="noreferrer">GitHub 仓库</a></p>
          {plugin.screenshots?.length ? (
            <div aria-label="截图预览">
              {plugin.screenshots.map((src, index) => <img key={src} src={src} alt={`${plugin.name} preview ${index + 1}`} />)}
            </div>
          ) : null}
          {plugin.usage ? (
            <div>
              <h4>使用说明</h4>
              <p>{plugin.usage.summary}</p>
              {plugin.usage.examples?.map(example => <code key={example}>{example}</code>)}
            </div>
          ) : null}
          {plugin.placement?.enabled ? <p>支持位置：{plugin.placement.slots?.join('、')}</p> : null}
        </section>
      ) : null}
    </article>
  )
}
