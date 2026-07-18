'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { adminFetch } from '@/lib/api/adminClient';
import { HistoricalEventOption } from '@/services/personAdminService';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';
import { Field, Input, Textarea } from '@/components/ui/Form';

type Kind = 'period' | 'person' | 'event';
type FormValues = Record<string, string | number | string[] | undefined>;

const toLines = (value: FormValues[string]) => Array.isArray(value) ? value.join('\n') : String(value ?? '');
const fromLines = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean);
const selectClass = 'h-11 w-full rounded-lg border border-[var(--border)] bg-white/80 px-3 text-sm';

function parseEventRef(eventRef?: string) {
  const parts = String(eventRef ?? '').split('/');
  return parts.length === 6 && parts[0] === 'periods' && parts[2] === 'stages' && parts[4] === 'events'
    ? { periodSlug: parts[1], stageSlug: parts[3] }
    : { periodSlug: '', stageSlug: '' };
}

export function PersonContentEditor({
  kind, endpoint, returnTo, initial = {}, editing = false, historicalEvents = [],
}: {
  kind: Kind;
  endpoint: string;
  returnTo: string;
  initial?: FormValues;
  editing?: boolean;
  historicalEvents?: HistoricalEventOption[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>({ status: 'draft', sortOrder: 0, ...initial });
  const initialRef = parseEventRef(String(initial.eventRef ?? ''));
  const [selectedPeriod, setSelectedPeriod] = useState(initialRef.periodSlug);
  const [selectedStage, setSelectedStage] = useState(initialRef.stageSlug);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sourcePeriods = useMemo(() => [...new Map(historicalEvents.map((item) => [item.periodSlug, { slug: item.periodSlug, title: item.periodTitle }])).values()], [historicalEvents]);
  const sourceStages = useMemo(() => [...new Map(historicalEvents.filter((item) => item.periodSlug === selectedPeriod).map((item) => [item.stageSlug, { slug: item.stageSlug, title: item.stageTitle }])).values()], [historicalEvents, selectedPeriod]);
  const sourceEvents = useMemo(() => historicalEvents.filter((item) => item.periodSlug === selectedPeriod && item.stageSlug === selectedStage), [historicalEvents, selectedPeriod, selectedStage]);

  function set(name: string, value: string | number) { setValues((current) => ({ ...current, [name]: value })); }
  function lines(name: string) { return toLines(values[name]); }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const base = { slug: values.slug, status: values.status ?? 'draft', sortOrder: Number(values.sortOrder ?? 0) };
      const payload = kind === 'period' ? {
        ...base, title: values.title, startDate: values.startDate ?? '', endDate: values.endDate ?? '',
        coverMediaRef: values.coverMediaRef ?? '', description: values.description ?? '', tags: [],
      } : kind === 'person' ? {
        ...base, name: values.name, title: values.title, overview: values.overview ?? '', hometown: values.hometown ?? '',
        birthDate: values.birthDate ?? '', deathDate: values.deathDate ?? '', coverMediaRef: values.coverMediaRef ?? '',
        horizontalImage: values.horizontalImage ?? '', achievements: fromLines(lines('achievements')),
        lifetime: fromLines(lines('lifetime')), video: { link: values.videoLink ?? '', content: values.videoContent ?? '' },
      } : {
        ...base, title: values.title, overview: values.overview ?? '', role: values.role ?? '',
        description: values.description ?? '', coverMediaRef: values.coverMediaRef ?? '', eventRef: values.eventRef ?? '',
      };
      await adminFetch(endpoint, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      router.push(returnTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể lưu dữ liệu.');
    } finally {
      setLoading(false);
    }
  }

  return <form onSubmit={submit} className="grid gap-5">
    <Card>
      <CardTitle>Thông tin nhận diện</CardTitle>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {kind === 'person' ? <>
          <Field label="Tên nhân vật"><Input required value={String(values.name ?? '')} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Danh hiệu / chức vụ"><Input required value={String(values.title ?? '')} onChange={(e) => set('title', e.target.value)} /></Field>
        </> : <Field label="Tiêu đề"><Input required value={String(values.title ?? '')} onChange={(e) => set('title', e.target.value)} /></Field>}
        <Field label="Slug" hint="Chữ thường, số và dấu gạch ngang; không đổi sau khi tạo."><Input required disabled={editing} value={String(values.slug ?? '')} onChange={(e) => set('slug', e.target.value)} /></Field>
        {kind === 'period' ? <>
          <Field label="Năm bắt đầu"><Input value={String(values.startDate ?? '')} onChange={(e) => set('startDate', e.target.value)} placeholder="Có thể dùng số âm cho TCN" /></Field>
          <Field label="Năm kết thúc"><Input value={String(values.endDate ?? '')} onChange={(e) => set('endDate', e.target.value)} /></Field>
        </> : null}
        {kind === 'person' ? <>
          <Field label="Ngày/năm sinh"><Input value={String(values.birthDate ?? '')} onChange={(e) => set('birthDate', e.target.value)} /></Field>
          <Field label="Ngày/năm mất"><Input value={String(values.deathDate ?? '')} onChange={(e) => set('deathDate', e.target.value)} /></Field>
        </> : null}
        <Field label="Thứ tự"><Input type="number" value={Number(values.sortOrder ?? 0)} onChange={(e) => set('sortOrder', Number(e.target.value))} /></Field>
        <Field label="Trạng thái"><select className={selectClass} value={String(values.status ?? 'draft')} onChange={(e) => set('status', e.target.value)}><option value="draft">Bản nháp</option><option value="published">Đã xuất bản</option><option value="archived">Lưu trữ</option></select></Field>
        <Field label={kind === 'person' ? 'Ảnh thumbnail / coverMediaRef' : 'Ảnh bìa / coverMediaRef'}><Input value={String(values.coverMediaRef ?? '')} onChange={(e) => set('coverMediaRef', e.target.value)} /></Field>
        {kind === 'person' ? <Field label="Ảnh banner / horizontalImage"><Input value={String(values.horizontalImage ?? '')} onChange={(e) => set('horizontalImage', e.target.value)} /></Field> : null}
      </div>
    </Card>

    {kind === 'period' ? <Card><CardTitle>Nội dung nhóm nhân vật</CardTitle><div className="mt-4"><Field label="Mô tả"><Textarea className="min-h-40" value={String(values.description ?? '')} onChange={(e) => set('description', e.target.value)} /></Field></div></Card> : null}

    {kind === 'person' ? <Card><CardTitle>Thông tin nhân vật</CardTitle><div className="mt-4 grid gap-4 lg:grid-cols-2"><Field label="Overview"><Textarea value={String(values.overview ?? '')} onChange={(e) => set('overview', e.target.value)} /></Field><Field label="Quê quán"><Textarea value={String(values.hometown ?? '')} onChange={(e) => set('hometown', e.target.value)} /></Field><Field label="Thành tựu" hint="Mỗi dòng một ý"><Textarea value={lines('achievements')} onChange={(e) => set('achievements', e.target.value)} /></Field><Field label="Tóm tắt cuộc đời" hint="Mỗi dòng một ý"><Textarea value={lines('lifetime')} onChange={(e) => set('lifetime', e.target.value)} /></Field><Field label="Liên kết video"><Input value={String(values.videoLink ?? '')} onChange={(e) => set('videoLink', e.target.value)} /></Field><Field label="Mô tả video"><Textarea value={String(values.videoContent ?? '')} onChange={(e) => set('videoContent', e.target.value)} /></Field></div></Card> : null}

    {kind === 'event' ? <Card><CardTitle>Sự kiện tham gia</CardTitle><div className="mt-4 grid gap-4 lg:grid-cols-2"><Field label="Thời kỳ lịch sử"><select required className={selectClass} value={selectedPeriod} onChange={(e) => { setSelectedPeriod(e.target.value); setSelectedStage(''); set('eventRef', ''); }}><option value="">Chọn thời kỳ</option>{sourcePeriods.map((item) => <option key={item.slug} value={item.slug}>{item.title}</option>)}</select></Field><Field label="Giai đoạn lịch sử"><select required disabled={!selectedPeriod} className={selectClass} value={selectedStage} onChange={(e) => { setSelectedStage(e.target.value); set('eventRef', ''); }}><option value="">Chọn giai đoạn</option>{sourceStages.map((item) => <option key={item.slug} value={item.slug}>{item.title}</option>)}</select></Field><Field label="Sự kiện lịch sử gốc"><select required disabled={!selectedStage} className={selectClass} value={String(values.eventRef ?? '')} onChange={(e) => set('eventRef', e.target.value)}><option value="">Chọn sự kiện</option>{sourceEvents.map((item) => <option key={item.eventRef} value={item.eventRef}>{item.eventTitle}</option>)}</select></Field><Field label="Vai trò của nhân vật"><Textarea value={String(values.role ?? '')} onChange={(e) => set('role', e.target.value)} /></Field><Field label="Overview"><Textarea value={String(values.overview ?? '')} onChange={(e) => set('overview', e.target.value)} /></Field><Field label="Mô tả chi tiết"><Textarea value={String(values.description ?? '')} onChange={(e) => set('description', e.target.value)} /></Field></div></Card> : null}

    {error ? <p className="rounded-xl border border-flag/20 bg-flag/5 p-3 text-sm font-semibold text-flag">{error}</p> : null}
    <div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => router.push(returnTo)}>Hủy</Button><Button disabled={loading} type="submit">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Lưu dữ liệu</Button></div>
  </form>;
}
