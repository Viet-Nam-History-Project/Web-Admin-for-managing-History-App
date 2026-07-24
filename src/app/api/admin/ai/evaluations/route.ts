import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { fetchAiAdmin, getAiBackendUrl, getRequiredRagRevision } from '@/lib/ai/backend';
import { getAdminDb } from '@/lib/firebase/admin';
import { paths } from '@/lib/firebase/firestorePaths';

const requestSchema = z.object({
  question: z.string().trim().min(2).max(1200),
});

const reviewSchema = z.object({
  id: z.string().min(1),
  verdict: z.enum(['pass', 'partial', 'fail', 'needs_review']),
  reviewerNote: z.string().trim().max(2000).default(''),
});

const deleteSchema = z.object({
  ids: z.array(z.string().trim().min(1)).min(1).max(100),
});

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function serializeRetrievalForFirestore(value: unknown): unknown {
  if (!isRecord(value)) return value ?? null;
  const periods = value.evolution_periods;
  if (!Array.isArray(periods)) return value;

  return {
    ...value,
    // Firestore không cho array chứa trực tiếp array. Dùng array-map để vẫn
    // giữ nguyên ý nghĩa period plan mà không làm mất dữ liệu diagnostics.
    evolution_periods: periods.flatMap((period) => {
      if (!Array.isArray(period) || period.length < 2) return [];
      const start = Number(period[0]);
      const end = Number(period[1]);
      return Number.isFinite(start) && Number.isFinite(end)
        ? [{ start, end }]
        : [];
    }),
  };
}

function deserializeRetrievalFromFirestore(value: unknown): unknown {
  if (!isRecord(value)) return value ?? null;
  const periods = value.evolution_periods;
  if (!Array.isArray(periods)) return value;

  return {
    ...value,
    evolution_periods: periods.map((period) => {
      if (Array.isArray(period)) return period;
      if (!isRecord(period)) return period;
      const start = Number(period.start);
      const end = Number(period.end);
      return Number.isFinite(start) && Number.isFinite(end)
        ? [start, end]
        : period;
    }),
  };
}

export async function GET() {
  try {
    await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    const snapshot = await getAdminDb().collection(paths.aiEvaluationRuns).orderBy('createdAt', 'desc').limit(60).get();
    return NextResponse.json({ items: snapshot.docs.map((document) => {
      const data = document.data();
      return {
        id: document.id,
        ...data,
        retrieval: deserializeRetrievalFromFirestore(data.retrieval),
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : '',
      };
    }) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể tải lịch sử kiểm thử.' }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    const payload = requestSchema.parse(await request.json());
    const backendUrl = getAiBackendUrl();
    const requiredRevision = getRequiredRagRevision();
    const healthResponse = await fetch(`${backendUrl}/health/revision`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    const health = await healthResponse.json().catch(() => ({}));
    if (!healthResponse.ok || health.rag_revision !== requiredRevision) {
      throw new Error(
        `FastAPI đang chạy pipeline cũ (${health.rag_revision ?? 'không xác định'}). `
        + `Hãy hoàn tất hoặc tạm dừng Index rồi restart backend để nạp ${requiredRevision}.`,
      );
    }
    // Route Web Admin đã được requireAdmin() xác thực bằng Firebase Bearer
    // hoặc cookie HttpOnly. Gọi admin debug endpoint bằng server-side key để
    // phiên cookie bền vững không còn phụ thuộc vào ID token ở trình duyệt.
    const result = await fetchAiAdmin<Record<string, unknown>>('/v1/admin/retrieval/debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Citation metadata is intentionally requested only for the admin review flow.
      body: JSON.stringify({
        question: payload.question,
        messages: [],
        include_citations: true,
      }),
      signal: AbortSignal.timeout(90_000),
    });
    await getAdminDb().collection(paths.aiEvaluationRuns).add({
      question: payload.question,
      answer: String(result.answer ?? ''),
      citations: result.citations ?? [],
      confidence: Number(result.confidence ?? 0),
      retrieval: serializeRetrievalForFirestore(result.retrieval),
      reviewerId: actor.uid,
      reviewerEmail: actor.email,
      verdict: 'needs_review',
      createdAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Kiểm thử AI thất bại.' },
      { status: 400 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const payload = reviewSchema.parse(await request.json());
    await getAdminDb().doc(`${paths.aiEvaluationRuns}/${payload.id}`).set({
      verdict: payload.verdict,
      reviewerNote: payload.reviewerNote,
      reviewedBy: actor.uid,
      reviewedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể lưu đánh giá.' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const payload = deleteSchema.parse(await request.json());
    const ids = [...new Set(payload.ids)];
    const database = getAdminDb();
    const references = ids.map((id) => database.collection(paths.aiEvaluationRuns).doc(id));
    const snapshots = await database.getAll(...references);
    const existing = snapshots.filter((snapshot) => snapshot.exists);

    if (!existing.length) {
      return NextResponse.json({ deleted: 0 });
    }

    // Xóa lịch sử và ghi audit trong cùng một batch để tránh trạng thái dở dang.
    const batch = database.batch();
    existing.forEach((snapshot) => batch.delete(snapshot.ref));
    const auditReference = database.collection(paths.auditLogs).doc();
    batch.set(auditReference, {
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: 'permanent_delete',
      entityType: 'ai_evaluation_run',
      entityPath: paths.aiEvaluationRuns,
      entityTitle: `Xóa ${existing.length} ca đánh giá AI`,
      before: existing.map((snapshot) => ({
        id: snapshot.id,
        question: String(snapshot.data()?.question ?? '').slice(0, 300),
        verdict: snapshot.data()?.verdict ?? 'needs_review',
      })),
      after: null,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      userAgent: request.headers.get('user-agent'),
      createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    return NextResponse.json({ deleted: existing.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Không thể xóa lịch sử đánh giá.' },
      { status: 400 },
    );
  }
}
