import { z } from 'zod'

const localizedString = z.union([z.string(), z.record(z.string())])

export const tenantConfigurationSchema = z.object({
  siteName: localizedString,
  widgets: z.array(z.object({ blockId: z.string() })).optional().default([]),
}).passthrough()

export const createJobSchema = z.object({
  tenantConfiguration: tenantConfigurationSchema,
})
