import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { stageAdminService } from '@/services/stageAdminService';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ periodSlug: string }> }) {
  try {
    await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    const { periodSlug } = await params;
    return NextResponse.json(await stageAdminService.list(periodSlug));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Read stages failed' }, { status: 400 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ periodSlug: string }> }) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { periodSlug } = await params;
    const slug = await stageAdminService.create(actor, periodSlug, await request.json());
    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Create stage failed' }, { status: 400 });
  }
}
