import { z } from 'zod';
import { slugSchema, statusSchema } from './contentSchemas';

export const quizEventIdSchema = z.object({
  periodID: z.string().trim().optional(),
  stageID: z.string().trim().optional(),
  eventid: z.string().trim().optional(),
  title: z.string().trim().min(1, 'Tiêu đề sự kiện bắt buộc'),
});

export const quizSettingsSchema = z.object({
  timeLimit: z.coerce.number().int().min(10, 'Thời gian tối thiểu 10 giây').default(60),
  maxPlayers: z.coerce.number().int().min(1).default(1),
});

export const quizBaseSchema = z.object({
  quizzslug: slugSchema,
  description: z.string().trim().min(1, 'Mô tả hoặc tiêu đề quiz bắt buộc'),
  level: z.string().trim().min(1, 'Cấp độ quiz bắt buộc').default('Dễ'),
  status: statusSchema,
  sortOrder: z.coerce.number().int().default(0),
  settings: quizSettingsSchema.default({ timeLimit: 60, maxPlayers: 1 }),
  eventID: quizEventIdSchema.optional(),
});

export const quizSchema = quizBaseSchema;
export const quizUpdateSchema = quizBaseSchema.partial({ quizzslug: true });

export const questionBaseSchema = z.object({
  orderQuestion: z.coerce.number().int().min(1, 'Thứ tự câu hỏi phải từ 1 trở lên').default(1),
  question: z.string().trim().min(1, 'Nội dung câu hỏi bắt buộc'),
  options: z.array(z.string().trim().min(1, 'Đáp án không được để trống')).min(2, 'Cần ít nhất 2 đáp án').max(6, 'Tối đa 6 đáp án'),
  correctAnswer: z.coerce.number().int().min(0, 'Đáp án đúng không hợp lệ'),
  explanation: z.string().trim().optional().default(''),
  imageUrl: z.string().trim().nullable().optional().default(null),
});

export const questionSchema = questionBaseSchema.superRefine((val, ctx) => {
  if (val.correctAnswer >= val.options.length) {
    ctx.addIssue({
      code: 'custom',
      path: ['correctAnswer'],
      message: `Vị trí đáp án đúng (${val.correctAnswer}) vượt quá số lượng đáp án (${val.options.length})`,
    });
  }
});

export const questionUpdateSchema = questionBaseSchema.partial().superRefine((val, ctx) => {
  if (val.options && val.correctAnswer !== undefined && val.correctAnswer >= val.options.length) {
    ctx.addIssue({
      code: 'custom',
      path: ['correctAnswer'],
      message: 'Đáp án đúng không nằm trong danh sách đáp án',
    });
  }
});

export const questionBatchImportSchema = z.array(questionSchema).min(1, 'Danh sách câu hỏi cần ít nhất 1 câu');

export type QuizPayload = z.infer<typeof quizSchema>;
export type QuizUpdatePayload = z.infer<typeof quizUpdateSchema>;
export type QuestionPayload = z.infer<typeof questionSchema>;
export type QuestionUpdatePayload = z.infer<typeof questionUpdateSchema>;
