import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { personAdminService } from '@/services/personAdminService';

export async function GET() {
  try {
    await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    return NextResponse.json(await personAdminService.listPeriods());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Read person periods failed' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const slug = await personAdminService.createPeriod(actor, await request.json());
    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Create person period failed' }, { status: 400 });
  }
}
