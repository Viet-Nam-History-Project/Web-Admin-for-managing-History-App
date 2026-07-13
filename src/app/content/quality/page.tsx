import Link from 'next/link';
import { AdminShell } from '@/components/layout/AdminShell';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/State';
import { contentQualityService } from '@/services/contentQualityService';

export const dynamic = 'force-dynamic';
export default async function ContentQualityPage() {
  const items = await contentQualityService.scan().catch(() => []);
  return <AdminShell><PageHeader eyebrow="Nội dung" title="Chất lượng nội dung" description="Chấm điểm theo title, slug, ảnh, tóm tắt, nội dung chi tiết, graph và dữ liệu liên kết. Mục điểm thấp được ưu tiên trước." />{items.length ? <DataTable><TableHead><TableRow><TableHeaderCell>Điểm</TableHeaderCell><TableHeaderCell>Loại</TableHeaderCell><TableHeaderCell>Nội dung</TableHeaderCell><TableHeaderCell>Vấn đề cần xử lý</TableHeaderCell><TableHeaderCell></TableHeaderCell></TableRow></TableHead><tbody>{items.map((item) => <TableRow key={item.id}><TableCell><span className={`inline-flex h-11 w-11 items-center justify-center rounded-full font-black ${item.score >= 75 ? 'bg-emerald-100 text-emerald-700' : item.score >= 50 ? 'bg-gold/20 text-bronze' : 'bg-flag/10 text-flag'}`}>{item.score}</span></TableCell><TableCell><Badge tone="neutral">{item.entityType}</Badge></TableCell><TableCell className="font-black text-charcoal">{item.title}</TableCell><TableCell><div className="flex max-w-xl flex-wrap gap-1">{item.issues.map((issue) => <span key={issue} className="rounded-md bg-flag/5 px-2 py-1 text-xs font-semibold text-flag">{issue}</span>)}</div></TableCell><TableCell><Link href={item.adminHref}><Button variant="outline">Kiểm tra</Button></Link></TableCell></TableRow>)}</tbody></DataTable> : <EmptyState title="Không có dữ liệu để quét" description="Kiểm tra cấu hình Firebase hoặc tạo nội dung lịch sử đầu tiên." />}</AdminShell>;
}
