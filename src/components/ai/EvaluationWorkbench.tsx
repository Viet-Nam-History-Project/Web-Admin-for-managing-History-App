'use client';

import { FormEvent, useEffect, useState } from 'react';
import { BookOpen, CheckCircle2, FlaskConical, Loader2, Send, Trash2 } from 'lucide-react';
import { adminFetch } from '@/lib/api/adminClient';
import { AiMarkdownAnswer } from '@/components/ai/AiMarkdownAnswer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardTitle } from '@/components/ui/Card';

interface EvaluationResult {
  id?: string;
  question?: string;
  answer: string;
  confidence: number;
  verdict?: 'pass' | 'partial' | 'fail' | 'needs_review';
  reviewerNote?: string;
  createdAt?: string;
  retrieval?: {
    strategy: string;
    candidate_count: number;
    selected_count: number;
    intent: string;
    scope: string;
    date_range: string;
    query_terms: string[];
    original_question?: string;
    normalized_question?: string;
    query_corrections?: Array<{
      original: string;
      replacement: string;
      reason: string;
    }>;
    rewrite_confidence?: number;
    query_ambiguous?: boolean;
    ambiguity_notes?: string[];
    required_facets?: string[];
    covered_facets?: string[];
    missing_facets?: string[];
    semantic_requirements?: Record<string, {
      label?: string;
      answerType?: string;
      required?: boolean;
    }>;
    answer_structure?: string;
    requirement_statuses?: Record<string, string>;
    coverage_gate_outcome?: string;
    coverage_gate_limitations?: string[];
    claim_verification_status?: string;
    unsupported_high_risk_claims?: string[];
  };
  citations: Array<{ chunk_id?: string; source_id: string; source_title: string; page_start: number | null; page_end: number | null; excerpt: string; score: number; facets?: string[] }>;
}

