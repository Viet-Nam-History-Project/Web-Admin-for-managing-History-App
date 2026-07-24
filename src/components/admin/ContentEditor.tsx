'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { adminFetch } from '@/lib/api/adminClient';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Field, Input, Textarea } from '@/components/ui/Form';

type EditorKind = 'period' | 'stage' | 'event';
type FormValues = Record<string, string | number | string[] | undefined>;

const toLines = (value: FormValues[string]) => Array.isArray(value) ? value.join('\n') : String(value ?? '');
const fromLines = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean);

export function ContentEditor({
  kind,
  endpoint,
  returnTo,
  initial = {},
  editing = false,
}: {
  kind: EditorKind;
  endpoint: string;
  returnTo: string;
  initial?: FormValues;
  editing?: boolean;
}) {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>({ status: 'draft', sortOrder: 0, ...initial });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(name: string, value: string | number) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function lines(name: string) {
    return toLines(values[name]);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const common = {
        title: values.title,
        slug: values.slug,
        startDate: values.startDate ?? '',
        endDate: values.endDate ?? '',
        coverMediaRef: values.coverMediaRef ?? '',
        status: values.status ?? 'draft',
        sortOrder: Number(values.sortOrder ?? 0),
        tags: fromLines(lines('tags')),
      };
      const payload = kind === 'period' ? {
        ...common,
        summary: values.summary ?? '',
        description: values.description ?? '',
      } : kind === 'stage' ? {
        ...common,
        description: values.description ?? '',
        overview: values.overview ?? '',
        details: fromLines(lines('details')),
        result: fromLines(lines('result')),
        impactOnPresent: values.impactOnPresent ?? '',
        relatedPersons: fromLines(lines('relatedPersons')),
        relatedLocations: fromLines(lines('relatedLocations')),
      } : {
        ...common,
        smallTitle: values.smallTitle ?? '',
        summary: values.summary ?? '',
        description: values.description ?? '',
        details: fromLines(lines('details')),
        warCause: fromLines(lines('warCause')),
        object: {
          vn: fromLines(lines('objectVn')),
          usAllies: fromLines(lines('objectOpponent')),
        },
        content: {
          forces: {
            vn: fromLines(lines('forcesVn')),
            usAllies: fromLines(lines('forcesOpponent')),
          },
          warSummary: fromLines(lines('progress')).map((detail, index) => ({ detail, sortOrder: index, images: [] })),
          result: {
            vn: fromLines(lines('resultVn')),
            usAllies: fromLines(lines('resultOpponent')),
          },
        },
        meaning: fromLines(lines('meaning')),
        impactOnPresent: values.impactOnPresent ?? '',
        images: fromLines(lines('imageUrls')).map((link) => ({ link, content: 'Tư liệu hình ảnh' })),
        videos: fromLines(lines('videoUrls')).map((link) => ({ link, content: 'Tư liệu video' })),
        youtubeId: values.youtubeId ?? '',
        relatedPersons: fromLines(lines('relatedPersons')),
        relatedEvents: fromLines(lines('relatedEvents')),
        relatedLocations: fromLines(lines('relatedLocations')),
      };
      await adminFetch<{ slug?: string }>(endpoint, {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      router.push(returnTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu dữ liệu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <Card>
        <CardTitle>Thông tin nhận diện</CardTitle>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Field label="Tiêu đề"><Input required value={String(values.title ?? '')} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Đường dẫn định danh" hint="Dùng chữ thường, số và dấu gạch ngang; không thể đổi sau khi tạo.">
            <Input required disabled={editing} value={String(values.slug ?? '')} onChange={(e) => set('slug', e.target.value)} />
          </Field>
          <Field label="Năm bắt đầu"><Input value={String(values.startDate ?? '')} onChange={(e) => set('startDate', e.target.value)} placeholder="Có thể dùng số âm cho TCN" /></Field>
          <Field label="Năm kết thúc"><Input value={String(values.endDate ?? '')} onChange={(e) => set('endDate', e.target.value)} /></Field>
          <Field label="Thứ tự"><Input type="number" value={Number(values.sortOrder ?? 0)} onChange={(e) => set('sortOrder', Number(e.target.value))} /></Field>
          <Field label="Trạng thái">
            <select className="h-11 rounded-lg border border-[var(--border)] bg-white/80 px-3 text-sm" value={String(values.status ?? 'draft')} onChange={(e) => set('status', e.target.value)}>
              <option value="draft">Bản nháp</option><option value="published">Đã xuất bản</option><option value="archived">Lưu trữ</option>
            </select>
          </Field>
          <Field label="Ảnh bìa"><Input value={String(values.coverMediaRef ?? '')} onChange={(e) => set('coverMediaRef', e.target.value)} /></Field>
          <Field label="Từ khóa" hint="Mỗi dòng một từ khóa"><Textarea value={lines('tags')} onChange={(e) => set('tags', e.target.value)} /></Field>
        </div>
      </Card>

      {kind === 'period' ? (
        <Card><CardTitle>Nội dung thời kỳ</CardTitle><div className="mt-4 grid gap-4"><Field label="Tóm tắt"><Textarea value={String(values.summary ?? '')} onChange={(e) => set('summary', e.target.value)} /></Field><Field label="Mô tả chi tiết"><Textarea className="min-h-44" value={String(values.description ?? '')} onChange={(e) => set('description', e.target.value)} /></Field></div></Card>
      ) : null}

      {kind === 'stage' ? (
        <Card><CardTitle>Nội dung giai đoạn</CardTitle><div className="mt-4 grid gap-4 lg:grid-cols-2"><Field label="Tổng quan"><Textarea value={String(values.overview ?? '')} onChange={(e) => set('overview', e.target.value)} /></Field><Field label="Mô tả"><Textarea value={String(values.description ?? '')} onChange={(e) => set('description', e.target.value)} /></Field><Field label="Chi tiết (mỗi dòng một ý)"><Textarea value={lines('details')} onChange={(e) => set('details', e.target.value)} /></Field><Field label="Kết quả"><Textarea value={lines('result')} onChange={(e) => set('result', e.target.value)} /></Field><Field label="Tác động hiện tại"><Textarea value={String(values.impactOnPresent ?? '')} onChange={(e) => set('impactOnPresent', e.target.value)} /></Field><Field label="Mã nhân vật liên quan" hint="Mỗi dòng một mã định danh"><Textarea value={lines('relatedPersons')} onChange={(e) => set('relatedPersons', e.target.value)} /></Field></div></Card>
      ) : null}

      {kind === 'event' ? (
        <>
          <Card><CardTitle>Nội dung sự kiện</CardTitle><div className="mt-4 grid gap-4 lg:grid-cols-2"><Field label="Tóm tắt"><Textarea value={String(values.summary ?? '')} onChange={(e) => set('summary', e.target.value)} /></Field><Field label="Mô tả"><Textarea value={String(values.description ?? '')} onChange={(e) => set('description', e.target.value)} /></Field><Field label="Lí do"><Textarea value={lines('warCause')} onChange={(e) => set('warCause', e.target.value)} /></Field><Field label="Mục tiêu / chi tiết"><Textarea value={lines('details')} onChange={(e) => set('details', e.target.value)} /></Field><Field label="Lực lượng Việt Nam"><Textarea value={lines('forcesVn')} onChange={(e) => set('forcesVn', e.target.value)} /></Field><Field label="Lực lượng đối phương"><Textarea value={lines('forcesOpponent')} onChange={(e) => set('forcesOpponent', e.target.value)} /></Field><Field label="Diễn biến (mỗi dòng một mốc)"><Textarea className="min-h-44" value={lines('progress')} onChange={(e) => set('progress', e.target.value)} /></Field><Field label="Ý nghĩa"><Textarea value={lines('meaning')} onChange={(e) => set('meaning', e.target.value)} /></Field><Field label="Kết quả phía Việt Nam"><Textarea value={lines('resultVn')} onChange={(e) => set('resultVn', e.target.value)} /></Field><Field label="Kết quả phía đối phương"><Textarea value={lines('resultOpponent')} onChange={(e) => set('resultOpponent', e.target.value)} /></Field><Field label="Đối tượng / mục tiêu phía Việt Nam"><Textarea value={lines('objectVn')} onChange={(e) => set('objectVn', e.target.value)} /></Field><Field label="Đối tượng / mục tiêu phía đối phương"><Textarea value={lines('objectOpponent')} onChange={(e) => set('objectOpponent', e.target.value)} /></Field><Field label="Tác động hiện tại"><Textarea value={String(values.impactOnPresent ?? '')} onChange={(e) => set('impactOnPresent', e.target.value)} /></Field></div></Card>
          <Card><CardTitle>Tư liệu và liên kết</CardTitle><div className="mt-4 grid gap-4 lg:grid-cols-2"><Field label="Danh sách ảnh" hint="Mỗi dòng một địa chỉ"><Textarea value={lines('imageUrls')} onChange={(e) => set('imageUrls', e.target.value)} /></Field><Field label="Danh sách video" hint="Mỗi dòng một địa chỉ"><Textarea value={lines('videoUrls')} onChange={(e) => set('videoUrls', e.target.value)} /></Field><Field label="Mã video YouTube"><Input value={String(values.youtubeId ?? '')} onChange={(e) => set('youtubeId', e.target.value)} /></Field><Field label="Nhân vật liên quan"><Textarea value={lines('relatedPersons')} onChange={(e) => set('relatedPersons', e.target.value)} /></Field><Field label="Sự kiện liên quan"><Textarea value={lines('relatedEvents')} onChange={(e) => set('relatedEvents', e.target.value)} /></Field><Field label="Địa điểm liên quan"><Textarea value={lines('relatedLocations')} onChange={(e) => set('relatedLocations', e.target.value)} /></Field></div></Card>
        </>
      ) : null}

      {error ? <p className="rounded-xl border border-flag/20 bg-flag/5 p-3 text-sm font-semibold text-flag">{error}</p> : null}
      <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => router.push(returnTo)}>Hủy</Button><Button disabled={loading} type="submit">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Lưu dữ liệu</Button></div>
    </form>
  );
}
