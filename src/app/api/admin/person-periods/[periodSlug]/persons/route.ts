import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { personAdminService } from '@/services/personAdminService';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ periodSlug: string }> }) {
  try {
    await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    return NextResponse.json(await personAdminService.listPersons((await params).periodSlug));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Read persons failed' }, { status: 400 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ periodSlug: string }> }) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const slug = await personAdminService.createPerson(actor, (await params).periodSlug, await request.json());
    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Create person failed' }, { status: 400 });
  }
}
