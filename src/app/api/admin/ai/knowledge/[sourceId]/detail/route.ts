import { NextRequest, NextResponse } from 'next/server';
import { fetchAiAdmin } from '@/lib/ai/backend';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sourceId: string }> },
) {
  try {
    await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    const { sourceId } = await params;
    const search = request.nextUrl.searchParams;
    const query = new URLSearchParams();
    if (search.get('page_number')) query.set('page_number', search.get('page_number')!);
    if (search.get('query')) query.set('query', search.get('query')!);
    query.set('limit', search.get('limit') ?? '100');
    const data = await fetchAiAdmin(`/v1/admin/knowledge/${encodeURIComponent(sourceId)}?${query}`);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể đọc index.' }, { status: 400 });
  }
}
