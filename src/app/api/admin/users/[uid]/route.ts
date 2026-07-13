import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { userAdminService } from '@/services/userAdminService';

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('set_disabled'), disabled: z.boolean(), reason: z.string() }),
  z.object({ action: z.literal('adjust_xp'), delta: z.coerce.number().int(), reason: z.string() }),
  z.object({ action: z.literal('reset_streak'), reason: z.string() }),
  z.object({ action: z.literal('revoke_sessions') }),
]);

export async function GET(_request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    await requireAdmin(['super_admin', 'analyst', 'viewer']);
    const { uid } = await params;
    return NextResponse.json({ item: await userAdminService.get(uid) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không tải được người dùng.' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  try {
    const actor = await requireAdmin(['super_admin']);
    const { uid } = await params;
    const payload = actionSchema.parse(await request.json());
    if (payload.action === 'set_disabled') await userAdminService.setDisabled(actor, uid, payload.disabled, payload.reason);
    else if (payload.action === 'adjust_xp') await userAdminService.adjustXp(actor, uid, payload.delta, payload.reason);
    else if (payload.action === 'reset_streak') await userAdminService.resetStreak(actor, uid, payload.reason);
    else await userAdminService.revokeSessions(actor, uid);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không cập nhật được người dùng.' }, { status: 400 });
  }
}