export function EvaluationWorkbench() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [history, setHistory] = useState<EvaluationResult[]>([]);
  const [reviewerNote, setReviewerNote] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');

  async function loadHistory() {
    try {
      const items = (await adminFetch<{ items: EvaluationResult[] }>('/api/admin/ai/evaluations')).items;
      setHistory(items);
      const availableIds = new Set(items.flatMap((item) => item.id ? [item.id] : []));
      setSelectedIds((current) => new Set([...current].filter((id) => availableIds.has(id))));
    }
    catch { /* Kết quả kiểm thử chính vẫn có thể hoạt động. */ }
  }
  useEffect(() => { void loadHistory(); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!question.trim()) return;
    setLoading(true); setError(''); setResult(null); setReviewerNote('');
    try {
      setResult(await adminFetch<EvaluationResult>('/api/admin/ai/evaluations', { method: 'POST', body: JSON.stringify({ question }) }));
      await loadHistory();
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Kiểm thử thất bại.'); }
    finally { setLoading(false); }
  }

  async function review(id: string, verdict: 'pass' | 'partial' | 'fail') {
    setLoading(true); setError('');
    try {
      await adminFetch('/api/admin/ai/evaluations', { method: 'PATCH', body: JSON.stringify({ id, verdict, reviewerNote }) });
      await loadHistory();
    } catch (reviewError) { setError(reviewError instanceof Error ? reviewError.message : 'Lưu đánh giá thất bại.'); }
    finally { setLoading(false); }
  }

  function toggleSelection(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setDeleteMessage('');
  }

  function toggleAllHistory() {
    const ids = history.flatMap((item) => item.id ? [item.id] : []);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(ids));
    setDeleteMessage('');
  }

  async function deleteSelectedHistory() {
    const ids = [...selectedIds];
    if (!ids.length) return;
    if (!window.confirm(`Xóa vĩnh viễn ${ids.length} bản ghi đánh giá đã chọn? Thao tác này không thể hoàn tác.`)) return;

    setDeleting(true);
    setError('');
    setDeleteMessage('');
    try {
      const response = await adminFetch<{ deleted: number }>('/api/admin/ai/evaluations', {
        method: 'DELETE',
        body: JSON.stringify({ ids }),
      });
      setHistory((current) => current.filter((item) => !item.id || !selectedIds.has(item.id)));
      setSelectedIds(new Set());
      setDeleteMessage(`Đã xóa ${response.deleted} bản ghi đánh giá.`);
      await loadHistory();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Xóa lịch sử đánh giá thất bại.');
    } finally {
      setDeleting(false);
    }
  }

  const historyIds = history.flatMap((item) => item.id ? [item.id] : []);
  const allHistorySelected = historyIds.length > 0 && historyIds.every((id) => selectedIds.has(id));

  return <div>
    <div className="grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
      <Card className="self-start"><div className="flex items-center justify-between"><CardTitle>Tạo ca kiểm thử</CardTitle><FlaskConical className="h-6 w-6 text-bronze" /></div><form onSubmit={submit} className="mt-5 grid gap-4"><label className="grid gap-1"><span className="text-xs font-bold text-stone-600">Câu hỏi thực tế</span><textarea value={question} onChange={(event) => setQuestion(event.target.value)} required maxLength={1200} rows={9} className="rounded-lg border border-[var(--border)] bg-white p-3 text-sm leading-6 text-charcoal outline-none focus:border-bronze" placeholder="Ví dụ: Liệt kê và phân nhóm các nhân vật lãnh đạo giai đoạn 1954-1965." /></label><p className="text-xs leading-5 text-stone-500">AI tự nhận biết yêu cầu ngắn gọn, chi tiết, so sánh, danh sách hoặc kể chuyện từ chính câu hỏi.</p><Button type="submit" disabled={loading || !question.trim()}><Send className="h-4 w-4" /> {loading ? 'Đang truy xuất...' : 'Chạy đánh giá'}</Button>{error ? <p className="rounded-lg bg-flag/10 p-3 text-sm font-semibold text-flag">{error}</p> : null}</form></Card>
      <Card className="min-h-[520px]"><div className="flex items-center justify-between"><CardTitle>Kết quả & bằng chứng</CardTitle>{result ? <Badge tone={result.confidence >= 0.7 ? 'green' : 'gold'}>Tin cậy {Math.round(result.confidence * 100)}%</Badge> : null}</div>{!result ? <div className="flex min-h-96 flex-col items-center justify-center text-center"><BookOpen className="h-10 w-10 text-bronze" /><p className="mt-3 font-bold text-charcoal">Chưa có kết quả</p><p className="mt-1 text-sm text-stone-500">Câu trả lời, chẩn đoán truy xuất và nguồn PDF sẽ hiển thị tại đây.</p></div> : <ResultPanel result={result} />}</Card>
    </div>

    <Card className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>Lịch sử đánh giá</CardTitle>
          <p className="mt-1 text-xs text-stone-500">Chọn các bản ghi không còn cần thiết để xóa hàng loạt.</p>
        </div>
        {history.length ? <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-charcoal">
            <input
              type="checkbox"
              checked={allHistorySelected}
              onChange={toggleAllHistory}
              className="h-4 w-4 accent-[#B8860B]"
            />
            Chọn tất cả
          </label>
          <span className="text-sm text-stone-500">{selectedIds.size} đã chọn</span>
          <Button
            type="button"
            variant="danger"
            disabled={!selectedIds.size || deleting}
            onClick={() => void deleteSelectedHistory()}
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Xóa đã chọn
          </Button>
        </div> : null}
      </div>
      {deleteMessage ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{deleteMessage}</p> : null}
      <div className="mt-4 grid gap-3">
        {history.length ? history.map((item) => <div key={item.id} className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-white/55 p-4">
          <input
            type="checkbox"
            aria-label={`Chọn bản ghi ${item.question ?? ''}`}
            checked={Boolean(item.id && selectedIds.has(item.id))}
            disabled={!item.id || deleting}
            onChange={() => item.id && toggleSelection(item.id)}
            className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[#B8860B]"
          />
          <details className="min-w-0 flex-1">
            <summary className="cursor-pointer list-none"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black text-charcoal">{item.question}</p><p className="mt-1 text-xs text-stone-500">{item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : ''} · tin cậy {Math.round((item.confidence ?? 0) * 100)}%</p></div><Badge tone={item.verdict === 'pass' ? 'green' : item.verdict === 'fail' ? 'red' : 'gold'}>{verdictLabel(item.verdict)}</Badge></div></summary>
            <div className="mt-4 border-t border-[var(--border)] pt-4"><ResultPanel result={item} /><label className="mt-4 grid gap-1"><span className="text-xs font-bold text-stone-600">Ghi chú reviewer</span><textarea defaultValue={item.reviewerNote} onChange={(event) => setReviewerNote(event.target.value)} rows={3} className="rounded-lg border border-[var(--border)] bg-white p-3 text-sm" /></label><div className="mt-3 flex flex-wrap gap-2"><Button onClick={() => void review(item.id!, 'pass')}><CheckCircle2 className="h-4 w-4" /> Đạt</Button><Button variant="outline" onClick={() => void review(item.id!, 'partial')}>Cần sửa nhỏ</Button><Button variant="danger" onClick={() => void review(item.id!, 'fail')}>Không đạt</Button></div></div>
          </details>
        </div>) : <p className="text-sm text-stone-500">Chưa có ca kiểm thử được lưu.</p>}
      </div>
    </Card>
  </div>;
}

