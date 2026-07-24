import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { stageAdminService } from '@/services/stageAdminService';

type Context = { params: Promise<{ periodSlug: string; stageSlug: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    const { periodSlug, stageSlug } = await params;
    return NextResponse.json({ item: await stageAdminService.get(periodSlug, stageSlug) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Read stage failed' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { periodSlug, stageSlug } = await params;
    const action = new URL(request.url).searchParams.get('action');
    const payload = await request.json();
    if (action === 'publish') await stageAdminService.publish(actor, periodSlug, stageSlug);
    else if (action === 'unpublish') await stageAdminService.unpublish(actor, periodSlug, stageSlug);
    else if (action) throw new Error('Thao tác graph sync cũ đã được gỡ bỏ. Hãy dùng Index PDF.');
    else await stageAdminService.update(actor, periodSlug, stageSlug, payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Update stage failed' }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { periodSlug, stageSlug } = await params;
    await stageAdminService.softDelete(actor, periodSlug, stageSlug);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Delete stage failed' }, { status: 400 });
  }
}
