import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { quizAdminService } from '@/services/quizAdminService';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ quizSlug: string }> },
) {
  try {
    await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    const { quizSlug } = await params;
    const items = await quizAdminService.listQuestions(quizSlug);
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Read questions failed' },
      { status: 400 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quizSlug: string }> },
) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { quizSlug } = await params;
    const body = await request.json();

    if (Array.isArray(body)) {
      const result = await quizAdminService.batchImportQuestions(actor, quizSlug, body);
      return NextResponse.json({ ok: true, ...result });
    }

    const questionId = await quizAdminService.createQuestion(actor, quizSlug, body);
    return NextResponse.json({ ok: true, questionId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Create or import questions failed' },
      { status: 400 },
    );
  }
}
