import { readFile } from 'node:fs/promises'
import { executeDshCommand, type DshCliInstallerOptions } from './installer.ts'
import type { InstallerResult, SnapMarketingUpdateResult, SnapMarketingUpdateStatus, SnapMarketingVersion } from './types.ts'

export const SNAPMARKETING_PACKAGE_NAME = '@snapmarketing/dsh-plugin-center'

const PACKAGE_MANIFEST_URL = new URL('../package.json', import.meta.url)
const SEMVER_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/

interface PackageManifest {
  readonly version?: unknown
}

interface ParsedVersion {
  readonly major: number
  readonly minor: number
  readonly patch: number
  readonly prerelease: readonly (string | number)[]
}

export interface SnapMarketingUpdater {
  currentVersion(): Promise<SnapMarketingVersion>
  check(): Promise<SnapMarketingUpdateStatus>
  update(): Promise<SnapMarketingUpdateResult>
}

/** Read the version from the package currently executing the Host bundle. */
export async function readSnapMarketingVersion(): Promise<SnapMarketingVersion> {
  const body = await readFile(PACKAGE_MANIFEST_URL, 'utf8')
  const manifest = JSON.parse(body) as PackageManifest
  if (typeof manifest.version !== 'string' || parseVersion(manifest.version) === undefined) {
    throw new Error('SnapMarketing package.json does not contain a valid semver version')
  }
  return { currentVersion: manifest.version }
}

/** Create the fixed-package update flow used by the SnapMarketing UI. */
export function createSnapMarketingUpdater(options: DshCliInstallerOptions): SnapMarketingUpdater {
  const command = options.command ?? 'dsh'
  const commandArgs = options.commandArgs ?? []
  const run = (args: readonly string[]): Promise<InstallerResult> => executeDshCommand(
    command,
    [...commandArgs, 'plugin', '--profile', options.profile, ...args],
    options,
  )

  return {
    currentVersion: readSnapMarketingVersion,
    check: async () => {
      const current = await readSnapMarketingVersion()
      const result = await run(['view', SNAPMARKETING_PACKAGE_NAME, 'version', '--json'])
      if (!result.ok) throw new Error(result.message ?? '无法查询 SnapMarketing 最新版本')
      const latestVersion = parseRegistryVersion(result.stdout ?? result.message ?? '')
      if (latestVersion === undefined) throw new Error('npm 返回的 SnapMarketing 版本无效')
      return {
        ...current,
        latestVersion,
        updateAvailable: compareVersions(latestVersion, current.currentVersion) > 0,
      }
    },
    update: async () => {
      const result = await run(['update', '--latest', SNAPMARKETING_PACKAGE_NAME])
      if (!result.ok) {
        return {
          status: 'failed',
          needsReload: false,
          message: result.message ?? 'SnapMarketing 更新失败',
        }
      }
      return {
        status: 'updated',
        needsReload: true,
        message: 'SnapMarketing 已更新，请重启或刷新 Harness',
      }
    },
  }
}

function parseRegistryVersion(output: string): string | undefined {
  const trimmed = output.trim()
  if (trimmed === '') return undefined
  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (typeof parsed === 'string' && parseVersion(parsed) !== undefined) return parsed
    if (Array.isArray(parsed)) {
      const version = parsed.find((item): item is string => typeof item === 'string' && parseVersion(item) !== undefined)
      if (version !== undefined) return version
    }
  } catch {
    // Some pnpm versions print a plain version even with --json.
  }
  const line = trimmed.split(/\r?\n/).reverse().find(candidate => parseVersion(candidate.trim()) !== undefined)
  return line?.trim()
}

function parseVersion(version: string): ParsedVersion | undefined {
  const match = SEMVER_PATTERN.exec(version.trim())
  if (match === null) return undefined
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] === undefined ? [] : match[4].split('.').map(part => /^\d+$/.test(part) ? Number(part) : part),
  }
}

function compareVersions(left: string, right: string): number {
  const leftParsed = parseVersion(left)
  const rightParsed = parseVersion(right)
  if (leftParsed === undefined || rightParsed === undefined) return 0
  for (const key of ['major', 'minor', 'patch'] as const) {
    if (leftParsed[key] !== rightParsed[key]) return leftParsed[key] > rightParsed[key] ? 1 : -1
  }
  if (leftParsed.prerelease.length === 0 && rightParsed.prerelease.length > 0) return 1
  if (leftParsed.prerelease.length > 0 && rightParsed.prerelease.length === 0) return -1
  for (let index = 0; index < Math.max(leftParsed.prerelease.length, rightParsed.prerelease.length); index += 1) {
    const leftPart = leftParsed.prerelease[index]
    const rightPart = rightParsed.prerelease[index]
    if (leftPart === undefined) return -1
    if (rightPart === undefined) return 1
    if (leftPart === rightPart) continue
    if (typeof leftPart === 'number' && typeof rightPart === 'string') return -1
    if (typeof leftPart === 'string' && typeof rightPart === 'number') return 1
    return leftPart > rightPart ? 1 : -1
  }
  return 0
}
