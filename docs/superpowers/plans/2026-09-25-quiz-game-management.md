# Kế hoạch Triển khai Quản lý Quiz Lịch Sử (Quiz Game Management)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng module quản lý bộ câu hỏi (Quiz) và chi tiết câu hỏi trắc nghiệm (Questions) trên Web Admin với đầy đủ tính năng Thêm/Sửa/Xóa, liên kết sự kiện lịch sử, import/export JSON, tích hợp Audit Log và Thùng rác (Trash).

**Architecture:** Sử dụng kiến trúc dịch vụ chuẩn của Web Admin (`createCollectionRepository`, `quizAdminService`, `adminFetch`, `AdminShell`, `DataTable`). Backend tương tác trực tiếp với subcollection Firestore (`games/quiz-lich-su-viet-nam/quizzes` và subcollection `questions`), xác thực qua Zod schemas và phân quyền Admin.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Lucide React, Firebase Admin SDK, Zod.

## Global Constraints

- Không sửa đổi trực tiếp trên nhánh `main`; toàn bộ công việc thực hiện trên nhánh `feature/game-management`.
- Giữ nguyên cấu trúc dữ liệu tương thích 100% với mobile app: `games/quiz-lich-su-viet-nam/quizzes/{quizSlug}` và `.../questions/{questionId}`.
- Mọi thao tác xóa bộ Quiz phải là xóa mềm (`status: 'deleted'`) và lưu snapshot vào `trashAdminService` với `entityType: 'quiz'`.
- Mọi thao tác biến đổi dữ liệu (create, update, delete) phải ghi lại nhật ký `writeAuditLog`.
- Luôn kiểm tra tính hợp lệ của TypeScript (`npm run typecheck`) và Linting (`npm run lint`).

---

### Task 1: Zod Validation Schemas cho Quizzes & Questions

**Files:**
- Create: `src/lib/validation/quizSchemas.ts`
- Test: `src/scripts/testQuizSchemas.ts`

**Interfaces:**
- Produces: `quizSchema`, `quizUpdateSchema`, `questionSchema`, `questionUpdateSchema`, `questionBatchImportSchema`, types: `QuizPayload`, `QuizUpdatePayload`, `QuestionPayload`, `QuestionUpdatePayload`.

- [ ] **Step 1: Viết test runner cho quiz schemas**
Tạo file `src/scripts/testQuizSchemas.ts` để kiểm tra validation với dữ liệu hợp lệ và không hợp lệ:
```typescript
import { quizSchema, questionSchema, questionBatchImportSchema } from '../lib/validation/quizSchemas';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

const validQuiz = {
  quizzslug: 'tran-xuan-loc-1975',
  description: 'Bộ câu hỏi về Chiến dịch Xuân Lộc 1975',
  level: 'Dễ',
  status: 'draft',
  settings: { timeLimit: 60, maxPlayers: 1 },
  eventID: {
    periodID: 'khang-chien-chong-my',
    stageID: 'giai-phong-mien-nam',
    eventid: 'xuan-loc-1975',
    title: 'Trận Xuân Lộc 1975',
  },
};

const validQuestion = {
  orderQuestion: 1,
  question: 'Trận Xuân Lộc mở màn vào ngày nào?',
  options: ['09/04/1975', '15/04/1975', '21/04/1975', '30/04/1975'],
  correctAnswer: 0,
  explanation: 'Chiến dịch tiến công Xuân Lộc bắt đầu từ sáng ngày 9 tháng 4 năm 1975.',
  imageUrl: 'https://example.com/xuan-loc.jpg',
};

assert(quizSchema.safeParse(validQuiz).success, 'validQuiz should pass');
assert(!quizSchema.safeParse({ ...validQuiz, quizzslug: 'SLUG HOA' }).success, 'Uppercase slug should fail');
assert(questionSchema.safeParse(validQuestion).success, 'validQuestion should pass');
assert(!questionSchema.safeParse({ ...validQuestion, correctAnswer: 5 }).success, 'correctAnswer out of range should fail');
assert(questionBatchImportSchema.safeParse([validQuestion]).success, 'batch import should pass');
console.log('✅ Quiz Schemas test passed!');
```

