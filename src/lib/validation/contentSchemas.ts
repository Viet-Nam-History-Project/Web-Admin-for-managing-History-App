import { z } from 'zod';

export const statusSchema = z.enum(['draft', 'published', 'archived', 'deleted']).default('draft');

export const slugSchema = z
  .string()
  .min(2, 'Slug phải có ít nhất 2 ký tự')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang');

const stringList = z.array(z.string().trim().min(1)).default([]);

const commonContentSchema = z.object({
  title: z.string().trim().min(1, 'Tiêu đề bắt buộc'),
  slug: slugSchema,
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
  coverMediaRef: z.string().trim().optional(),
  status: statusSchema,
  sortOrder: z.coerce.number().int().default(0),
  tags: stringList,
});

function validateDateRange(value: { startDate?: string; endDate?: string }, ctx: z.RefinementCtx) {
  const start = Number(value.startDate);
  const end = Number(value.endDate);
  if (value.startDate && value.endDate && Number.isFinite(start) && Number.isFinite(end) && start > end) {
    ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Năm kết thúc phải lớn hơn hoặc bằng năm bắt đầu' });
  }
}

export const periodBaseSchema = commonContentSchema.extend({
  summary: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

export const periodSchema = periodBaseSchema.superRefine((value, ctx) => {
  validateDateRange(value, ctx);
  if (value.status === 'published' && !value.coverMediaRef) {
    ctx.addIssue({ code: 'custom', path: ['coverMediaRef'], message: 'Thời kỳ published cần có ảnh bìa' });
  }
  if (value.status === 'published' && !value.summary && !value.description) {
    ctx.addIssue({ code: 'custom', path: ['summary'], message: 'Thời kỳ published cần summary hoặc description' });
  }
});

export const periodUpdateSchema = periodBaseSchema.partial({ slug: true }).superRefine(validateDateRange);

export const stageBaseSchema = commonContentSchema.extend({
  description: z.string().trim().optional(),
  overview: z.string().trim().optional(),
  details: stringList,
  result: stringList,
  impactOnPresent: z.string().trim().optional(),
  relatedPersons: stringList,
  relatedLocations: stringList,
});

export const stageSchema = stageBaseSchema.superRefine((value, ctx) => {
  validateDateRange(value, ctx);
  if (value.status === 'published' && (!value.coverMediaRef || !value.overview)) {
    ctx.addIssue({ code: 'custom', path: ['status'], message: 'Giai đoạn published cần ảnh bìa và overview' });
  }
});

export const stageUpdateSchema = stageBaseSchema.partial({ slug: true }).superRefine(validateDateRange);

const mediaSchema = z.object({
  link: z.string().trim().optional(),
  content: z.string().trim().optional(),
});

const sideSchema = z.object({
  vn: stringList,
  usAllies: stringList,
});

const warSummarySchema = z.object({
  detail: z.string().trim().optional(),
  date: z.string().trim().optional(),
  diadiem: z.object({ content: z.string().trim().optional() }).optional(),
  images: z.array(mediaSchema).default([]),
});

export const eventBaseSchema = commonContentSchema.extend({
  smallTitle: z.string().trim().optional(),
  summary: z.string().trim().optional(),
  description: z.string().trim().optional(),
  details: stringList,
  warCause: stringList,
  object: sideSchema,
  content: z.object({
    forces: sideSchema,
    warSummary: z.array(warSummarySchema).default([]),
    result: sideSchema,
  }),
  meaning: stringList,
  impactOnPresent: z.string().trim().optional(),
  images: z.array(mediaSchema).default([]),
  videos: z.array(mediaSchema).default([]),
  youtubeId: z.string().trim().optional(),
  relatedPersons: stringList,
  relatedEvents: stringList,
  relatedLocations: stringList,
});

export const eventSchema = eventBaseSchema.superRefine((value, ctx) => {
  validateDateRange(value, ctx);
  const hasContent = value.warCause.length > 0
    || value.details.length > 0
    || value.meaning.length > 0
    || value.content.warSummary.length > 0
    || value.content.result.vn.length > 0
    || value.content.result.usAllies.length > 0;
  if (value.status === 'published' && (!value.summary || !value.coverMediaRef || !hasContent)) {
    ctx.addIssue({ code: 'custom', path: ['status'], message: 'Sự kiện published cần summary, ảnh và ít nhất một phần nội dung' });
  }
});

export const eventUpdateSchema = eventBaseSchema.partial({ slug: true }).superRefine(validateDateRange);

export type PeriodPayload = z.infer<typeof periodSchema>;
export type StagePayload = z.infer<typeof stageSchema>;
export type EventPayload = z.infer<typeof eventSchema>;
