import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { trashAdminService } from '@/services/trashAdminService';

export async function GET() {
  try {
    await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    return NextResponse.json({ items: await trashAdminService.list() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Read trash failed' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { trashId } = await request.json();
    await trashAdminService.restore(actor, trashId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Restore failed' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const actor = await requireAdmin(['super_admin']);
    const { trashId, confirmation } = await request.json();
    await trashAdminService.permanentDelete(actor, trashId, confirmation);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Permanent delete failed' }, { status: 400 });
  }
}
