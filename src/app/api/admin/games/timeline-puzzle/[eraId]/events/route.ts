import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { timelineAdminService } from '@/services/timelineAdminService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eraId: string }> },
) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { eraId } = await params;
    const body = await request.json();

    if (Array.isArray(body)) {
      const replace = new URL(request.url).searchParams.get('mode') === 'replace';
      const events = await timelineAdminService.batchImportEvents(actor, eraId, body, replace);
      return NextResponse.json({ ok: true, events });
    }

    const events = await timelineAdminService.addEvent(actor, eraId, body);
    return NextResponse.json({ ok: true, events });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Save timeline event failed' },
      { status: 400 },
    );
  }
}
