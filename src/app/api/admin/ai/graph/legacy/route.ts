import { NextRequest, NextResponse } from 'next/server';
import { fetchAiAdmin } from '@/lib/ai/backend';
import { requireAdmin } from '@/lib/auth/requireAdmin';

export async function GET() {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    return NextResponse.json({
      ...await fetchAiAdmin<Record<string, unknown>>(
        '/v1/admin/graph/legacy/preview',
      ),
      canCleanup: actor.roles.includes('super_admin'),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Không thể kiểm tra graph legacy.' },
      { status: 400 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(['super_admin']);
    const payload = await request.json();
    return NextResponse.json(await fetchAiAdmin('/v1/admin/graph/legacy/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Không thể xóa graph legacy.' },
      { status: 400 },
    );
  }
}
