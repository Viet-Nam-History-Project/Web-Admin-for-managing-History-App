import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { personAdminService } from '@/services/personAdminService';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ periodSlug: string; personSlug: string }> }) {
  try {
    await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    const { periodSlug, personSlug } = await params;
    return NextResponse.json(await personAdminService.listPersonEvents(periodSlug, personSlug));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Read person events failed' }, { status: 400 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ periodSlug: string; personSlug: string }> }) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { periodSlug, personSlug } = await params;
    const slug = await personAdminService.createPersonEvent(actor, periodSlug, personSlug, await request.json());
    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Create person event failed' }, { status: 400 });
  }
}
