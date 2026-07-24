import { NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/audit/auditLogger';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { getAdminDb } from '@/lib/firebase/admin';
import { paths } from '@/lib/firebase/firestorePaths';

export async function DELETE(_: Request, { params }: { params: Promise<{ versionId: string }> }) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { versionId } = await params;
    const reference = getAdminDb().collection(paths.aiPromptVersions).doc(versionId);
    const snapshot = await reference.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'Không tìm thấy phiên bản prompt.' }, { status: 404 });
    }

    const data = snapshot.data()!;
    if (data.status === 'active') {
      return NextResponse.json(
        { error: 'Không thể xóa phiên bản đang dùng. Hãy kích hoạt phiên bản khác trước.' },
        { status: 409 },
      );
    }

    await reference.delete();
    await writeAuditLog({
      actor,
      action: 'permanent_delete',
      entityType: 'ai_prompt_version',
      entityPath: reference.path,
      entityTitle: String(data.name || versionId),
      before: data,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Không thể xóa phiên bản prompt.' },
      { status: 400 },
    );
  }
}
