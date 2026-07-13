import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { eventAdminService } from '@/services/eventAdminService';

type Context = { params: Promise<{ periodSlug: string; stageSlug: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    const { periodSlug, stageSlug } = await params;
    return NextResponse.json(await eventAdminService.list(periodSlug, stageSlug));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Read events failed' }, { status: 400 });
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { periodSlug, stageSlug } = await params;
    const slug = await eventAdminService.create(actor, periodSlug, stageSlug, await request.json());
    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Create event failed' }, { status: 400 });
  }
}
