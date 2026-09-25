import { z } from 'zod';
import { slugSchema, statusSchema } from './contentSchemas';

export const timelineEventSchema = z.object({
  name: z.string().trim().min(1, 'Tên sự kiện bắt buộc'),
  year: z.coerce.number().int('Năm phải là số nguyên'),
  desc: z.string().trim().optional().default(''),
  order: z.coerce.number().int().min(1, 'Thứ tự sự kiện phải từ 1 trở lên').default(1),
  zone: z.string().trim().optional().default(''),
});

export const timelineEraBaseSchema = z.object({
  eraId: slugSchema,
  title: z.string().trim().min(1, 'Tên kỷ nguyên bắt buộc'),
  description: z.string().trim().optional().default(''),
  coverMediaRef: z.string().trim().optional().default(''),
  status: statusSchema,
  sortOrder: z.coerce.number().int().default(0),
  events: z.array(timelineEventSchema).default([]),
});

export const timelineEraSchema = timelineEraBaseSchema;
export const timelineEraUpdateSchema = timelineEraBaseSchema.partial({ eraId: true });

export const timelineEventsBatchSchema = z.array(timelineEventSchema).min(1, 'Cần ít nhất một sự kiện');

export type TimelineEvent = z.infer<typeof timelineEventSchema>;
export type TimelineEraPayload = z.infer<typeof timelineEraSchema>;
export type TimelineEraUpdatePayload = z.infer<typeof timelineEraUpdateSchema>;