- [ ] **Step 2: Chạy test để xác nhận fail**
Chạy: `npx tsx src/scripts/testQuizSchemas.ts`  
Expected: FAIL (Cannot find module '../lib/validation/quizSchemas')

- [ ] **Step 3: Cài đặt schemas trong `src/lib/validation/quizSchemas.ts`**
```typescript
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
```

- [ ] **Step 4: Chạy test runner để xác nhận pass**
Chạy: `npx tsx src/scripts/testQuizSchemas.ts`  
Expected: `✅ Quiz Schemas test passed!`

- [ ] **Step 5: Dọn dẹp script test và commit**
```bash
git add src/lib/validation/quizSchemas.ts
git commit -m "feat(validation): add zod schemas for quiz and questions"
```

---

### Task 2: Backend Quiz Admin Service

**Files:**
- Modify: `src/services/quizAdminService.ts`
- Test: `src/scripts/testQuizAdminService.ts`

**Interfaces:**
- Consumes: `getAdminDb`, `writeAuditLog`, `trashAdminService`, `quizSchema`, `questionSchema`
- Produces: `quizAdminService` methods (`listQuizzes`, `getQuiz`, `createQuiz`, `updateQuiz`, `deleteQuiz`, `listQuestions`, `getQuestion`, `createQuestion`, `updateQuestion`, `deleteQuestion`, `batchImportQuestions`, `listHistoricalEvents`)

- [ ] **Step 1: Viết script test tích hợp cho quizAdminService**
Tạo file `src/scripts/testQuizAdminService.ts`:
```typescript
import { quizAdminService } from '../services/quizAdminService';

async function main() {
  const result = await quizAdminService.listQuizzes();
  console.log('Quizzes fetched:', result.items.length);
  if (result.items.length > 0) {
    const first = result.items[0];
    const questions = await quizAdminService.listQuestions(first.id);
    console.log(`Quiz [${first.id}] has ${questions.length} questions`);
  }
  console.log('✅ quizAdminService integration test passed!');
}

main().catch(console.error);
```

- [ ] **Step 2: Chạy test để xác nhận kết quả hiện tại**
Chạy: `npx tsx --env-file=.env src/scripts/testQuizAdminService.ts`  
Expected: Sẽ in `Quizzes fetched: 0` vì service đang là stub rỗng.