function ResultPanel({ result }: { result: EvaluationResult }) {
  const retrieval = result.retrieval;
  const corrections = retrieval?.query_corrections ?? [];
  const normalizedChanged = Boolean(
    retrieval?.normalized_question
    && retrieval.normalized_question !== retrieval.original_question,
  );

  return <div className="mt-5">
    {retrieval && (normalizedChanged || corrections.length || retrieval.query_ambiguous) ? <div className={`mb-5 rounded-lg border p-4 ${retrieval.query_ambiguous ? 'border-amber-300 bg-amber-50/70' : 'border-emerald-200 bg-emerald-50/60'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-wider text-stone-600">Câu AI đã hiểu</p>
        <Badge tone={retrieval.query_ambiguous ? 'gold' : 'green'}>
          {retrieval.query_ambiguous ? 'Cần làm rõ' : `Chuẩn hóa ${Math.round((retrieval.rewrite_confidence ?? 1) * 100)}%`}
        </Badge>
      </div>
      <p className="mt-2 font-bold leading-6 text-charcoal">{retrieval.normalized_question}</p>
      {corrections.length ? <div className="mt-3 flex flex-wrap gap-2">
        {corrections.map((correction, index) => <span key={`${correction.original}-${index}`} title={correction.reason} className="rounded-full border border-emerald-200 bg-white/70 px-3 py-1 text-xs text-stone-700">
          <span className="line-through opacity-60">{correction.original}</span> → <strong>{correction.replacement}</strong>
        </span>)}
      </div> : null}
      {retrieval.ambiguity_notes?.length ? <ul className="mt-3 list-disc pl-5 text-xs leading-5 text-amber-800">
        {retrieval.ambiguity_notes.map((note) => <li key={note}>{note}</li>)}
      </ul> : null}
    </div> : null}
    <div className="rounded-xl border border-[var(--border)] bg-white/45 p-5 shadow-sm sm:p-6">
      <AiMarkdownAnswer>{result.answer}</AiMarkdownAnswer>
    </div>
    {retrieval ? <>
      <div className="mt-5 grid gap-3 rounded-lg border border-[var(--border)] bg-black/[0.025] p-4 sm:grid-cols-5">
        <Diagnostic label="Pipeline" value="Planner → Evidence → Answer → Verify" />
        <Diagnostic label="Chế độ" value={modeLabel(retrieval.intent)} />
        <Diagnostic label="Ứng viên" value={`${retrieval.candidate_count} → ${retrieval.selected_count}`} />
        <Diagnostic label="Phạm vi" value={[retrieval.scope, retrieval.date_range].filter(Boolean).join(' · ') || '—'} />
        <Diagnostic label="Bố cục" value={retrieval.answer_structure || 'direct'} />
      </div>
      {retrieval.required_facets?.length ? <div className="mt-3 rounded-lg border border-[var(--border)] bg-black/[0.025] p-4">
        <p className="text-xs font-black uppercase tracking-wider text-stone-500">Độ bao phủ yêu cầu</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {retrieval.required_facets.map((requirementId) => {
            const supported = retrieval.requirement_statuses?.[requirementId] === 'supported';
            const label = retrieval.semantic_requirements?.[requirementId]?.label ?? requirementId;
            return <div key={requirementId} className="flex min-w-0 items-start justify-between gap-3 rounded-md border border-[var(--border)] bg-white/60 p-3">
              <p className="min-w-0 break-words text-sm font-semibold text-charcoal">{label}</p>
              <Badge tone={supported ? 'green' : 'red'}>{supported ? 'Đã có' : 'Còn thiếu'}</Badge>
            </div>;
          })}
        </div>
      </div> : null}
    </> : null}
    <div className="mt-6 border-t border-[var(--border)] pt-5">
      <p className="text-xs font-black uppercase tracking-wider text-stone-500">Nguồn truy xuất</p>
      <div className="mt-3 grid gap-3">
        {result.citations.length ? result.citations.map((citation, index) => <div key={`${citation.source_id}-${citation.chunk_id ?? index}`} className="rounded-lg border border-[var(--border)] bg-white/55 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold text-charcoal">[{index + 1}] {citation.source_title}</p>
            <Badge tone="neutral">Trang {citation.page_start ?? '—'}{citation.page_end && citation.page_end !== citation.page_start ? `-${citation.page_end}` : ''} · {Math.round(citation.score * 100)}%</Badge>
          </div>
          {citation.facets?.length ? <div className="mt-2 flex flex-wrap gap-1">{citation.facets.map((facet) => <Badge key={facet} tone="gold">{facet}</Badge>)}</div> : null}
          <p className="mt-2 text-xs leading-5 text-stone-600">{citation.excerpt}</p>
        </div>) : <p className="text-sm text-stone-500">Không có nguồn nào được chọn.</p>}
      </div>
    </div>
    {retrieval ? <ValidationPanel retrieval={retrieval} /> : null}
  </div>;
}

function ValidationPanel({
  retrieval,
}: {
  retrieval: NonNullable<EvaluationResult['retrieval']>;
}) {
  const warnings = [...new Set([
    ...(retrieval.coverage_gate_limitations ?? []),
    ...(retrieval.unsupported_high_risk_claims ?? []).map((claim) => `Claim chưa được giữ lại: ${claim}`),
  ].filter(Boolean))];
  const passed = warnings.length === 0
    && !['fail', 'blocked'].includes(retrieval.coverage_gate_outcome ?? '')
    && !['failed', 'insufficient'].includes(retrieval.claim_verification_status ?? '');

  return <div className="mt-6 border-t border-[var(--border)] pt-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs font-black uppercase tracking-wider text-stone-500">Validate</p>
      <Badge tone={passed ? 'green' : 'gold'}>{passed ? 'Đạt kiểm định' : 'Cần xem lại'}</Badge>
    </div>
    {warnings.length ? <ul className="mt-3 grid gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-sm leading-6 text-amber-950">
      {warnings.map((warning) => <li key={warning} className="flex gap-2"><span aria-hidden>•</span><span>{warning}</span></li>)}
    </ul> : <p className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 text-sm font-semibold text-emerald-800">
      <CheckCircle2 className="h-4 w-4" /> Các khẳng định được giữ lại đã qua kiểm tra với nguồn truy xuất.
    </p>}
  </div>;
}

function Diagnostic({ label, value }: { label: string; value: string }) { return <div className="min-w-0"><p className="text-[11px] font-black uppercase text-stone-500">{label}</p><p className="mt-1 break-words text-sm font-bold text-charcoal [overflow-wrap:anywhere]">{value}</p></div>; }
function verdictLabel(value?: EvaluationResult['verdict']) { return value === 'pass' ? 'Đạt' : value === 'partial' ? 'Cần sửa nhỏ' : value === 'fail' ? 'Không đạt' : 'Chờ review'; }
function modeLabel(value: string) { return ({ direct_fact: 'Tra cứu trực tiếp', explanatory_rag: 'Giải thích', comparison: 'So sánh', timeline_evolution: 'Tiến trình', graph_multihop: 'Liên kết đa bước', reliability_and_conversation: 'Hội thoại/làm rõ' } as Record<string, string>)[value] ?? value; }
