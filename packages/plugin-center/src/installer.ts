import { execFile } from 'node:child_process'
import type { HarnessPluginInstaller, InstallerResult } from './types.ts'

/** Options for invoking the installed Harness CLI. */
export interface DshCliInstallerOptions {
  readonly command?: string
  readonly commandArgs?: readonly string[]
  readonly profile: string
  readonly cwd?: string
  readonly timeoutMs?: number
  readonly environment?: NodeJS.ProcessEnv
}

function execute(
  command: string,
  args: readonly string[],
  options: Pick<DshCliInstallerOptions, 'cwd' | 'timeoutMs' | 'environment'>,
): Promise<InstallerResult> {
  return new Promise((resolve) => {
    execFile(command, [...args], {
      cwd: options.cwd,
      encoding: 'utf8',
      env: options.environment ?? process.env,
      timeout: options.timeoutMs ?? 120_000,
      windowsHide: true,
    }, (error, stdout, stderr) => {
      if (error !== null) {
        resolve({ ok: false, message: error.message, stdout, stderr })
        return
      }
      resolve({ ok: true, message: stdout.trim() || 'Harness plugin operation completed', stdout, stderr })
    })
  })
}

/** Delegate installation and removal to the existing `dsh plugin` CLI path. */
export function createDshCliInstaller(options: DshCliInstallerOptions): HarnessPluginInstaller {
  const command = options.command ?? 'dsh'
  const commandArgs = options.commandArgs ?? []
  return {
    install: source => execute(command, [...commandArgs, 'plugin', '--profile', options.profile, 'add', source], options),
    uninstall: source => execute(command, [...commandArgs, 'plugin', '--profile', options.profile, 'remove', source], options),
  }
}