- [ ] **Step 3: Triển khai hoàn chỉnh `src/services/quizAdminService.ts`**
Cài đặt service với đầy đủ Firestore queries cho `games/quiz-lich-su-viet-nam/quizzes` và subcollection `questions`, đồng bộ `questionCount`, kết nối `writeAuditLog` và `trashAdminService`:
```typescript
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { AdminActor } from '@/lib/auth/requireAdmin';
import { writeAuditLog } from '@/lib/audit/auditLogger';
import { trashAdminService } from '@/services/trashAdminService';
import {
  QuizPayload,
  QuizUpdatePayload,
  QuestionPayload,
  QuestionUpdatePayload,
  quizSchema,
  quizUpdateSchema,
  questionSchema,
  questionUpdateSchema,
  questionBatchImportSchema,
} from '@/lib/validation/quizSchemas';

export const DEFAULT_QUIZ_GAME_ID = 'quiz-lich-su-viet-nam';

export interface AdminQuizItem extends QuizPayload {
  id: string;
  questionCount: number;
  updated_at?: Timestamp | unknown;
  createdAt?: Timestamp | unknown;
  updatedAt?: Timestamp | unknown;
}

export interface AdminQuestionItem extends QuestionPayload {
  id: string;
  updated_at?: Timestamp | unknown;
}

const quizColRef = () => getAdminDb().collection(`games/${DEFAULT_QUIZ_GAME_ID}/quizzes`);
const questionColRef = (quizSlug: string) => getAdminDb().collection(`games/${DEFAULT_QUIZ_GAME_ID}/quizzes/${quizSlug}/questions`);

export const quizAdminService = {
  async listQuizzes(includeDeleted = false) {
    const snap = await quizColRef().get();
    const items: AdminQuizItem[] = [];

    for (const doc of snap.docs) {
      const data = doc.data() as Record<string, unknown>;
      if (!includeDeleted && data.status === 'deleted') continue;

      const qSnap = await questionColRef(doc.id).count().get().catch(() => null);
      const actualCount = qSnap ? qSnap.data().count : (Number(data.questionCount) || 0);

      items.push({
        id: doc.id,
        quizzslug: String(data.quizzslug || doc.id),
        description: String(data.description || ''),
        level: String(data.level || 'Dễ'),
        status: (data.status as AdminQuizItem['status']) || 'published',
        sortOrder: Number(data.sortOrder || 0),
        questionCount: actualCount,
        settings: {
          timeLimit: Number((data.settings as { timeLimit?: number })?.timeLimit ?? 60),
          maxPlayers: Number((data.settings as { maxPlayers?: number })?.maxPlayers ?? 1),
        },
        eventID: data.eventID as AdminQuizItem['eventID'],
        updated_at: data.updated_at,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    }

    items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.description.localeCompare(b.description));
    return { items };
  },

  async getQuiz(quizSlug: string): Promise<AdminQuizItem | null> {
    const doc = await quizColRef().doc(quizSlug).get();
    if (!doc.exists) return null;
    const data = doc.data() as Record<string, unknown>;
    const qSnap = await questionColRef(quizSlug).count().get().catch(() => null);
    const actualCount = qSnap ? qSnap.data().count : (Number(data.questionCount) || 0);

    return {
      id: doc.id,
      quizzslug: String(data.quizzslug || doc.id),
      description: String(data.description || ''),
      level: String(data.level || 'Dễ'),
      status: (data.status as AdminQuizItem['status']) || 'published',
      sortOrder: Number(data.sortOrder || 0),
      questionCount: actualCount,
      settings: {
        timeLimit: Number((data.settings as { timeLimit?: number })?.timeLimit ?? 60),
        maxPlayers: Number((data.settings as { maxPlayers?: number })?.maxPlayers ?? 1),
      },
      eventID: data.eventID as AdminQuizItem['eventID'],
      updated_at: data.updated_at,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },

  async createQuiz(actor: AdminActor, rawPayload: unknown): Promise<string> {
    const data = quizSchema.parse(rawPayload);
    const docRef = quizColRef().doc(data.quizzslug);
    const existing = await docRef.get();
    if (existing.exists) throw new Error(`Bộ Quiz với slug '${data.quizzslug}' đã tồn tại.`);

    const record = {
      ...data,
      questionCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    };

    await docRef.set(record);
    await writeAuditLog({
      actor,
      action: 'create',
      entityType: 'quiz',
      entityPath: `games/${DEFAULT_QUIZ_GAME_ID}/quizzes/${data.quizzslug}`,
      entityTitle: data.description,
      after: record,
    });

    return data.quizzslug;
  },

  async updateQuiz(actor: AdminActor, quizSlug: string, rawPayload: unknown) {
    const data = quizUpdateSchema.parse(rawPayload);
    const docRef = quizColRef().doc(quizSlug);
    const before = await docRef.get();
    if (!before.exists) throw new Error('Không tìm thấy bộ quiz để cập nhật.');

    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    };

    await docRef.set(updateData, { merge: true });
    await writeAuditLog({
      actor,
      action: 'update',
      entityType: 'quiz',
      entityPath: `games/${DEFAULT_QUIZ_GAME_ID}/quizzes/${quizSlug}`,
      entityTitle: data.description || String(before.data()?.description || quizSlug),
      before: before.data(),
      after: updateData,
    });
  },

  async deleteQuiz(actor: AdminActor, quizSlug: string) {
    const docRef = quizColRef().doc(quizSlug);
    const before = await docRef.get();
    if (!before.exists) throw new Error('Không tìm thấy bộ quiz để xóa.');

    const data = before.data() || {};
    const previousStatus = String(data.status || 'published');

    await docRef.set(
      {
        status: 'deleted',
        previousStatus,
        deletedAt: FieldValue.serverTimestamp(),
        deletedBy: actor.uid,
        updatedAt: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await trashAdminService.addDeletedEntity(actor, {
      entityType: 'quiz',
      entityPath: `games/${DEFAULT_QUIZ_GAME_ID}/quizzes/${quizSlug}`,
      title: String(data.description || quizSlug),
      slug: quizSlug,
      previousStatus,
      snapshotPreview: data,
    });

    await writeAuditLog({
      actor,
      action: 'soft_delete',
      entityType: 'quiz',
      entityPath: `games/${DEFAULT_QUIZ_GAME_ID}/quizzes/${quizSlug}`,
      entityTitle: String(data.description || quizSlug),
      before: data,
      after: { status: 'deleted' },
    });
  },

  async listQuestions(quizSlug: string): Promise<AdminQuestionItem[]> {
    const snap = await questionColRef(quizSlug).orderBy('orderQuestion', 'asc').get();
    return snap.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        orderQuestion: Number(data.orderQuestion ?? 1),
        question: String(data.question ?? ''),
        options: Array.isArray(data.options) ? (data.options as string[]) : [],
        correctAnswer: Number(data.correctAnswer ?? 0),
        explanation: String(data.explanation ?? ''),
        imageUrl: data.imageUrl ? String(data.imageUrl) : null,
        updated_at: data.updated_at,
      };
    });
  },

  async getQuestion(quizSlug: string, questionId: string): Promise<AdminQuestionItem | null> {
    const doc = await questionColRef(quizSlug).doc(questionId).get();
    if (!doc.exists) return null;
    const data = doc.data() as Record<string, unknown>;
    return {
      id: doc.id,
      orderQuestion: Number(data.orderQuestion ?? 1),
      question: String(data.question ?? ''),
      options: Array.isArray(data.options) ? (data.options as string[]) : [],
      correctAnswer: Number(data.correctAnswer ?? 0),
      explanation: String(data.explanation ?? ''),
      imageUrl: data.imageUrl ? String(data.imageUrl) : null,
      updated_at: data.updated_at,
    };
  },

  async syncQuestionCount(quizSlug: string) {
    const countSnap = await questionColRef(quizSlug).count().get();
    const count = countSnap.data().count;
    await quizColRef().doc(quizSlug).set({ questionCount: count, updated_at: FieldValue.serverTimestamp() }, { merge: true });
    return count;
  },

  async createQuestion(actor: AdminActor, quizSlug: string, rawPayload: unknown): Promise<string> {
    const data = questionSchema.parse(rawPayload);
    const col = questionColRef(quizSlug);
    const customId = `question-${data.orderQuestion}`;
    const targetRef = col.doc(customId);
    const existing = await targetRef.get();
    const docRef = existing.exists ? col.doc() : targetRef;

    const record = {
      ...data,
      updated_at: FieldValue.serverTimestamp(),
    };
    await docRef.set(record);
    await this.syncQuestionCount(quizSlug);

    await writeAuditLog({
      actor,
      action: 'create',
      entityType: 'question',
      entityPath: `games/${DEFAULT_QUIZ_GAME_ID}/quizzes/${quizSlug}/questions/${docRef.id}`,
      entityTitle: data.question,
      after: record,
    });

    return docRef.id;
  },

  async updateQuestion(actor: AdminActor, quizSlug: string, questionId: string, rawPayload: unknown) {
    const data = questionUpdateSchema.parse(rawPayload);
    const docRef = questionColRef(quizSlug).doc(questionId);
    const before = await docRef.get();
    if (!before.exists) throw new Error('Không tìm thấy câu hỏi để cập nhật.');

    const updateData = {
      ...data,
      updated_at: FieldValue.serverTimestamp(),
    };
    await docRef.set(updateData, { merge: true });

    await writeAuditLog({
      actor,
      action: 'update',
      entityType: 'question',
      entityPath: `games/${DEFAULT_QUIZ_GAME_ID}/quizzes/${quizSlug}/questions/${questionId}`,
      entityTitle: data.question || String(before.data()?.question || questionId),
      before: before.data(),
      after: updateData,
    });
  },

  async deleteQuestion(actor: AdminActor, quizSlug: string, questionId: string) {
    const docRef = questionColRef(quizSlug).doc(questionId);
    const before = await docRef.get();
    if (!before.exists) throw new Error('Không tìm thấy câu hỏi để xóa.');

    await docRef.delete();
    await this.syncQuestionCount(quizSlug);

    await writeAuditLog({
      actor,
      action: 'delete',
      entityType: 'question',
      entityPath: `games/${DEFAULT_QUIZ_GAME_ID}/quizzes/${quizSlug}/questions/${questionId}`,
      entityTitle: String(before.data()?.question || questionId),
      before: before.data(),
      after: { deleted: true },
    });
  },

  async batchImportQuestions(actor: AdminActor, quizSlug: string, rawPayload: unknown) {
    const questions = questionBatchImportSchema.parse(rawPayload);
    const db = getAdminDb();
    const batch = db.batch();
    const col = questionColRef(quizSlug);

    questions.forEach((q) => {
      const docRef = col.doc(`question-${q.orderQuestion}`);
      batch.set(docRef, {
        ...q,
        updated_at: FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    const newCount = await this.syncQuestionCount(quizSlug);

    await writeAuditLog({
      actor,
      action: 'create',
      entityType: 'question',
      entityPath: `games/${DEFAULT_QUIZ_GAME_ID}/quizzes/${quizSlug}/questions`,
      entityTitle: `Import hàng loạt ${questions.length} câu hỏi`,
      after: { importedCount: questions.length, totalCount: newCount },
    });

    return { importedCount: questions.length, totalCount: newCount };
  },

  async listHistoricalEvents() {
    const db = getAdminDb();
    const periodsSnap = await db.collection('periods').get();
    const results: Array<{
      periodID: string;
      periodTitle: string;
      stageID: string;
      stageTitle: string;
      eventid: string;
      eventTitle: string;
    }> = [];

    for (const pDoc of periodsSnap.docs) {
      if (pDoc.data().status === 'deleted') continue;
      const stagesSnap = await pDoc.ref.collection('stages').get();
      for (const sDoc of stagesSnap.docs) {
        if (sDoc.data().status === 'deleted') continue;
        const eventsSnap = await sDoc.ref.collection('events').get();
        for (const eDoc of eventsSnap.docs) {
          if (eDoc.data().status === 'deleted') continue;
          results.push({
            periodID: pDoc.id,
            periodTitle: String(pDoc.data().title || pDoc.id),
            stageID: sDoc.id,
            stageTitle: String(sDoc.data().title || sDoc.id),
            eventid: eDoc.id,
            eventTitle: String(eDoc.data().title || eDoc.id),
          });
        }
      }
    }

    return results;
  },
};
```

