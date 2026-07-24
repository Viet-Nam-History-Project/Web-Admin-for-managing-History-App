import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { writeAuditLog } from '@/lib/audit/auditLogger';
import { getAiAdminKey, getAiBackendUrl } from '@/lib/ai/backend';
import { readKnowledgePdf, type PdfStorageProvider } from '@/lib/ai/pdfStorage';
import { getAdminDb } from '@/lib/firebase/admin';
import { paths } from '@/lib/firebase/firestorePaths';

export const maxDuration = 7200;

const backendHeaders = () => ({ 'X-Admin-Key': getAiAdminKey() });

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  await requireAdmin(['super_admin', 'content_admin']);
  const { sourceId } = await params;
  const reference = getAdminDb().doc(`${paths.aiKnowledgeSources}/${sourceId}`);
  const snapshot = await reference.get();
  if (!snapshot.exists) return NextResponse.json({ error: 'Không tìm thấy tài liệu.' }, { status: 404 });
  const source = snapshot.data() ?? {};

  try {
    await reference.set({
      status: 'indexing',
      errorMessage: '',
      ocrApplied: false,
      ocrLanguages: '',
      ocrEngine: '',
      ocrFailedPages: [],
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    const storageProvider: PdfStorageProvider = source.storageProvider === 'local'
      ? 'local'
      : 'firebase';
    const buffer = await readKnowledgePdf(String(source.storagePath), storageProvider);
    const pdfBytes = new Uint8Array(buffer);
    const form = new FormData();
    form.set('file', new Blob([pdfBytes], { type: 'application/pdf' }), String(source.fileName ?? 'source.pdf'));
    form.set('metadata', JSON.stringify({
      source_id: sourceId,
      title: source.title,
      author: source.author ?? '',
      publisher: source.publisher ?? '',
      publication_year: source.publicationYear ?? null,
      source_type: source.sourceType ?? 'book',
      trust_level: source.trustLevel ?? 'reference',
      storage_path: source.storagePath,
      related_periods: source.relatedPeriods ?? [],
      related_stages: source.relatedStages ?? [],
      related_events: source.relatedEvents ?? [],
      related_persons: source.relatedPersons ?? [],
    }));
    const response = await fetch(`${getAiBackendUrl()}/v1/admin/knowledge/index/jobs`, {
      method: 'POST',
      headers: backendHeaders(),
      body: form,
      signal: AbortSignal.timeout(120_000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.detail ?? 'AI backend không thể tạo job index PDF.');

    await reference.set({
      status: 'indexing',
      indexJobId: String(result.job_id ?? ''),
      updatedAt: FieldValue.serverTimestamp(),
      errorMessage: '',
    }, { merge: true });
    return NextResponse.json({ ok: true, job: result }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Index PDF thất bại.';
    await reference.set({
      status: 'failed',
      errorMessage: message.slice(0, 1000),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  const actor = await requireAdmin(['super_admin', 'content_admin']);
  const { sourceId } = await params;
  const reference = getAdminDb().doc(`${paths.aiKnowledgeSources}/${sourceId}`);
  const snapshot = await reference.get();
  if (!snapshot.exists) return NextResponse.json({ error: 'Không tìm thấy tài liệu.' }, { status: 404 });
  const source = snapshot.data() ?? {};
  const jobId = String(source.indexJobId ?? '');
  if (!jobId) {
    return NextResponse.json({ error: 'Tài liệu chưa có job index đang chạy.' }, { status: 409 });
  }

  try {
    const response = await fetch(`${getAiBackendUrl()}/v1/admin/knowledge/index/jobs/${jobId}`, {
      headers: backendHeaders(),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    const job = await response.json().catch(() => ({}));
    if (response.status === 404) {
      const message = String(
        job.detail ?? 'Job index không còn tồn tại vì AI backend đã được khởi động lại.',
      );
      await reference.set({
        status: 'failed',
        indexJobId: FieldValue.delete(),
        errorMessage: `${message} Hãy bấm Index để chạy lại.`.slice(0, 1000),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      return NextResponse.json({ ok: false, status: 'failed', error: message });
    }
    if (!response.ok) throw new Error(job.detail ?? 'Không đọc được trạng thái job index.');

    if (job.status === 'ready' && job.result) {
      const result = job.result;
      await reference.set({
        status: 'ready',
        pageCount: result.page_count ?? 0,
        textPageCount: result.text_page_count ?? 0,
        contentStartPage: result.content_start_page ?? 1,
        contentEndPage: result.content_end_page ?? result.page_count ?? 0,
        skippedPageCount: result.skipped_page_count ?? 0,
        boundaryDetection: String(result.boundary_detection ?? 'full_document'),
        footnotePageCount: Number(result.footnote_page_count ?? 0),
        removedFootnoteChars: Number(result.removed_footnote_chars ?? 0),
        runningHeaderPageCount: Number(result.running_header_page_count ?? 0),
        removedRunningHeaderChars: Number(result.removed_running_header_chars ?? 0),
        chunkCount: result.chunk_count ?? 0,
        duplicateChunkCount: result.duplicate_chunk_count ?? 0,
        ocrApplied: Boolean(result.ocr_applied),
        ocrLanguages: String(result.ocr_languages ?? ''),
        ocrEngine: String(result.ocr_engine ?? ''),
        ocrFailedPages: Array.isArray(result.ocr_failed_pages) ? result.ocr_failed_pages : [],
        entityCount: Number(result.entity_count ?? 0),
        relationshipCount: Number(result.relationship_count ?? 0),
        embeddingInputTokens: Number(result.embedding_input_tokens ?? 0),
        entityInputTokens: Number(result.entity_input_tokens ?? 0),
        entityOutputTokens: Number(result.entity_output_tokens ?? 0),
        lastIndexTotalTokens: Number(result.total_tokens ?? 0),
        reusedChunkCount: Number(result.reused_chunk_count ?? 0),
        openaiChunkCount: Number(result.openai_chunk_count ?? 0),
        indexedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        indexJobId: FieldValue.delete(),
        errorMessage: '',
      }, { merge: true });
      await writeAuditLog({
        actor,
        action: 'sync_graph',
        entityType: 'ai_knowledge_source',
        entityPath: reference.path,
        entityTitle: String(source.title ?? sourceId),
        after: result,
      });
    } else if (job.status === 'failed') {
      await reference.set({
        status: 'failed',
        indexJobId: FieldValue.delete(),
        errorMessage: String(job.error || 'Index PDF thất bại.').slice(0, 1000),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    } else if (job.status === 'paused') {
      await reference.set({
        status: 'paused',
        indexJobId: FieldValue.delete(),
        errorMessage: '',
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    return NextResponse.json({ ok: true, job });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không đọc được trạng thái index.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  await requireAdmin(['super_admin', 'content_admin']);
  const { sourceId } = await params;
  const reference = getAdminDb().doc(`${paths.aiKnowledgeSources}/${sourceId}`);
  const snapshot = await reference.get();
  if (!snapshot.exists) {
    return NextResponse.json({ error: 'Không tìm thấy tài liệu.' }, { status: 404 });
  }
  const source = snapshot.data() ?? {};
  const jobId = String(source.indexJobId ?? '');
  if (!jobId) {
    return NextResponse.json(
      { error: 'Tài liệu không có job index đang chạy.' },
      { status: 409 },
    );
  }

  try {
    const response = await fetch(
      `${getAiBackendUrl()}/v1/admin/knowledge/index/jobs/${jobId}/cancel`,
      {
        method: 'POST',
        headers: backendHeaders(),
        cache: 'no-store',
        signal: AbortSignal.timeout(15_000),
      },
    );
    const job = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(job.detail ?? 'AI backend không thể dừng job index.');
    }
    await reference.set({
      status: 'paused',
      indexJobId: FieldValue.delete(),
      errorMessage: '',
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return NextResponse.json({ ok: true, job });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'Không dừng được job index.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
