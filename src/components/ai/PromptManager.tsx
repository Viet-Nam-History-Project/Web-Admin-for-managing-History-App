'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { CheckCircle2, GitBranch, Save, Trash2 } from 'lucide-react';
import { adminFetch } from '@/lib/api/adminClient';
import {
  normalizePromptLayers,
  type PromptLayers,
} from '@/lib/ai/promptDefaults';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';

interface PromptVersion {
  id: string;
  name: string;
  note: string;
  systemPrompt: string;
  queryNormalizationInstruction?: string;
  answerPlanningInstruction?: string;
  presentationInstruction?: string;
  outputContract?: string;
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
  createdByEmail: string;
}

export function PromptManager() {
  const [items, setItems] = useState<PromptVersion[]>([]);
  const [name, setName] = useState('Prompt trợ lý lịch sử');
  const [note, setNote] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [queryNormalizationInstruction, setQueryNormalizationInstruction] = useState('');
  const [answerPlanningInstruction, setAnswerPlanningInstruction] = useState('');
  const [presentationInstruction, setPresentationInstruction] = useState('');
  const [outputContract, setOutputContract] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [promptLoaded, setPromptLoaded] = useState(false);
  const initializedFromRuntime = useRef(false);

  async function load() {
    try {
      const versions = await adminFetch<{
        activePrompt: PromptLayers;
        items: PromptVersion[];
      }>('/api/admin/ai/prompts');
      setItems(versions.items);
      if (!initializedFromRuntime.current) {
        const layers = normalizePromptLayers(versions.activePrompt as unknown as Record<string, unknown>);
        setSystemPrompt(layers.systemPrompt);
        setQueryNormalizationInstruction(layers.queryNormalizationInstruction);
        setAnswerPlanningInstruction(layers.answerPlanningInstruction);
        setPresentationInstruction(layers.presentationInstruction);
        setOutputContract(layers.outputContract);
        initializedFromRuntime.current = true;
        setPromptLoaded(true);
      }
    }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Không thể tải prompt.'); }
  }
  useEffect(() => { void load(); }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setPending(true); setError(''); setMessage('');
    try {
      await adminFetch('/api/admin/ai/prompts', {
        method: 'POST',
        body: JSON.stringify({
          name,
          note,
          systemPrompt,
          queryNormalizationInstruction,
          answerPlanningInstruction,
          presentationInstruction,
          outputContract,
        }),
      });
      setMessage('Đã lưu bản nháp. Hãy kiểm thử trước khi kích hoạt.');
      await load();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Lưu thất bại.'); }
    finally { setPending(false); }
  }

  async function activate(item: PromptVersion) {
    if (!window.confirm(`Kích hoạt phiên bản “${item.name}” cho app người dùng?`)) return;
    setPending(true); setError(''); setMessage('');
    try {
      await adminFetch(`/api/admin/ai/prompts/${item.id}/activate`, { method: 'POST' });
      setMessage('Prompt mới đã có hiệu lực cho các câu hỏi tiếp theo.');
      initializedFromRuntime.current = false;
      setPromptLoaded(false);
      await load();
    } catch (activateError) { setError(activateError instanceof Error ? activateError.message : 'Kích hoạt thất bại.'); }
    finally { setPending(false); }
  }

  async function remove(item: PromptVersion) {
    if (item.status === 'active') return;
    if (!window.confirm(`Xóa vĩnh viễn phiên bản “${item.name}”? Thao tác này không thể hoàn tác.`)) return;
    setPending(true); setError(''); setMessage('');
    try {
      await adminFetch(`/api/admin/ai/prompts/${item.id}`, { method: 'DELETE' });
      setMessage('Đã xóa phiên bản prompt.');
      await load();
    } catch (removeError) { setError(removeError instanceof Error ? removeError.message : 'Xóa thất bại.'); }
    finally { setPending(false); }
  }

  function clone(item: PromptVersion) {
    const layers = normalizePromptLayers(item as unknown as Record<string, unknown>);
    setName(`${item.name} - bản sao`);
    setNote(item.note);
    setSystemPrompt(layers.systemPrompt);
    setQueryNormalizationInstruction(layers.queryNormalizationInstruction);
    setAnswerPlanningInstruction(layers.answerPlanningInstruction);
    setPresentationInstruction(layers.presentationInstruction);
    setOutputContract(layers.outputContract);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const totalCharacters = systemPrompt.length
    + queryNormalizationInstruction.length
    + answerPlanningInstruction.length
    + presentationInstruction.length
    + outputContract.length;

  return <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
    <Card><div className="flex items-center justify-between"><CardTitle>Soạn phiên bản mới</CardTitle><GitBranch className="h-6 w-6 text-bronze" /></div>
      <form onSubmit={save} className="mt-5 grid gap-4">
        <label className="grid gap-1"><span className={labelClass}>Tên phiên bản</span><input value={name} onChange={(event) => setName(event.target.value)} required className={inputClass} /></label>
        <label className="grid gap-1"><span className={labelClass}>Ghi chú thay đổi</span><input value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} placeholder="Ví dụ: Cải thiện câu hỏi danh sách nhân vật" /></label>
        <PromptField
          label="1. System prompt"
          description="Vai trò, phạm vi kiến thức và các nguyên tắc nội dung cốt lõi của trợ lý."
          value={systemPrompt}
          onChange={setSystemPrompt}
          rows={12}
        />
        <PromptField
          label="2. Chuẩn hóa câu hỏi"
          description="Cách RAG sửa lỗi gõ, từ lặp, viết tắt và bảo vệ tên riêng, mốc thời gian."
          value={queryNormalizationInstruction}
          onChange={setQueryNormalizationInstruction}
          rows={9}
        />
        <PromptField
          label="3. Lập kế hoạch câu trả lời"
          description="Yêu cầu RAG bao phủ facet, chọn minh họa và trình bày kiến thức tự nhiên."
          value={answerPlanningInstruction}
          onChange={setAnswerPlanningInstruction}
          rows={15}
        />
        <PromptField
          label="4. Quy tắc trình bày"
          description="Cách AI tự hiểu yêu cầu ngắn gọn, chi tiết, kể chuyện và định dạng Markdown."
          value={presentationInstruction}
          onChange={setPresentationInstruction}
          rows={9}
        />
        <PromptField
          label="5. Hợp đồng đầu ra"
          description="Các quy tắc chung về cấu trúc câu trả lời và cách hiển thị nguồn tham khảo."
          value={outputContract}
          onChange={setOutputContract}
          rows={8}
        />
        <div className="flex items-center justify-between gap-4"><p className="text-xs text-stone-500">{totalCharacters.toLocaleString('vi-VN')} ký tự trong 5 lớp · nội dung được đọc trực tiếp từ prompt đang chạy · lưu nháp chưa làm thay đổi AI.</p><Button disabled={pending || !promptLoaded}><Save className="h-4 w-4" /> Lưu bản nháp</Button></div>
        {message ? <p className="rounded-lg bg-emerald-600/10 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}{error ? <p className="rounded-lg bg-flag/10 p-3 text-sm font-semibold text-flag">{error}</p> : null}
      </form>
    </Card>
    <Card className="self-start"><CardTitle>Lịch sử phiên bản</CardTitle><div className="mt-4 grid gap-3">{items.length ? items.map((item) => <div key={item.id} className="rounded-lg border border-[var(--border)] bg-white/55 p-4">
      <div className="flex items-start justify-between gap-3"><div><p className="font-black text-charcoal">{item.name}</p><p className="mt-1 text-xs text-stone-500">{item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : 'Vừa tạo'} · {item.createdByEmail}</p></div><Badge tone={item.status === 'active' ? 'green' : item.status === 'draft' ? 'gold' : 'neutral'}>{item.status === 'active' ? 'Đang dùng' : item.status === 'draft' ? 'Bản nháp' : 'Đã lưu trữ'}</Badge></div>
      {item.note ? <p className="mt-3 text-sm text-stone-600">{item.note}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" onClick={() => clone(item)}>Nhân bản</Button>{item.status !== 'active' ? <Button onClick={() => void activate(item)} disabled={pending}><CheckCircle2 className="h-4 w-4" /> Kích hoạt</Button> : null}<Button variant="danger" onClick={() => void remove(item)} disabled={pending || item.status === 'active'} title={item.status === 'active' ? 'Kích hoạt phiên bản khác trước khi xóa.' : 'Xóa vĩnh viễn phiên bản'}><Trash2 className="h-4 w-4" /> Xóa</Button></div>
    </div>) : <p className="text-sm text-stone-500">Chưa có phiên bản. Hãy lưu prompt khởi đầu ở bên trái.</p>}</div></Card>
  </div>;
}

const labelClass = 'text-xs font-bold text-stone-600';
const inputClass = 'h-11 rounded-lg border border-[var(--border)] bg-white px-3 text-sm text-charcoal outline-none focus:border-bronze';

function PromptField({
  label,
  description,
  value,
  onChange,
  rows,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return <label className="grid gap-1">
    <span className={labelClass}>{label}</span>
    <span className="mb-1 text-xs leading-5 text-stone-500">{description}</span>
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      required
      rows={rows}
      className="rounded-lg border border-[var(--border)] bg-white p-3 font-mono text-sm leading-6 text-charcoal outline-none focus:border-bronze"
    />
  </label>;
}
