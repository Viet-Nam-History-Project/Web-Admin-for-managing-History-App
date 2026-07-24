import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { periodAdminService } from '@/services/periodAdminService';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ periodSlug: string }> },
) {
  try {
    await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    const { periodSlug } = await params;
    const period = await periodAdminService.get(periodSlug);
    return NextResponse.json({ item: period });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Read period failed' },
      { status: 400 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ periodSlug: string }> },
) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { periodSlug } = await params;
    const payload = await request.json();
    const action = new URL(request.url).searchParams.get('action');
    if (action === 'publish') await periodAdminService.publish(actor, periodSlug);
    else if (action === 'unpublish') await periodAdminService.unpublish(actor, periodSlug);
    else if (action) throw new Error('Thao tác graph sync cũ đã được gỡ bỏ. Hãy dùng Index PDF.');
    else await periodAdminService.update(actor, periodSlug, payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update period failed' },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ periodSlug: string }> },
) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { periodSlug } = await params;
    await periodAdminService.softDelete(actor, periodSlug);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete period failed' },
      { status: 400 },
    );
  }
}
