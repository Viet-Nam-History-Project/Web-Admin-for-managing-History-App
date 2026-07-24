import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { fetchAiAdmin } from '@/lib/ai/backend';
import { normalizePromptLayers } from '@/lib/ai/promptDefaults';
import { getAdminDb } from '@/lib/firebase/admin';
import { paths } from '@/lib/firebase/firestorePaths';

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  systemPrompt: z.string().trim().min(100).max(20_000),
  queryNormalizationInstruction: z.string().trim().min(40).max(12_000),
  answerPlanningInstruction: z.string().trim().min(40).max(12_000),
  presentationInstruction: z.string().trim().min(40).max(8_000),
  outputContract: z.string().trim().min(40).max(8_000),
  note: z.string().trim().max(500).optional().default(''),
});

function toIso(value: unknown) {
  return value instanceof Timestamp ? value.toDate().toISOString() : '';
}

export async function GET() {
  try {
    await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    const [snapshot, runtimePrompt] = await Promise.all([
      getAdminDb().collection(paths.aiPromptVersions).orderBy('createdAt', 'desc').limit(50).get(),
      fetchAiAdmin<Record<string, unknown>>('/v1/admin/prompt'),
    ]);
    const runtimeLayers = normalizePromptLayers(runtimePrompt);
    return NextResponse.json({ activePrompt: runtimeLayers, items: snapshot.docs.map((document) => {
      const data = document.data();
      return {
        id: document.id,
        ...data,
        ...normalizePromptLayers(data, runtimeLayers),
        createdAt: toIso(data.createdAt),
        activatedAt: toIso(data.activatedAt),
      };
    }) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể tải prompt.' }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const payload = schema.parse(await request.json());
    const reference = getAdminDb().collection(paths.aiPromptVersions).doc();
    await reference.set({
      ...payload,
      status: 'draft',
      createdBy: actor.uid,
      createdByEmail: actor.email,
      createdAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ id: reference.id, ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể lưu prompt.' }, { status: 400 });
  }
}
