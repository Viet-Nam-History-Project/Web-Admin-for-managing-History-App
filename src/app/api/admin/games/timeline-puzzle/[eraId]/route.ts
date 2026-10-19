import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { timelineAdminService } from '@/services/timelineAdminService';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eraId: string }> },
) {
  try {
    await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    const { eraId } = await params;
    const item = await timelineAdminService.getEra(eraId);
    if (!item) {
      return NextResponse.json({ error: 'Kỷ nguyên không tồn tại.' }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Read timeline era failed' },
      { status: 400 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eraId: string }> },
) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { eraId } = await params;
    const action = new URL(request.url).searchParams.get('action');

    if (action === 'publish') {
      await timelineAdminService.publishEra(actor, eraId);
    } else if (action === 'unpublish') {
      await timelineAdminService.unpublishEra(actor, eraId);
    } else {
      const body = await request.json();
      await timelineAdminService.updateEra(actor, eraId, body);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update timeline era failed' },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ eraId: string }> },
) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { eraId } = await params;
    await timelineAdminService.deleteEra(actor, eraId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete timeline era failed' },
      { status: 400 },
    );
  }
}
