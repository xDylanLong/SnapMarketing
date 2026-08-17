import type { ReactNode } from 'react'
import type { PluginMetadata } from '@snapmarketing/plugin-manifest'

export interface InstallProgress {
  readonly percent: number
  readonly label: string
}

export interface PluginCardActions {
  readonly installed: boolean
  readonly busy: boolean
  readonly onInstall: () => void
  readonly progress?: InstallProgress | undefined
}

interface PluginCardProps extends PluginCardActions {
  readonly plugin: PluginMetadata
  readonly message?: string | undefined
}

/** Render one compact catalog row with repository and install actions. */
export function PluginCard({ plugin, installed, busy, onInstall, progress, message }: PluginCardProps): ReactNode {
  return (
    <article className="sm-card" data-plugin-id={plugin.id} data-installed={installed ? 'true' : 'false'}>
      <div className="sm-card__content">
        <div className="sm-card__title-row">
          <h3>{plugin.name}</h3>
          <p className="sm-card__meta">v{plugin.version}</p>
        </div>
        <p className="sm-card__description">{plugin.description}</p>
        {plugin.marketingCategories?.length ? (
          <div className="sm-card__categories" aria-label="营销场景分类">
            {plugin.marketingCategories.map(category => <span key={category}>{category}</span>)}
          </div>
        ) : null}
        {progress ? (
          <div className="sm-card__progress" aria-label={`${plugin.name} 安装进度`}>
            <div className="sm-card__progress-header"><span>{progress.label}</span><span>{progress.percent}%</span></div>
            <div className="sm-card__progress-track" role="progressbar" aria-label={`${plugin.name} 安装进度`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.percent}>
              <span style={{ width: `${progress.percent}%` }} />
            </div>
          </div>
        ) : null}
        {message ? <p className="sm-card__message" role="alert">{message}</p> : null}
      </div>
      <div className="sm-card__actions">
        <a className="sm-button sm-button--sm sm-button--outline" href={plugin.repository} target="_blank" rel="noreferrer">查看</a>
        {installed ? (
          <button className="sm-button sm-button--sm sm-button--installed" type="button" disabled>已安装</button>
        ) : (
          <button className="sm-button sm-button--sm sm-button--primary" type="button" onClick={onInstall} disabled={busy}>
            {busy ? '安装中…' : '安装'}
          </button>
        )}
      </div>
    </article>
  )
}
