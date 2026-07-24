import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchAiAdmin } from '@/lib/ai/backend';
import { requireAdmin } from '@/lib/auth/requireAdmin';

const promptSchema = z.object({
  version_id: z.string().trim().min(1).max(100),
  name: z.string().trim().min(2).max(120),
  system_prompt: z.string().trim().min(100).max(20_000),
  query_normalization_instruction: z.string().trim().min(40).max(12_000),
  answer_planning_instruction: z.string().trim().min(40).max(12_000),
  presentation_instruction: z.string().trim().min(40).max(8_000),
  output_contract: z.string().trim().min(40).max(8_000),
});

export async function GET() {
  try {
    await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    return NextResponse.json(await fetchAiAdmin('/v1/admin/prompt'));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể đọc prompt.' }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(['super_admin', 'content_admin']);
    const payload = promptSchema.parse(await request.json());
    return NextResponse.json(await fetchAiAdmin('/v1/admin/prompt', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không thể kích hoạt prompt.' }, { status: 400 });
  }
}
