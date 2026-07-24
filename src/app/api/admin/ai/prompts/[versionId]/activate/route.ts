import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { fetchAiAdmin } from '@/lib/ai/backend';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { getAdminDb } from '@/lib/firebase/admin';
import { paths } from '@/lib/firebase/firestorePaths';
import { normalizePromptLayers } from '@/lib/ai/promptDefaults';

export async function POST(_: Request, { params }: { params: Promise<{ versionId: string }> }) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { versionId } = await params;
    const collection = getAdminDb().collection(paths.aiPromptVersions);
    const reference = collection.doc(versionId);
    const snapshot = await reference.get();
    if (!snapshot.exists) return NextResponse.json({ error: 'Không tìm thấy phiên bản.' }, { status: 404 });
    const data = snapshot.data()!;
    const runtimePrompt = await fetchAiAdmin<Record<string, unknown>>('/v1/admin/prompt');
    const layers = normalizePromptLayers(data, normalizePromptLayers(runtimePrompt));
    await fetchAiAdmin('/v1/admin/prompt', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        version_id: versionId,
        name: data.name,
        system_prompt: layers.systemPrompt,
        query_normalization_instruction: layers.queryNormalizationInstruction,
        answer_planning_instruction: layers.answerPlanningInstruction,
        presentation_instruction: layers.presentationInstruction,
        output_contract: layers.outputContract,
      }),
    });
    const active = await collection.where('status', '==', 'active').get();
    const batch = getAdminDb().batch();
    active.docs.forEach((document) => batch.set(document.ref, { status: 'archived' }, { merge: true }));
    batch.set(reference, {
      ...layers,
      status: 'active',
      activatedAt: FieldValue.serverTimestamp(),
      activatedBy: actor.uid,
    }, { merge: true });
    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể kích hoạt prompt.' }, { status: 400 });
  }
}
