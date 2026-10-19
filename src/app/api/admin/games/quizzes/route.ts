import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { quizAdminService } from '@/services/quizAdminService';

export async function GET() {
  try {
    await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    const result = await quizAdminService.listQuizzes();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Read quizzes failed' },
      { status: 400 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(['super_admin', 'content_admin']);
    const body = await request.json();
    const slug = await quizAdminService.createQuiz(actor, body);
    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Create quiz failed' },
      { status: 400 },
    );
  }
}
