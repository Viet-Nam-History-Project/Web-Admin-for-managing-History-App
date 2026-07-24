import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { paths } from '@/lib/firebase/firestorePaths';

export type KnowledgeStatus =
  | 'uploaded'
  | 'indexing'
  | 'paused'
  | 'ready'
  | 'failed'
  | 'disabled';

export interface KnowledgeSource {
  id: string;
  title: string;
  author: string;
  publisher: string;
  publicationYear: number | null;
  sourceType: string;
  trustLevel: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  relatedPeriods: string[];
  status: KnowledgeStatus;
  pageCount: number;
  textPageCount: number;
  contentStartPage: number;
  contentEndPage: number;
  skippedPageCount: number;
  boundaryDetection: string;
  footnotePageCount: number;
  removedFootnoteChars: number;
  runningHeaderPageCount: number;
  removedRunningHeaderChars: number;
  chunkCount: number;
  duplicateChunkCount: number;
  entityCount: number;
  relationshipCount: number;
  embeddingInputTokens: number;
  entityInputTokens: number;
  entityOutputTokens: number;
  lastIndexTotalTokens: number;
  reusedChunkCount: number;
  openaiChunkCount: number;
  ocrApplied: boolean;
  ocrLanguages: string;
  ocrEngine: string;
  ocrFailedPages: number[];
  errorMessage: string;
  createdAt: string;
  indexedAt: string;
}

function dateToIso(value: unknown) {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return '';
}

export const knowledgeAdminService = {
  async list(): Promise<KnowledgeSource[]> {
    const snapshot = await getAdminDb()
      .collection(paths.aiKnowledgeSources)
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();

    return snapshot.docs.map((document) => {
      const data = document.data();
      return {
        id: document.id,
        title: String(data.title ?? document.id),
        author: String(data.author ?? ''),
        publisher: String(data.publisher ?? ''),
        publicationYear: typeof data.publicationYear === 'number' ? data.publicationYear : null,
        sourceType: String(data.sourceType ?? 'book'),
        trustLevel: String(data.trustLevel ?? 'reference'),
        storagePath: String(data.storagePath ?? ''),
        fileName: String(data.fileName ?? ''),
        fileSize: Number(data.fileSize ?? 0),
        relatedPeriods: Array.isArray(data.relatedPeriods) ? data.relatedPeriods.map(String) : [],
        status: (data.status ?? 'uploaded') as KnowledgeStatus,
        pageCount: Number(data.pageCount ?? 0),
        textPageCount: Number(data.textPageCount ?? 0),
        contentStartPage: Number(data.contentStartPage ?? 1),
        contentEndPage: Number(data.contentEndPage ?? data.pageCount ?? 0),
        skippedPageCount: Number(data.skippedPageCount ?? 0),
        boundaryDetection: String(data.boundaryDetection ?? 'full_document'),
        footnotePageCount: Number(data.footnotePageCount ?? 0),
        removedFootnoteChars: Number(data.removedFootnoteChars ?? 0),
        runningHeaderPageCount: Number(data.runningHeaderPageCount ?? 0),
        removedRunningHeaderChars: Number(data.removedRunningHeaderChars ?? 0),
        chunkCount: Number(data.chunkCount ?? 0),
        duplicateChunkCount: Number(data.duplicateChunkCount ?? 0),
        entityCount: Number(data.entityCount ?? 0),
        relationshipCount: Number(data.relationshipCount ?? 0),
        embeddingInputTokens: Number(data.embeddingInputTokens ?? 0),
        entityInputTokens: Number(data.entityInputTokens ?? 0),
        entityOutputTokens: Number(data.entityOutputTokens ?? 0),
        lastIndexTotalTokens: Number(data.lastIndexTotalTokens ?? 0),
        reusedChunkCount: Number(data.reusedChunkCount ?? 0),
        openaiChunkCount: Number(data.openaiChunkCount ?? 0),
        ocrApplied: Boolean(data.ocrApplied),
        ocrLanguages: String(data.ocrLanguages ?? ''),
        ocrEngine: String(data.ocrEngine ?? ''),
        ocrFailedPages: Array.isArray(data.ocrFailedPages)
          ? data.ocrFailedPages.map(Number).filter(Number.isFinite)
          : [],
        errorMessage: String(data.errorMessage ?? ''),
        createdAt: dateToIso(data.createdAt),
        indexedAt: dateToIso(data.indexedAt),
      };
    });
  },
};
