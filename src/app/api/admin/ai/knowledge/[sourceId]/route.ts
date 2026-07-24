import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { writeAuditLog } from '@/lib/audit/auditLogger';
import { getAiAdminKey, getAiBackendUrl } from '@/lib/ai/backend';
import { deleteKnowledgePdf, type PdfStorageProvider } from '@/lib/ai/pdfStorage';
import { getAdminDb } from '@/lib/firebase/admin';
import { paths } from '@/lib/firebase/firestorePaths';

const metadataSchema = z.object({
  title: z.string().trim().min(1, 'Tiêu đề không được để trống.').max(300),
  author: z.string().trim().max(240),
  publisher: z.string().trim().max(240),
  publicationYear: z.number().int().min(1000).max(2100).nullable(),
  sourceType: z.enum(['book', 'academic', 'official', 'article']),
  trustLevel: z.enum(['official', 'academic', 'reference']),
  relatedPeriods: z.array(z.string().trim().min(1).max(160)).max(50),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { sourceId } = await params;
    const metadata = metadataSchema.parse(await request.json());
    const reference = getAdminDb().doc(`${paths.aiKnowledgeSources}/${sourceId}`);
    const snapshot = await reference.get();
    if (!snapshot.exists) throw new Error('Không tìm thấy tài liệu.');

    const before = snapshot.data() ?? {};
    if (before.status === 'indexing') {
      throw new Error('Tài liệu đang được index. Hãy chờ hoàn tất rồi chỉnh sửa.');
    }

    if (before.status === 'ready') {
      let response: Response;
      try {
        response = await fetch(
          `${getAiBackendUrl()}/v1/admin/knowledge/${encodeURIComponent(sourceId)}/metadata`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Admin-Key': getAiAdminKey(),
            },
            body: JSON.stringify({
              title: metadata.title,
              author: metadata.author,
              publisher: metadata.publisher,
              publication_year: metadata.publicationYear,
              source_type: metadata.sourceType,
              trust_level: metadata.trustLevel,
              related_periods: metadata.relatedPeriods,
              related_stages: Array.isArray(before.relatedStages) ? before.relatedStages : [],
              related_events: Array.isArray(before.relatedEvents) ? before.relatedEvents : [],
              related_persons: Array.isArray(before.relatedPersons) ? before.relatedPersons : [],
            }),
            signal: AbortSignal.timeout(15_000),
          },
        );
      } catch (error) {
        const reason = error instanceof Error && error.name === 'TimeoutError'
          ? 'AI backend phản hồi quá chậm.'
          : 'Không kết nối được AI backend.';
        throw new Error(`${reason} Hãy kiểm tra dịch vụ History Chatbot tại cổng 8000.`);
      }
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { detail?: string };
        if (response.status === 404 && body.detail === 'Not Found') {
          throw new Error(
            'AI backend đang chạy phiên bản cũ. Hãy restart service history-chatbot-ai rồi thử lại.',
          );
        }
        throw new Error(body.detail ?? 'Không đồng bộ được thông tin mới sang Neo4j.');
      }
    }

    const after = {
      title: metadata.title,
      author: metadata.author,
      publisher: metadata.publisher,
      publicationYear: metadata.publicationYear,
      sourceType: metadata.sourceType,
      trustLevel: metadata.trustLevel,
      relatedPeriods: metadata.relatedPeriods,
    };
    await reference.set({ ...after, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    await writeAuditLog({
      actor,
      action: 'update',
      entityType: 'ai_knowledge_source',
      entityPath: reference.path,
      entityTitle: metadata.title,
      before,
      after: { ...before, ...after },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues[0]?.message ?? 'Thông tin tài liệu không hợp lệ.'
      : error instanceof Error ? error.message : 'Không cập nhật được tài liệu.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { sourceId } = await params;
    const reference = getAdminDb().doc(`${paths.aiKnowledgeSources}/${sourceId}`);
    const before = await reference.get();
    if (!before.exists) throw new Error('Không tìm thấy tài liệu.');
    const response = await fetch(`${getAiBackendUrl()}/v1/admin/knowledge/${sourceId}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Key': getAiAdminKey() },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.detail ?? 'Không gỡ được tài liệu khỏi Neo4j.');
    }
    const source = before.data() ?? {};
    const provider: PdfStorageProvider = source.storageProvider === 'local'
      ? 'local'
      : 'firebase';
    if (source.storagePath) {
      await deleteKnowledgePdf(String(source.storagePath), provider);
    }
    await reference.delete();
    await writeAuditLog({
      actor,
      action: 'permanent_delete',
      entityType: 'ai_knowledge_source',
      entityPath: reference.path,
      entityTitle: String(source.title ?? sourceId),
      before: source,
      after: null,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Không xóa được tài liệu.' },
      { status: 400 },
    );
  }
}
