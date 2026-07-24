import { createHash } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { writeAuditLog } from '@/lib/audit/auditLogger';
import { getAdminDb } from '@/lib/firebase/admin';
import { paths } from '@/lib/firebase/firestorePaths';
import { getMaxPdfSizeMb } from '@/lib/ai/backend';
import {
  deleteKnowledgePdf,
  getPdfStorageProvider,
  readKnowledgePdf,
  saveKnowledgePdf,
  type PdfStorageProvider,
} from '@/lib/ai/pdfStorage';
import { knowledgeAdminService } from '@/services/knowledgeAdminService';

function readString(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function formatUploadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? Number(error.code)
    : 0;

  if (code === 404 || message.includes('The specified bucket does not exist')) {
    return [
      'Firebase Storage chưa có bucket cho project này.',
      'Hãy vào Firebase Console > Storage > Get started để tạo bucket,',
      'sau đó khai báo đúng tên bucket trong FIREBASE_STORAGE_BUCKET và khởi động lại web admin.',
    ].join(' ');
  }

  return error instanceof Error ? error.message : 'Upload PDF thất bại.';
}

function sha256(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function findDuplicatePdf(contentHash: string, fileSize: number) {
  const collection = getAdminDb().collection(paths.aiKnowledgeSources);
  const directMatch = await collection.where('contentHash', '==', contentHash).limit(1).get();
  if (!directMatch.empty) return directMatch.docs[0];

  // Backfill hash cho tài liệu upload trước khi ràng buộc chống trùng được thêm.
  const legacyCandidates = await collection.where('fileSize', '==', fileSize).get();
  for (const candidate of legacyCandidates.docs) {
    const data = candidate.data();
    if (data.contentHash === contentHash) return candidate;
    if (data.contentHash || !data.storagePath) continue;

    try {
      const provider: PdfStorageProvider = data.storageProvider === 'local'
        ? 'local'
        : 'firebase';
      const existingBuffer = await readKnowledgePdf(String(data.storagePath), provider);
      const existingHash = sha256(existingBuffer);
      await candidate.ref.set({ contentHash: existingHash }, { merge: true });
      if (existingHash === contentHash) return candidate;
    } catch {
      // Tài liệu cũ có thể đã mất file gốc; không chặn upload vì metadata mồ côi.
    }
  }

  return null;
}

export async function GET() {
  try {
    await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    return NextResponse.json({ items: await knowledgeAdminService.list() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Không tải được kho tri thức.' },
      { status: 400 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const form = await request.formData();
    const file = form.get('file');
    const title = readString(form, 'title');
    const maxPdfSizeMb = getMaxPdfSizeMb();
    const maxPdfSize = maxPdfSizeMb * 1024 * 1024;
    if (!(file instanceof File)) throw new Error('Vui lòng chọn file PDF.');
    if (!title) throw new Error('Tiêu đề tài liệu không được để trống.');
    if (file.size > maxPdfSize) {
      throw new Error(`PDF không được vượt quá ${maxPdfSizeMb} MB.`);
    }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('Chỉ chấp nhận tệp PDF.');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentHash = sha256(buffer);
    const duplicate = await findDuplicatePdf(contentHash, file.size);
    if (duplicate) {
      const duplicateData = duplicate.data();
      throw new Error(
        `PDF này đã tồn tại với tên “${String(duplicateData.title ?? duplicate.id)}”. `
        + 'Hãy xóa tài liệu hiện có trước khi upload lại.',
      );
    }

    // Dùng hash làm ID để Firestore cũng chặn hai request upload trùng cùng lúc.
    const sourceId = contentHash;
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
    const storagePath = `ai-knowledge/pdfs/${sourceId}/${safeFileName}`;
    const storageProvider = getPdfStorageProvider();

    const relatedPeriods = readString(form, 'relatedPeriods')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const publicationYearValue = Number(readString(form, 'publicationYear'));
    const payload = {
      title,
      author: readString(form, 'author'),
      publisher: readString(form, 'publisher'),
      publicationYear: Number.isFinite(publicationYearValue) && publicationYearValue > 0
        ? publicationYearValue
        : null,
      sourceType: readString(form, 'sourceType') || 'book',
      trustLevel: readString(form, 'trustLevel') || 'reference',
      storageProvider,
      storagePath,
      contentHash,
      fileName: file.name,
      fileSize: file.size,
      contentType: 'application/pdf',
      relatedPeriods,
      status: 'uploaded',
      pageCount: 0,
      textPageCount: 0,
      chunkCount: 0,
      duplicateChunkCount: 0,
      errorMessage: '',
      createdBy: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    const reference = getAdminDb().doc(`${paths.aiKnowledgeSources}/${sourceId}`);
    await getAdminDb().runTransaction(async (transaction) => {
      const existing = await transaction.get(reference);
      if (existing.exists) {
        const existingTitle = String(existing.data()?.title ?? sourceId);
        throw new Error(
          `PDF này đã tồn tại với tên “${existingTitle}”. `
          + 'Hãy xóa tài liệu hiện có trước khi upload lại.',
        );
      }
      transaction.create(reference, payload);
    });

    try {
      await saveKnowledgePdf(storagePath, buffer);
    } catch (error) {
      await reference.delete().catch(() => undefined);
      await deleteKnowledgePdf(storagePath, storageProvider).catch(() => undefined);
      throw error;
    }
    await writeAuditLog({
      actor,
      action: 'create',
      entityType: 'ai_knowledge_source',
      entityPath: reference.path,
      entityTitle: title,
      after: { ...payload, createdAt: null, updatedAt: null },
    });
    return NextResponse.json({ ok: true, sourceId });
  } catch (error) {
    return NextResponse.json(
      { error: formatUploadError(error) },
      { status: 400 },
    );
  }
}
