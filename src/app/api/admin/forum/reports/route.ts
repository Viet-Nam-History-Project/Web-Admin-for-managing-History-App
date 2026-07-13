import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { forumAdminService } from '@/services/forumAdminService';

const moderationSchema = z.object({
  reportPath: z.string().regex(/^forum\/[^/]+\/reports\/[^/]+$/),
  action: z.enum(['review', 'dismiss', 'hide_post']),
  note: z.string().max(1000).optional().default(''),
});

function errorResponse(error: unknown, fallback: string) {
  const status = typeof error === 'object' && error && 'status' in error
    ? Number((error as { status: number }).status)
    : 400;
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status },
  );
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(['super_admin', 'moderator', 'content_admin', 'viewer']);
    const query = new URL(request.url).searchParams;
    return NextResponse.json(await forumAdminService.listReports({
      status: query.get('status') ?? '',
      reason: query.get('reason') ?? '',
      search: query.get('search') ?? '',
    }));
  } catch (error) {
    return errorResponse(error, 'Không tải được báo cáo vi phạm.');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireAdmin(['super_admin', 'moderator', 'content_admin']);
    const payload = moderationSchema.parse(await request.json());
    return NextResponse.json(await forumAdminService.moderate(
      actor,
      payload.reportPath,
      payload.action,
      payload.note,
    ));
  } catch (error) {
    return errorResponse(error, 'Không xử lý được báo cáo vi phạm.');
  }
}
