import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { userAdminService } from '@/services/userAdminService';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(['super_admin', 'analyst', 'viewer']);
    const query = new URL(request.url).searchParams;
    return NextResponse.json(await userAdminService.list({
      search: query.get('search') ?? '',
      status: query.get('status') ?? '',
      rank: query.get('rank') ?? '',
      cursor: query.get('cursor') ?? '',
      pageSize: Number(query.get('pageSize') ?? 25),
    }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Không tải được người dùng.' }, { status: 400 });
  }
}
