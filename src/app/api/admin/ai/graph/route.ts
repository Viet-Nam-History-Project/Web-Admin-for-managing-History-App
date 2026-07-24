import { NextRequest, NextResponse } from 'next/server';
import { fetchAiAdmin } from '@/lib/ai/backend';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    const mode = request.nextUrl.searchParams.get('mode') ?? 'summary';
    if (mode === 'search') {
      const query = new URLSearchParams({
        query: request.nextUrl.searchParams.get('query') ?? '',
        label: request.nextUrl.searchParams.get('label') ?? '',
        limit: request.nextUrl.searchParams.get('limit') ?? '40',
      });
      return NextResponse.json(await fetchAiAdmin(`/v1/admin/graph/search?${query}`));
    }
    return NextResponse.json(await fetchAiAdmin('/v1/admin/graph/summary'));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể đọc graph.' }, { status: 400 });
  }
}
