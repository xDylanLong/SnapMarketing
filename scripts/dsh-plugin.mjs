import { existsSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolveDshHome } from './dsh-home.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PROFILE = 'web'
const PLUGIN_NAME = '@snapmarketing/dsh-plugin-center'

/**
 * Resolve paths and the inherited environment for the current plugin command.
 * @param {{ env?: NodeJS.ProcessEnv, repoRoot?: string }} options
 */
export function resolvePluginConfig({ env = process.env, repoRoot: root = repoRoot } = {}) {
  const resolvedRepoRoot = resolve(root)
  const childEnv = { ...process.env, ...env, DSH_HOME: resolveDshHome({ env }) }
  return {
    repoRoot: resolvedRepoRoot,
    harnessRoot: resolve(env.DSH_ROOT?.trim() || join(resolvedRepoRoot, '..', 'ChatGPT', 'deepseek-harness-demo')),
    pluginRoot: resolve(resolvedRepoRoot, 'packages', 'plugin-center'),
    env: childEnv,
  }
}

/**
 * Build the one DSH command for a fixed action on this project's plugin.
 * @param {'add'|'remove'} action
 * @param {{ harnessRoot: string, pluginRoot: string }} config
 */
export function buildPluginCommand(action, config) {
  if (action === 'add') {
    return {
      cwd: config.harnessRoot,
      argv: ['dsh', 'plugin', '--profile', PROFILE, 'add', `link:${config.pluginRoot}`],
    }
  }
  if (action === 'remove') {
    return {
      cwd: config.harnessRoot,
      argv: ['dsh', 'plugin', '--profile', PROFILE, 'remove', PLUGIN_NAME],
    }
  }
  throw new Error(`Unsupported DSH plugin action "${String(action)}"; expected add or remove.`)
}

/**
 * Validate the expected source checkout before starting DSH.
 * @param {string} harnessRoot
 */
export function validateHarnessRoot(harnessRoot) {
  const requiredFiles = [
    join(harnessRoot, 'package.json'),
    join(harnessRoot, 'apps', 'cli', 'src', 'bin.ts'),
  ]
  if (requiredFiles.some(file => !existsSync(file))) {
    throw new Error(
      `Harness checkout not found at ${harnessRoot}. Set DSH_ROOT to the deepseek-harness checkout.`,
    )
  }
}

/**
 * Run one command and reject on spawn or process failure.
 * @param {{ cwd: string, argv: string[] }} command
 * @param {NodeJS.ProcessEnv} env
 */
function runCommand(command, env) {
  return new Promise((resolveCommand, rejectCommand) => {
    const child = spawn('pnpm', command.argv, {
      cwd: command.cwd,
      env,
      stdio: 'inherit',
    })
    child.once('error', rejectCommand)
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolveCommand()
        return
      }
      rejectCommand(new Error(
        `pnpm ${command.argv.join(' ')} failed${signal === null ? ` with exit code ${String(code)}` : ` after ${signal}`}`,
      ))
    })
  })
}

/**
 * Whether this module was launched directly by Node.
 * @param {string} [metaUrl]
 * @param {string} [argv1]
 */
export function isMainModule(metaUrl = import.meta.url, argv1 = process.argv[1]) {
  return argv1 !== undefined && metaUrl === pathToFileURL(resolve(argv1)).href
}

async function main() {
  const [action, ...extraArgs] = process.argv.slice(2)
  if ((action !== 'add' && action !== 'remove') || extraArgs.length > 0) {
    throw new Error('Usage: pnpm dsh:add | pnpm dsh:remove')
  }

  const config = resolvePluginConfig()
  validateHarnessRoot(config.harnessRoot)
  await runCommand(buildPluginCommand(action, config), config.env)
}

if (isMainModule()) {
  main().catch((error) => {
    console.error(`pnpm dsh:${process.argv[2] || 'plugin'}: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  })
}
