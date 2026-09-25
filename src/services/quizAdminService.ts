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
const questionColRef = (quizSlug: string) =>
  getAdminDb().collection(`games/${DEFAULT_QUIZ_GAME_ID}/quizzes/${quizSlug}/questions`);

export const quizAdminService = {
  async listQuizzes(includeDeleted = false): Promise<{ items: AdminQuizItem[] }> {
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

  async publishQuiz(actor: AdminActor, quizSlug: string) {
    await this.updateQuiz(actor, quizSlug, { status: 'published' });
  },

  async unpublishQuiz(actor: AdminActor, quizSlug: string) {
    await this.updateQuiz(actor, quizSlug, { status: 'draft' });
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

  async syncQuestionCount(quizSlug: string): Promise<number> {
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
      action: 'permanent_delete',
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

    results.sort((a, b) => a.periodTitle.localeCompare(b.periodTitle) || a.eventTitle.localeCompare(b.eventTitle));
    return results;
  },
};
