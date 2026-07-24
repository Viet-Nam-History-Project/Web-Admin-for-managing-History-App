import { NextRequest, NextResponse } from 'next/server';
import { fetchAiAdmin } from '@/lib/ai/backend';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export const dynamic = 'force-dynamic';

function safeFilename(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'component';
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    const componentType = request.nextUrl.searchParams.get('componentType') ?? '';
    const name = request.nextUrl.searchParams.get('name') ?? '';
    const includeEmbeddings = request.nextUrl.searchParams.get('includeEmbeddings') === 'true';

    if (!['node', 'relationship'].includes(componentType) || !name.trim()) {
      return NextResponse.json({ error: 'Thành phần graph không hợp lệ.' }, { status: 400 });
    }

    const query = new URLSearchParams({
      component_type: componentType,
      name: name.trim(),
      include_embeddings: String(includeEmbeddings),
    });
    const data = await fetchAiAdmin<unknown>(`/v1/admin/graph/export?${query}`, {
      signal: AbortSignal.timeout(120_000),
    });
    const date = new Date().toISOString().slice(0, 10);
    const filename = `neo4j-${componentType}-${safeFilename(name)}-${date}.json`;

    return NextResponse.json(data, {
      headers: {
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Không xuất được thành phần graph.' },
      { status: 400 },
    );
  }
}
