import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { quizAdminService } from '@/services/quizAdminService';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ quizSlug: string; questionId: string }> },
) {
  try {
    await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    const { quizSlug, questionId } = await params;
    const item = await quizAdminService.getQuestion(quizSlug, questionId);
    if (!item) {
      return NextResponse.json({ error: 'Câu hỏi không tồn tại.' }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Read question failed' },
      { status: 400 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ quizSlug: string; questionId: string }> },
) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { quizSlug, questionId } = await params;
    const body = await request.json();
    await quizAdminService.updateQuestion(actor, quizSlug, questionId, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update question failed' },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ quizSlug: string; questionId: string }> },
) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { quizSlug, questionId } = await params;
    await quizAdminService.deleteQuestion(actor, quizSlug, questionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete question failed' },
      { status: 400 },
    );
  }
}
