import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { personAdminService } from '@/services/personAdminService';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ periodSlug: string; personSlug: string }> }) {
  try {
    await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    const { periodSlug, personSlug } = await params;
    return NextResponse.json({ item: await personAdminService.getPerson(periodSlug, personSlug) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Read person failed' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ periodSlug: string; personSlug: string }> }) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { periodSlug, personSlug } = await params;
    const action = new URL(request.url).searchParams.get('action');
    if (action === 'publish') await personAdminService.publishPerson(actor, periodSlug, personSlug);
    else if (action === 'unpublish') await personAdminService.unpublishPerson(actor, periodSlug, personSlug);
    else await personAdminService.updatePerson(actor, periodSlug, personSlug, await request.json());
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Update person failed' }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ periodSlug: string; personSlug: string }> }) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { periodSlug, personSlug } = await params;
    await personAdminService.softDeletePerson(actor, periodSlug, personSlug);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Delete person failed' }, { status: 400 });
  }
}
