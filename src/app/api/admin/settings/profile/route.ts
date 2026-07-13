import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { writeAuditLog } from '@/lib/audit/auditLogger';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { paths } from '@/lib/firebase/firestorePaths';

const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'Tên hiển thị phải có ít nhất 2 ký tự').max(80),
});

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireAdmin();
    const data = profileSchema.parse(await request.json());
    const adminRef = getAdminDb().doc(`${paths.adminUsers}/${actor.uid}`);
    const before = await adminRef.get();
    await Promise.all([
      getAdminAuth().updateUser(actor.uid, { displayName: data.displayName }),
      adminRef.set({ displayName: data.displayName, updatedAt: FieldValue.serverTimestamp() }, { merge: true }),
    ]);
    await writeAuditLog({ actor, action: 'account_update', entityType: 'admin_user', entityPath: adminRef.path, entityTitle: data.displayName, before: before.data(), after: data });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không cập nhật được hồ sơ.' }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin();
    const payload = z.object({ action: z.enum(['password_changed', 'logout']) }).parse(await request.json());
    const action = payload.action === 'password_changed' ? 'password_change' : 'logout';
    await writeAuditLog({ actor, action, entityType: 'admin_user', entityPath: `${paths.adminUsers}/${actor.uid}`, entityTitle: actor.email, after: { success: true } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không ghi được audit tài khoản.' }, { status: 400 });
  }
}
