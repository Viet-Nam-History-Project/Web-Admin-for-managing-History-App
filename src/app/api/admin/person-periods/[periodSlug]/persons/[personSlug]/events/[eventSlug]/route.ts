import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { personAdminService } from '@/services/personAdminService';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ periodSlug: string; personSlug: string; eventSlug: string }> }) {
  try {
    await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    const { periodSlug, personSlug, eventSlug } = await params;
    return NextResponse.json({ item: await personAdminService.getPersonEvent(periodSlug, personSlug, eventSlug) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Read person event failed' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ periodSlug: string; personSlug: string; eventSlug: string }> }) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { periodSlug, personSlug, eventSlug } = await params;
    const action = new URL(request.url).searchParams.get('action');
    if (action === 'publish') await personAdminService.publishPersonEvent(actor, periodSlug, personSlug, eventSlug);
    else if (action === 'unpublish') await personAdminService.unpublishPersonEvent(actor, periodSlug, personSlug, eventSlug);
    else await personAdminService.updatePersonEvent(actor, periodSlug, personSlug, eventSlug, await request.json());
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Update person event failed' }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ periodSlug: string; personSlug: string; eventSlug: string }> }) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { periodSlug, personSlug, eventSlug } = await params;
    await personAdminService.softDeletePersonEvent(actor, periodSlug, personSlug, eventSlug);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Delete person event failed' }, { status: 400 });
  }
}