- [ ] **Step 4: Chạy lại test tích hợp để xác nhận pass**
Chạy: `npx tsx --env-file=.env src/scripts/testQuizAdminService.ts`  
Expected: In ra số lượng quizzes và questions thực tế từ Firestore, `✅ quizAdminService integration test passed!`

- [ ] **Step 5: Xóa file script tạm và commit**
```bash
git add src/services/quizAdminService.ts
git commit -m "feat(services): implement quizAdminService with full CRUD and audit logs"
```

---

### Task 3: API Routes cho Quizzes & Questions

**Files:**
- Create: `src/app/api/admin/games/quizzes/route.ts`
- Create: `src/app/api/admin/games/quizzes/[quizSlug]/route.ts`
- Create: `src/app/api/admin/games/quizzes/[quizSlug]/questions/route.ts`
- Create: `src/app/api/admin/games/quizzes/[quizSlug]/questions/[questionId]/route.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `quizAdminService`
- Produces: REST endpoints cho Client components gọi thông qua `adminFetch`

- [ ] **Step 1: Viết route `/api/admin/games/quizzes/route.ts`**
Hỗ trợ `GET` (danh sách quiz) và `POST` (tạo mới quiz).

- [ ] **Step 2: Viết route `/api/admin/games/quizzes/[quizSlug]/route.ts`**
Hỗ trợ `GET` (lấy chi tiết quiz), `PATCH` (sửa quiz hoặc publish/unpublish), `DELETE` (xóa mềm quiz).

- [ ] **Step 3: Viết route `/api/admin/games/quizzes/[quizSlug]/questions/route.ts`**
Hỗ trợ `GET` (lấy danh sách câu hỏi) và `POST` (thêm mới câu hỏi đơn lẻ hoặc import mảng câu hỏi).

- [ ] **Step 4: Viết route `/api/admin/games/quizzes/[quizSlug]/questions/[questionId]/route.ts`**
Hỗ trợ `GET`, `PATCH` (sửa câu hỏi), `DELETE` (xóa câu hỏi).

- [ ] **Step 5: Kiểm tra typecheck và commit**
Chạy: `npm run typecheck`  
Commit:
```bash
git add src/app/api/admin/games/quizzes/
git commit -m "feat(api): add REST endpoints for quiz and questions"
```

---

### Task 4: Form Component & Trang Tạo/Sửa Quiz

**Files:**
- Create: `src/components/admin/QuizForm.tsx`
- Create: `src/app/games/quizzes/new/page.tsx`
- Create: `src/app/games/quizzes/[quizSlug]/edit/page.tsx`

**Interfaces:**
- Consumes: `quizAdminService.listHistoricalEvents`, `quizAdminService.getQuiz`, `adminFetch`
- Produces: Giao diện tạo và chỉnh sửa bộ Quiz với bộ chọn phân cấp Sự kiện lịch sử.

- [ ] **Step 1: Cài đặt `QuizForm.tsx`**
Component form quản lý:
- Tên/mô tả quiz (`description`)
- Slug (`quizzslug`, không thể sửa khi editing)
- Cấp độ (`level`: dropdown các giá trị chuẩn Dễ, Trung bình, Khó hoặc nhập tự do)
- Giới hạn thời gian (`timeLimit` giây)
- Bộ chọn phân cấp Sự kiện lịch sử (chọn Thời kỳ -> Giai đoạn -> Sự kiện từ danh sách `historicalEvents`)
- Trạng thái (`status`: `draft`, `published`, `archived`)
- Thứ tự hiển thị (`sortOrder`)

- [ ] **Step 2: Cài đặt `src/app/games/quizzes/new/page.tsx`**
Trang server component lấy danh sách sự kiện lịch sử qua `quizAdminService.listHistoricalEvents()` và render `QuizForm` với endpoint `POST /api/admin/games/quizzes`.

- [ ] **Step 3: Cài đặt `src/app/games/quizzes/[quizSlug]/edit/page.tsx`**
Trang server component lấy thông tin quiz hiện tại và danh sách sự kiện, render `QuizForm` với endpoint `PATCH /api/admin/games/quizzes/${quizSlug}`.

- [ ] **Step 4: Kiểm tra typecheck và commit**
Chạy: `npm run typecheck`
```bash
git add src/components/admin/QuizForm.tsx src/app/games/quizzes/new/page.tsx src/app/games/quizzes/[quizSlug]/edit/page.tsx
git commit -m "feat(ui): add QuizForm component and new/edit quiz pages"
```

---

### Task 5: Trang Danh sách Quiz (`/games/quizzes`)

**Files:**
- Modify: `src/app/games/quizzes/page.tsx`

**Interfaces:**
- Consumes: `quizAdminService.listQuizzes()`, `AdminShell`, `PageHeader`, `DataTable`, `Badge`, `EntityActionButton`

- [ ] **Step 1: Cài đặt `src/app/games/quizzes/page.tsx`**
Hiển thị danh sách bộ Quiz dưới dạng bảng `DataTable`:
- Cột: Slug & Tiêu đề mô tả, Sự kiện lịch sử liên kết, Cấp độ (`Badge`), Số câu hỏi, Thời gian làm bài (`settings.timeLimit`s), Trạng thái, Thao tác (`Xem chi tiết`, `Sửa`, `Xuất bản/Gỡ`, `Xóa`).
- Header: Breadcrumb điều hướng, nút `Thùng rác`, nút `Tạo bộ quiz`.
- Tìm kiếm & lọc nhanh theo từ khóa / độ khó.

- [ ] **Step 2: Kiểm tra typecheck và commit**
Chạy: `npm run typecheck`
```bash
git add src/app/games/quizzes/page.tsx
git commit -m "feat(ui): implement quiz list page with data table and quick actions"
```

---

### Task 6: Trang Chi tiết Quiz & Quản lý Câu hỏi (Modals + Import/Export)

**Files:**
- Create: `src/components/admin/QuestionEditorModal.tsx`
- Create: `src/components/admin/QuestionBatchImportModal.tsx`
- Create: `src/app/games/quizzes/[quizSlug]/page.tsx`

**Interfaces:**
- Consumes: `quizAdminService.getQuiz`, `quizAdminService.listQuestions`, `adminFetch`
- Produces: Màn hình chi tiết Quiz hoàn chỉnh kèm trình quản lý câu hỏi trực quan.

- [ ] **Step 1: Cài đặt `QuestionEditorModal.tsx`**
Dialog thêm/sửa câu hỏi:
- Thứ tự câu hỏi (`orderQuestion`)
- Nội dung câu hỏi (`question`)
- 4 ô nhập đáp án (A, B, C, D) kèm radio button đánh dấu `correctAnswer` (0, 1, 2, 3) với hiệu ứng visual viền xanh lá nổi bật
- Lời giải thích (`explanation`)
- Link ảnh minh họa (`imageUrl`)

- [ ] **Step 2: Cài đặt `QuestionBatchImportModal.tsx`**
Dialog import hàng loạt:
- Cho phép dán văn bản JSON hoặc upload file `.json`
- Parse và validate sơ bộ trước khi gửi lên API
- Thông báo số lượng câu hỏi import thành công và tự động tải lại bảng câu hỏi

- [ ] **Step 3: Cài đặt `src/app/games/quizzes/[quizSlug]/page.tsx`**
Trang chi tiết Quiz:
- Card thông tin tổng quan bộ Quiz (slug, tiêu đề, thời gian, sự kiện, độ khó)
- Thanh công cụ: `+ Thêm câu hỏi`, `Nhập JSON (Import)`, `Xuất JSON (Export)`
- Bảng danh sách câu hỏi: Hiển thị thứ tự, nội dung câu, 4 đáp án (đáp án đúng được bôi màu xanh lá), nút `Sửa` (mở QuestionEditorModal) và nút `Xóa` (gọi DELETE API)

- [ ] **Step 4: Kiểm tra typecheck và commit**
Chạy: `npm run typecheck`
```bash
git add src/components/admin/QuestionEditorModal.tsx src/components/admin/QuestionBatchImportModal.tsx src/app/games/quizzes/[quizSlug]/page.tsx
git commit -m "feat(ui): implement quiz detail page with question editor and JSON batch import"
```

---

### Task 7: Kiểm thử Tổng thể & Tương thích Di động

**Files:**
- Modify: `src/app/games/page.tsx` (cập nhật số lượng đếm nếu cần)
- Test script: `src/scripts/smokeQuizModule.ts`

- [ ] **Step 1: Viết kịch bản kiểm thử smoke test `src/scripts/smokeQuizModule.ts`**
Kiểm tra luồng trọn vẹn: Tạo quiz giả định -> Thêm câu hỏi -> Kiểm tra đồng bộ `questionCount` -> Sửa câu hỏi -> Xóa mềm quiz vào Thùng rác -> Kiểm tra snapshot trong `admin_trash` -> Xóa vĩnh viễn test quiz.

- [ ] **Step 2: Chạy smoke test**
Chạy: `npx tsx --env-file=.env src/scripts/smokeQuizModule.ts`  
Expected: Toàn bộ assertions thành công.

- [ ] **Step 3: Chạy lint và typecheck toàn dự án**
Chạy: `npm run lint` và `npm run typecheck`  
Expected: 0 errors, 0 linter warnings.

- [ ] **Step 4: Commit và hoàn tất**
```bash
git add .
git commit -m "test: verify quiz management module end-to-end"
```
