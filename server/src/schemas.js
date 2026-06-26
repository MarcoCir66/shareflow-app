import { z } from 'zod'

const localizedString = z.union([z.string(), z.record(z.string())])

const widgetSchema = z.object({
  instanceId: z.string().optional(),
  blockId: z.string(),
  props: z.record(z.unknown()).optional(),
  dataSource: z.object({
    type: z.string().optional(),
    url: z.string().optional(),
  }).optional(),
}).passthrough()

const columnSchema = z.object({
  columnId: z.string().optional(),
  widgets: z.array(widgetSchema).default([]),
}).passthrough()

const sectionSchema = z.object({
  sectionId: z.string().optional(),
  layout: z.string().default('oneColumn'),
  columns: z.array(columnSchema).default([]),
}).passthrough()

const pageSchema = z.object({
  pageId: z.string().optional(),
  title: localizedString.optional(),
  slug: z.string().optional(),
  sections: z.array(sectionSchema).default([]),
}).passthrough()

export const tenantConfigurationSchema = z.object({
  siteName: localizedString,
  pages: z.array(pageSchema).optional().default([]),
  widgets: z.array(widgetSchema).optional().default([]),
}).passthrough()

export const createJobSchema = z.object({
  tenantConfiguration: tenantConfigurationSchema,
})
