import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { periodAdminService } from '@/services/periodAdminService';

export async function GET() {
  try {
    await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    const result = await periodAdminService.list();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unauthorized' },
      { status: 401 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const payload = await request.json();
    const slug = await periodAdminService.create(actor, payload);
    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Create period failed' },
      { status: 400 },
    );
  }
}
