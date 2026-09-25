import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { timelineAdminService } from '@/services/timelineAdminService';

export async function GET() {
  try {
    await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    const result = await timelineAdminService.listEras();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Read timeline eras failed' },
      { status: 400 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const body = await request.json();
    const eraId = await timelineAdminService.createEra(actor, body);
    return NextResponse.json({ ok: true, eraId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Create timeline era failed' },
      { status: 400 },
    );
  }
}
