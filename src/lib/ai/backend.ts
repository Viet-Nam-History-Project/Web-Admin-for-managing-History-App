export interface AiBackendHealth {
  status: string;
  neo4j: string;
  model: string;
  rag_revision?: string;
  active_chat_requests?: number;
  active_index_jobs?: number;
  indexed_sources: number;
  indexed_chunks: number;
  indexed_pages: number;
}

export interface KnowledgeSourceDetail {
  source: Record<string, unknown>;
  pageCount: number;
  chunkCount: number;
  pages: Array<{
    id: string;
    pageNumber: number;
    charCount: number;
    chunkCount: number;
    preview: string;
    extractionStatus: string;
    footnoteRemoved: boolean;
    removedFootnoteChars: number;
    runningHeaderRemoved: boolean;
    removedRunningHeaderChars: number;
  }>;
  chunks: Array<{
    id: string;
    heading: string;
    sequence: number;
    pageChunkIndex: number;
    pageStart: number;
    pageEnd: number;
    charCount: number;
    wordCount: number;
    facets: string[];
    yearStart: number | null;
    yearEnd: number | null;
    extractionStatus: string;
    active: boolean;
    text: string;
    entities: string[];
    entityDetails: Array<{
      canonicalId: string;
      name: string;
      entityType: string;
      aliases: string[];
    }>;
  }>;
}

export interface QueryInsights {
  summary: {
    total: number;
    unanswered: number;
    averageScore: number;
    averageLatencyMs: number;
  };
  items: Array<{
    question: string;
    answerable: boolean;
    intent: string;
    scope: string;
    retrievalScore: number;
    candidateCount: number;
    selectedCount: number;
    comparisonIntent?: string;
    comparisonDomain?: string;
    explicitFacets?: string[];
    balancedFacets?: string[];
    missingComparisonCells?: string[];
    answerStructure?: string;
    latencyMs: number;
    createdAt: string;
  }>;
}

export function getAiBackendUrl() {
  return (process.env.AI_BACKEND_URL ?? 'http://127.0.0.1:8000').replace(/\/$/, '');
}

export function getRequiredRagRevision() {
  return process.env.AI_REQUIRED_RAG_REVISION ?? 'recoverable-boundary-evolution-planning-f9-v28';
}

export function getMaxPdfSizeMb() {
  const configuredValue = Number(process.env.AI_MAX_PDF_SIZE_MB ?? '200');
  return Number.isFinite(configuredValue) && configuredValue > 0
    ? Math.floor(configuredValue)
    : 200;
}

export function getAiAdminKey() {
  const key = process.env.AI_ADMIN_API_KEY;
  if (!key) throw new Error('Thiếu AI_ADMIN_API_KEY trong .env của web-admin.');
  return key;
}

function describeConnectionError(error: unknown) {
  const backendUrl = getAiBackendUrl();
  if (error instanceof Error && error.name === 'TimeoutError') {
    return `AI backend phản hồi quá chậm tại ${backendUrl}. Hãy kiểm tra Neo4j/OpenAI rồi thử lại.`;
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return `Kết nối AI backend đã bị hủy tại ${backendUrl}.`;
  }
  return `Không kết nối được AI backend tại ${backendUrl}. Hãy chạy FastAPI bằng ./start-ai.sh trong project History-Chatbot.`;
}

export async function fetchAiAdmin<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getAiBackendUrl()}${path}`, {
      ...init,
      headers: {
        'X-Admin-Key': getAiAdminKey(),
        ...(init?.headers ?? {}),
      },
      cache: 'no-store',
      signal: init?.signal ?? AbortSignal.timeout(30_000),
    });
  } catch (error) {
    throw new Error(describeConnectionError(error), { cause: error });
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail ?? data.error ?? 'AI backend không thể xử lý yêu cầu.');
  return data as T;
}

export async function getAiBackendHealth(): Promise<AiBackendHealth> {
  let response: Response;
  try {
    response = await fetch(`${getAiBackendUrl()}/health`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    throw new Error(describeConnectionError(error), { cause: error });
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail ?? 'AI backend chưa sẵn sàng.');
  return data as AiBackendHealth;
}
