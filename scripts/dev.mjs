import { existsSync, mkdirSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolveDshHome } from './dsh-home.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SIGNAL_CLEANUP_TIMEOUT_MS = 2_000

/**
 * Resolve paths and flags for the isolated local development environment.
 * @param {{ env?: NodeJS.ProcessEnv, repoRoot?: string }} options
 */
export function resolveDevConfig({ env = process.env, repoRoot: root = repoRoot } = {}) {
  const resolvedRepoRoot = resolve(root)
  const webPort = env.DSH_PORT?.trim() || '3081'
  if (!/^\d+$/.test(webPort) || Number(webPort) < 1 || Number(webPort) > 65535) {
    throw new Error(`Invalid DSH_PORT "${webPort}"; expected an integer from 1 to 65535.`)
  }
  return {
    repoRoot: resolvedRepoRoot,
    harnessRoot: resolve(env.DSH_ROOT?.trim() || join(resolvedRepoRoot, '..', 'ChatGPT', 'deepseek-harness-demo')),
    dshHome: resolveDshHome({ env }),
    webPort,
    skipHarnessBuild: env.DSH_SKIP_HARNESS_BUILD === '1',
  }
}

/**
 * Build every pnpm command used by the dev entry.
 * @param {{ repoRoot: string, harnessRoot: string, dshHome: string, webPort: string, skipHarnessBuild: boolean }} config
 */
export function buildDevCommands(config) {
  const prepare = [
    { cwd: config.repoRoot, argv: ['build'] },
  ]
  if (!config.skipHarnessBuild) {
    prepare.push({ cwd: config.harnessRoot, argv: ['run', 'build'] })
  }
  prepare.push({
    cwd: config.harnessRoot,
    argv: [
      'dsh',
      'plugin',
      '--profile',
      'web',
      'add',
      `link:${join(config.repoRoot, 'packages', 'plugin-center')}`,
    ],
  })
  return {
    prepare,
    watch: {
      cwd: config.repoRoot,
      argv: ['--filter', '@snapmarketing/dsh-plugin-center', 'exec', 'tsdown', '--watch'],
    },
    web: {
      cwd: config.harnessRoot,
      argv: ['dsh', '--profile', 'web', '--port', config.webPort],
    },
  }
}

/**
 * Whether this module was launched directly by Node.
 * @param {string} [metaUrl]
 * @param {string} [argv1]
 */
export function isMainModule(metaUrl = import.meta.url, argv1 = process.argv[1]) {
  return argv1 !== undefined && metaUrl === pathToFileURL(resolve(argv1)).href
}

/**
 * Run one pnpm command and reject on spawn or process failure.
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
 * Validate the expected source checkout before starting any child process.
 * @param {string} harnessRoot
 */
function validateHarnessRoot(harnessRoot) {
  const requiredFiles = [
    join(harnessRoot, 'package.json'),
    join(harnessRoot, 'apps', 'cli', 'src', 'bin.ts'),
  ]
  const missing = requiredFiles.filter(file => !existsSync(file))
  if (missing.length > 0) {
    throw new Error(
      `Harness checkout not found at ${harnessRoot}. Set DSH_ROOT to the deepseek-harness checkout.`,
    )
  }
}

/**
 * Stop a child if it is still alive.
 * @param {import('node:child_process').ChildProcess} child
 * @param {NodeJS.Signals} signal
 */
function stopChild(child, signal) {
  if (child.exitCode === null && !child.killed) child.kill(signal)
}

/**
 * Run the watcher and Web process until one exits or the user interrupts.
 * @param {{ watch: { cwd: string, argv: string[] }, web: { cwd: string, argv: string[] } }} commands
 * @param {NodeJS.ProcessEnv} env
 */
function runLiveProcesses(commands, env) {
  const watcher = spawn('pnpm', commands.watch.argv, {
    cwd: commands.watch.cwd,
    env,
    stdio: 'inherit',
  })
  const web = spawn('pnpm', commands.web.argv, {
    cwd: commands.web.cwd,
    env,
    stdio: 'inherit',
  })
  const children = [watcher, web]

  return new Promise((resolveLive) => {
    let settled = false
    let interrupted = false
    let cleanupTimer

    const removeSignalHandlers = () => {
      process.removeListener('SIGINT', onSignal)
      process.removeListener('SIGTERM', onSignal)
      if (cleanupTimer !== undefined) clearTimeout(cleanupTimer)
    }

    const finish = (code) => {
      if (settled) return
      settled = true
      removeSignalHandlers()
      resolveLive(code)
    }

    const stopAll = (signal) => {
      for (const child of children) stopChild(child, signal)
    }

    const onSignal = () => {
      if (interrupted) return
      interrupted = true
      stopAll('SIGINT')
      cleanupTimer = setTimeout(() => {
        stopAll('SIGTERM')
        finish(0)
      }, SIGNAL_CLEANUP_TIMEOUT_MS)
    }

    const onChildError = (error) => {
      if (settled || interrupted) return
      console.error(`pnpm dev: ${error.message}`)
      stopAll('SIGTERM')
      finish(1)
    }

    const onChildExit = (code, signal) => {
      if (settled) return
      if (interrupted) {
        if (children.every(child => child.exitCode !== null)) finish(0)
        return
      }
      const exitCode = code === 0 ? 0 : 1
      if (exitCode !== 0) {
        stopAll('SIGTERM')
        console.error(`pnpm dev: live process exited${signal === null ? ` with code ${String(code)}` : ` after ${signal}`}`)
      }
      finish(exitCode)
    }

    process.once('SIGINT', onSignal)
    process.once('SIGTERM', onSignal)
    for (const child of children) {
      child.once('error', onChildError)
      child.once('exit', onChildExit)
    }
  })
}

async function main() {
  const config = resolveDevConfig()
  validateHarnessRoot(config.harnessRoot)
  mkdirSync(config.dshHome, { recursive: true })

  const commands = buildDevCommands(config)
  const env = { ...process.env, DSH_HOME: config.dshHome }
  for (const command of commands.prepare) await runCommand(command, env)

  console.log(`pnpm dev: Harness profile uses ${config.dshHome}`)
  console.log('pnpm dev: Client changes use HMR; Host/config changes require restarting pnpm dev.')
  const exitCode = await runLiveProcesses(commands, env)
  process.exitCode = exitCode
}

if (isMainModule()) {
  main().catch((error) => {
    console.error(`pnpm dev: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  })
}
