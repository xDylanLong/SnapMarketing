import { execFile } from 'node:child_process'
import type { HarnessPluginInstaller, InstallerResult } from './types.ts'

/** Options for invoking the installed Harness CLI. */
export interface DshCliInstallerOptions {
  readonly command?: string
  readonly profile: string
  readonly cwd?: string
}

function execute(command: string, args: readonly string[], cwd: string | undefined): Promise<InstallerResult> {
  return new Promise((resolve) => {
    execFile(command, [...args], { cwd, encoding: 'utf8' }, (error, stdout, stderr) => {
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
  return {
    install: source => execute(command, ['plugin', '--profile', options.profile, 'add', source], options.cwd),
    uninstall: source => execute(command, ['plugin', '--profile', options.profile, 'remove', source], options.cwd),
  }
}
