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
    <article className="sm-card" data-plugin-id={plugin.id} data-installed={installed ? 'true' : 'false'}>
      <header className="sm-card__header">
        {plugin.icon ? <img className="sm-card__icon" src={plugin.icon} alt="" width="42" height="42" /> : <span className="sm-card__icon" aria-hidden="true">🧩</span>}
        <div>
          <h3>{plugin.name}</h3>
          <p className="sm-card__meta">
            <span className="sm-visually-hidden">{plugin.hasUI ? 'UI 插件' : '能力插件'} · v{plugin.version}</span>
            <span className="sm-badge" aria-hidden="true">{plugin.hasUI ? 'UI 插件' : '能力插件'}</span>
            <span className={`sm-badge ${installed ? 'sm-badge--installed' : 'sm-badge--idle'}`}>{installed ? '已安装' : '未安装'}</span>
            <span aria-hidden="true">v{plugin.version}</span>
          </p>
        </div>
      </header>
      <p className="sm-card__description">{plugin.description}</p>
      <p className="sm-card__author">作者：{plugin.author.name}</p>
      {plugin.tags?.length ? <div className="sm-card__tags">{plugin.tags.map(tag => <span className="sm-card__tag" key={tag}>{tag}</span>)}</div> : null}
      <div className="sm-card__actions">
        <button className="sm-button" type="button" onClick={() => { setOpen(value => !value) }} aria-expanded={open}>
          {open ? '收起详情' : '查看详情'}
        </button>
        {installed ? (
          <button className="sm-button sm-button--danger" type="button" onClick={onUninstall} disabled={busy}>
            {busy ? '处理中…' : '卸载'}
          </button>
        ) : (
          <button className="sm-button sm-button--primary" type="button" onClick={onInstall} disabled={busy}>
            {busy ? '安装中…' : '安装'}
          </button>
        )}
      </div>
      {message ? <p className="sm-card__message" role="alert">{message}</p> : null}
      {open ? (
        <section className="sm-card__details">
          <h4>插件详情</h4>
          {plugin.longDescription ? <p>{plugin.longDescription}</p> : null}
          <p>{plugin.hasUI
            ? '安装后插件会按自身设计接入 Harness；Plugin Center 不改变它的界面与交互。'
            : '该插件没有独立界面，安装后可通过 Agent 或对应工作流使用。'}</p>
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
