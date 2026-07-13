import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { periodExportService } from '@/services/periodExportService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin(['super_admin', 'content_admin', 'viewer']);
    const data = await periodExportService.exportAll();
    const date = new Date().toISOString().slice(0, 10);

    return NextResponse.json(data, {
      headers: {
        'Content-Disposition': `attachment; filename="periods-full-export-${date}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Không xuất được dữ liệu periods.' },
      { status: 400 },
    );
  }
}
