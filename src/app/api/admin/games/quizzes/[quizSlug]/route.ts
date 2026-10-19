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
    const item = await quizAdminService.getQuiz(quizSlug);
    if (!item) {
      return NextResponse.json({ error: 'Quiz không tồn tại.' }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Read quiz failed' },
      { status: 400 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ quizSlug: string }> },
) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { quizSlug } = await params;
    const action = new URL(request.url).searchParams.get('action');

    if (action === 'publish') {
      await quizAdminService.publishQuiz(actor, quizSlug);
    } else if (action === 'unpublish') {
      await quizAdminService.unpublishQuiz(actor, quizSlug);
    } else {
      const body = await request.json();
      await quizAdminService.updateQuiz(actor, quizSlug, body);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update quiz failed' },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ quizSlug: string }> },
) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const { quizSlug } = await params;
    await quizAdminService.deleteQuiz(actor, quizSlug);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete quiz failed' },
      { status: 400 },
    );
  }
}
