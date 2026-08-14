import { z } from 'zod'

const url = z.string().url()
const isoDate = z.string().datetime({ offset: true })

/** The two catalog categories supported by Manifest V1. */
export const PluginCategorySchema = z.enum(['ui', 'capability'])
export type PluginCategory = z.infer<typeof PluginCategorySchema>

/** Package installation source delegated to Harness. */
export const InstallSchema = z.object({
  type: z.literal('package'),
  source: z.string().min(1),
}).strict()

/** Optional placement information declared by a UI plugin. */
export const PlacementSchema = z.object({
  enabled: z.boolean(),
  slots: z.array(z.string().min(1)).min(1).optional(),
  defaultSlot: z.string().min(1).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.enabled && value.slots === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'enabled placement must declare slots' })
  }
  if (value.defaultSlot !== undefined && !value.slots?.includes(value.defaultSlot)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'defaultSlot must be included in slots' })
  }
})

/** Author metadata shown in the Plugin Center. */
export const AuthorSchema = z.object({
  name: z.string().min(1),
  url,
}).strict()

/** Optional instructions rendered on a plugin detail view. */
export const UsageSchema = z.object({
  summary: z.string().min(1),
  examples: z.array(z.string().min(1)).min(1).optional(),
}).strict()

/** One allowlisted plugin in a Manifest V1 catalog. */
export const PluginMetadataSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  name: z.string().min(1),
  description: z.string().min(1),
  longDescription: z.string().min(1).optional(),
  author: AuthorSchema,
  repository: url,
  version: z.string().min(1),
  install: InstallSchema,
  hasUI: z.boolean(),
  category: PluginCategorySchema,
  tags: z.array(z.string().min(1)).optional(),
  icon: url.optional(),
  screenshots: z.array(url).optional(),
  usage: UsageSchema.optional(),
  placement: PlacementSchema.optional(),
}).strict()

/** Static catalog document consumed by the Host. */
export const PluginManifestSchema = z.object({
  schemaVersion: z.literal('1.0'),
  updatedAt: isoDate,
  plugins: z.array(PluginMetadataSchema),
}).strict()

export type InstallSpec = z.infer<typeof InstallSchema>
export type PlacementMetadata = z.infer<typeof PlacementSchema>
export type PluginAuthor = z.infer<typeof AuthorSchema>
export type PluginUsage = z.infer<typeof UsageSchema>
export type PluginMetadata = z.infer<typeof PluginMetadataSchema>
export type PluginManifest = z.infer<typeof PluginManifestSchema>

export { assertInstallable, packageNameFromSource } from './policy.ts'

/** Parse and cross-check one untrusted Manifest document. */
export function parseManifest(input: unknown): PluginManifest {
  const manifest = PluginManifestSchema.parse(input)
  const ids = new Set<string>()
  for (const plugin of manifest.plugins) {
    if (ids.has(plugin.id)) {
      throw new Error(`manifest contains duplicate plugin id "${plugin.id}"`)
    }
    ids.add(plugin.id)
    const expectedCategory: PluginCategory = plugin.hasUI ? 'ui' : 'capability'
    if (plugin.category !== expectedCategory) {
      throw new Error(
        `plugin "${plugin.id}" category must be "${expectedCategory}" when hasUI is ${String(plugin.hasUI)}`,
      )
    }
    if (!plugin.hasUI && plugin.placement !== undefined) {
      throw new Error(`capability plugin "${plugin.id}" cannot declare placement metadata`)
    }
  }
  return manifest
}

/** Filter a catalog for the Plugin Center list view. */
export function filterPlugins(
  plugins: readonly PluginMetadata[],
  filter: {
    readonly category?: 'all' | PluginCategory | 'installed'
    readonly query?: string
    readonly tag?: string
  },
  installedIds: ReadonlySet<string> = new Set(),
): readonly PluginMetadata[] {
  const query = filter.query?.trim().toLocaleLowerCase()
  return plugins.filter((plugin) => {
    if (filter.category === 'ui' && !plugin.hasUI) return false
    if (filter.category === 'capability' && plugin.hasUI) return false
    if (filter.category === 'installed' && !installedIds.has(plugin.id)) return false
    if (filter.tag !== undefined && !plugin.tags?.includes(filter.tag)) return false
    if (query === undefined || query === '') return true
    return [plugin.name, plugin.description, plugin.longDescription, ...(plugin.tags ?? [])]
      .filter((value): value is string => value !== undefined)
      .some(value => value.toLocaleLowerCase().includes(query))
  })
}
