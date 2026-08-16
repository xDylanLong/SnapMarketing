import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const DEFAULT_DSH_HOME = 'dsh-snapmarketing-dsh-home'

/**
 * Resolve the shared isolated development home used by plugin management and pnpm dev.
 * @param {{ env?: NodeJS.ProcessEnv }} options
 */
export function resolveDshHome({ env = process.env } = {}) {
  return resolve(env.DSH_HOME?.trim() || join(tmpdir(), DEFAULT_DSH_HOME))
}
