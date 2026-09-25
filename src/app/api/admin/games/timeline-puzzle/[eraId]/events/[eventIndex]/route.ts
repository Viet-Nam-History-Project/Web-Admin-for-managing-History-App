import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { timelineAdminService } from '@/services/timelineAdminService';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eraId: string; eventIndex: string }> },
) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { eraId, eventIndex } = await params;
    const body = await request.json();
    const events = await timelineAdminService.updateEvent(
      actor,
      eraId,
      Number(eventIndex),
      body,
    );
    return NextResponse.json({ ok: true, events });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update timeline event failed' },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ eraId: string; eventIndex: string }> },
) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { eraId, eventIndex } = await params;
    const events = await timelineAdminService.deleteEvent(actor, eraId, Number(eventIndex));
    return NextResponse.json({ ok: true, events });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete timeline event failed' },
      { status: 400 },
    );
  }
}
