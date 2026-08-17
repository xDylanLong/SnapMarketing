export const PLUGIN_CENTER_STYLES = `
.sm-plugin-center {
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 2px 0 24px;
  color: var(--dsw-alias-label-primary);
  font-family: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
  font-size: 13px;
  line-height: 20px;
}

.sm-plugin-center *,
.sm-plugin-center *::before,
.sm-plugin-center *::after {
  box-sizing: border-box;
}

.sm-plugin-center button,
.sm-plugin-center input {
  font: inherit;
}

.sm-plugin-center__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}

.sm-plugin-center__brand img {
  width: 52px;
  height: 52px;
  object-fit: contain;
  flex: 0 0 auto;
}

.sm-plugin-center__brand h1 {
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 20px;
  font-weight: 650;
  line-height: 28px;
}

.sm-plugin-center__brand-copy {
  min-width: 0;
}

.sm-plugin-center__update {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-left: auto;
}

.sm-plugin-center__update-message {
  margin: -8px 0 14px;
  padding: 7px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent);
  color: var(--dsw-alias-state-success-primary);
  font-size: 12px;
  line-height: 18px;
}

.sm-plugin-center__update-message--error {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent);
  color: var(--dsw-alias-state-error-primary);
}

.sm-plugin-center__update-message--ready {
  background: color-mix(in srgb, var(--dsw-alias-state-info-primary) 12%, transparent);
  color: var(--dsw-alias-state-info-primary);
}

.sm-plugin-center__toolbar {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 14px;
  padding: 0 0 14px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}

.sm-plugin-center__intro {
  display: flex;
  align-items: baseline;
  gap: 9px;
  min-width: 0;
  white-space: nowrap;
}

.sm-plugin-center__intro p {
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}

.sm-plugin-center__count {
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.sm-plugin-center__search {
  display: grid;
  grid-template-columns: minmax(0, 240px) auto;
  align-items: center;
  justify-content: end;
  gap: 12px;
  width: min(360px, 100%);
  flex: 0 1 360px;
  margin-left: auto;
  min-width: 0;
}

.sm-plugin-center__categories {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 14px;
}

.sm-filter-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 14px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
}

.sm-filter-button:hover {
  border-color: var(--dsw-alias-label-dimmed);
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-filter-button:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 1px;
}

.sm-filter-button[aria-pressed='true'] {
  border-color: var(--dsw-alias-button-info-fill);
  background: color-mix(in srgb, var(--dsw-alias-button-info-fill) 14%, transparent);
  color: var(--dsw-alias-label-primary);
}

.sm-filter-button span {
  color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
}

.sm-input {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  max-width: 240px;
  height: 32px;
  min-width: 0;
  padding: 0 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
}

.sm-input:focus-within {
  border-color: var(--dsw-alias-brand-primary);
}

.sm-input input {
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  line-height: 22px;
}

.sm-input input::placeholder {
  color: var(--dsw-alias-label-tertiary);
}

.sm-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 18px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
  font-size: 14px;
  line-height: 22px;
  text-decoration: none;
  white-space: nowrap;
}

.sm-button:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
}

.sm-button:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 1px;
}

.sm-button--sm {
  height: 28px;
  padding: 0 10px;
  border-radius: 14px;
  font-size: 12px;
  line-height: 18px;
}

.sm-button--outline {
  border: 1px solid var(--dsw-alias-border-l2);
  background: transparent;
}

.sm-button--outline:hover:not(:disabled) {
  border-color: var(--dsw-alias-label-dimmed);
}

.sm-button--primary {
  background: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-label-primary-foreground);
}

.sm-button--primary:hover:not(:disabled) {
  background: var(--dsw-alias-button-primary-hover);
}

.sm-button--installed {
  border: 1px solid transparent;
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent);
  color: var(--dsw-alias-state-success-primary);
}

.sm-button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.sm-button--installed:disabled {
  cursor: default;
  opacity: 1;
}

.sm-plugin-center__grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sm-card {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 14px 16px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-3);
  transition: border-color 160ms, background 160ms, box-shadow 160ms, transform 160ms;
}

.sm-card:hover {
  border-color: var(--dsw-alias-label-dimmed);
  box-shadow: 0 4px 14px color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent);
  transform: translateY(-1px);
}

.sm-card__content {
  min-width: 0;
}

.sm-card__title-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.sm-card h3 {
  overflow: hidden;
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sm-card__meta {
  display: flex;
  align-items: center;
  gap: 5px;
  margin: 0;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}

.sm-card__description {
  display: -webkit-box;
  overflow: hidden;
  margin: 2px 0 0;
  color: var(--dsw-alias-label-secondary);
  font-size: 13px;
  line-height: 20px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.sm-card__categories {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 7px;
}

.sm-card__categories span {
  padding: 1px 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent);
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 17px;
}

.sm-card__progress {
  max-width: 360px;
  margin-top: 8px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
}

.sm-card__progress-header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 4px;
}

.sm-card__progress-track {
  overflow: hidden;
  height: 5px;
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-4);
}

.sm-card__progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--dsw-alias-brand-primary);
  transition: width 180ms ease-out;
}

.sm-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sm-card__message {
  margin: 7px 0 0;
  padding: 5px 8px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent);
  color: var(--dsw-alias-state-warn-label);
  font-size: 12px;
  line-height: 18px;
}

.sm-plugin-center__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--dsw-alias-border-l2);
}

.sm-plugin-center__pagination .sm-button {
  min-width: 32px;
  padding: 0 10px;
  color: var(--dsw-alias-label-tertiary);
  font-variant-numeric: tabular-nums;
}

.sm-plugin-center__pagination .sm-button:first-child,
.sm-plugin-center__pagination .sm-button:last-child {
  min-width: auto;
  padding: 0 10px;
}

.sm-plugin-center__pagination [aria-current='page'] {
  border-color: var(--dsw-alias-button-info-fill);
  background: var(--dsw-alias-button-info-fill);
  color: var(--dsw-alias-label-primary-foreground);
}

.sm-plugin-center__pagination-ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 28px;
  color: var(--dsw-alias-label-tertiary);
  font-size: 13px;
}

.sm-plugin-center__state {
  margin: 0;
  padding: 24px;
  border: 1px dashed var(--dsw-alias-border-l2);
  border-radius: 10px;
  color: var(--dsw-alias-label-tertiary);
  text-align: center;
}

.sm-plugin-center__error {
  color: var(--dsw-alias-state-error-primary);
}

.sm-plugin-center a {
  color: var(--dsw-alias-brand-text);
}

.sm-plugin-center a.sm-button {
  color: var(--dsw-alias-label-primary);
}

@media (max-width: 640px) {
  .sm-plugin-center__toolbar {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .sm-plugin-center__brand {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .sm-plugin-center__update {
    width: 100%;
    justify-content: flex-start;
    margin-left: 64px;
  }

  .sm-plugin-center__search {
    width: 100%;
    flex-basis: auto;
    margin-left: 0;
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .sm-input {
    max-width: none;
  }

  .sm-plugin-center__intro {
    white-space: normal;
  }

  .sm-card {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .sm-card__actions {
    justify-content: flex-start;
  }
}
`
