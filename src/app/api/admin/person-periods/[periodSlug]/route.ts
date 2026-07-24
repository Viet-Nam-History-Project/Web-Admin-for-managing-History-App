import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { personAdminService } from '@/services/personAdminService';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ periodSlug: string }> }) {
  try {
    await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    return NextResponse.json({ item: await personAdminService.getPeriod((await params).periodSlug) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Read person period failed' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ periodSlug: string }> }) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const periodSlug = (await params).periodSlug;
    const action = new URL(request.url).searchParams.get('action');
    if (action === 'publish') await personAdminService.publishPeriod(actor, periodSlug);
    else if (action === 'unpublish') await personAdminService.unpublishPeriod(actor, periodSlug);
    else await personAdminService.updatePeriod(actor, periodSlug, await request.json());
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Update person period failed' }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ periodSlug: string }> }) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    await personAdminService.softDeletePeriod(actor, (await params).periodSlug);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Delete person period failed' }, { status: 400 });
  }
}
