import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { eventAdminService } from '@/services/eventAdminService';

type Context = { params: Promise<{ periodSlug: string; stageSlug: string; eventSlug: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    const { periodSlug, stageSlug, eventSlug } = await params;
    return NextResponse.json({ item: await eventAdminService.get(periodSlug, stageSlug, eventSlug) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Read event failed' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { periodSlug, stageSlug, eventSlug } = await params;
    const action = new URL(request.url).searchParams.get('action');
    const payload = await request.json();
    if (action === 'publish') await eventAdminService.publish(actor, periodSlug, stageSlug, eventSlug);
    else if (action === 'unpublish') await eventAdminService.unpublish(actor, periodSlug, stageSlug, eventSlug);
    else if (action === 'sync') await eventAdminService.sync(actor, periodSlug, stageSlug, eventSlug);
    else await eventAdminService.update(actor, periodSlug, stageSlug, eventSlug, payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Update event failed' }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { periodSlug, stageSlug, eventSlug } = await params;
    await eventAdminService.softDelete(actor, periodSlug, stageSlug, eventSlug);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Delete event failed' }, { status: 400 });
  }
}
