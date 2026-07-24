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
    facet_coverage?: Record<string, string[]>;
    answer_structure?: string;
    comparison_intent?: string;
    comparison_domain?: string;
    comparison_subjects?: string[];
    comparison_object_types?: string[];
    explicit_facets?: string[];
    comparison_evidence?: Record<string, Record<string, string[]>>;
    balanced_facets?: string[];
    missing_comparison_cells?: string[];
    answer_requirements?: Record<string, boolean>;
    evolution_intent?: string;
    evolution_domain?: string;
    evolution_subject_type?: string;
    evolution_periods?: number[][];
    evolution_period_labels?: string[];
    evolution_boundary_causes?: string[];
    evolution_subject_lifetime?: number[];
    evolution_range_mismatch?: boolean;
    evolution_range_resolution?: string;
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
    {retrieval ? <><div className="mt-5 grid gap-3 rounded-lg border border-[var(--border)] bg-black/[0.025] p-4 sm:grid-cols-4"><Diagnostic label="Chiến lược" value={retrieval.strategy} /><Diagnostic label="Ý định" value={retrieval.intent || '—'} /><Diagnostic label="Ứng viên" value={`${retrieval.candidate_count} → ${retrieval.selected_count}`} /><Diagnostic label="Phạm vi" value={[retrieval.scope, retrieval.date_range].filter(Boolean).join(' · ') || '—'} />{retrieval.comparison_intent ? <Diagnostic label="Dạng so sánh" value={comparisonIntentLabel(retrieval.comparison_intent)} /> : null}{retrieval.comparison_domain ? <Diagnostic label="Miền đối tượng" value={comparisonDomainLabel(retrieval.comparison_domain)} /> : null}{retrieval.evolution_intent ? <Diagnostic label="Dạng F9" value={evolutionIntentLabel(retrieval.evolution_intent)} /> : null}{retrieval.evolution_domain ? <Diagnostic label="Miền tiến trình" value={comparisonDomainLabel(retrieval.evolution_domain)} /> : null}{retrieval.answer_structure ? <Diagnostic label="Bố cục" value={retrieval.answer_structure} /> : null}</div>{retrieval.required_facets?.length ? <div className="mt-3 rounded-lg border border-[var(--border)] bg-black/[0.025] p-4"><p className="text-xs font-black uppercase tracking-wider text-stone-500">Độ bao phủ nội dung</p>{retrieval.evolution_periods?.length ? <div className="mt-3"><p className="text-xs font-bold text-stone-600">Các chặng F9 cần cân bằng bằng chứng</p><div className="mt-2 flex flex-wrap gap-2">{retrieval.evolution_periods.map(([start, end]) => <Badge key={`${start}-${end}`} tone="gold">{start}–{end}</Badge>)}</div></div> : null}{retrieval.explicit_facets?.length ? <div className="mt-3"><p className="text-xs font-bold text-stone-600">Người dùng yêu cầu trực tiếp</p><div className="mt-2 flex flex-wrap gap-2">{retrieval.explicit_facets.map((facet) => <Badge key={facet} tone="gold">{facetLabel(facet)}</Badge>)}</div></div> : null}<div className="mt-3 flex flex-wrap gap-2">{retrieval.required_facets.map((facet) => <Badge key={facet} tone={retrieval.missing_facets?.includes(facet) ? 'red' : retrieval.balanced_facets?.includes(facet) ? 'green' : 'neutral'}>{facetLabel(facet)}</Badge>)}</div>{retrieval.missing_facets?.length ? <p className="mt-3 text-xs font-semibold text-flag">Còn thiếu bằng chứng: {retrieval.missing_facets.map(facetLabel).join(', ')}.</p> : null}{retrieval.comparison_evidence && Object.keys(retrieval.comparison_evidence).length ? <details className="mt-4 rounded-lg border border-[var(--border)] bg-white/45 p-3"><summary className="cursor-pointer text-xs font-black uppercase tracking-wider text-stone-600">Ma trận bằng chứng đối tượng × tiêu chí</summary><div className="mt-3 grid gap-2">{Object.entries(retrieval.comparison_evidence).map(([facet, subjects]) => <div key={facet} className="rounded-md border border-[var(--border)] bg-white/60 p-2"><p className="text-xs font-bold text-charcoal">{facetLabel(facet)}</p><div className="mt-1 flex flex-wrap gap-2">{Object.entries(subjects).map(([subject, ids]) => <Badge key={`${facet}-${subject}`} tone={ids.length ? 'green' : 'red'}>{subject}: {ids.length} đoạn</Badge>)}</div></div>)}</div></details> : null}</div> : null}</> : null}
    {retrieval?.evolution_period_labels?.length ? <EvolutionPeriodDiagnostics retrieval={retrieval} /> : null}
    <div className="mt-6 border-t border-[var(--border)] pt-5"><p className="text-xs font-black uppercase tracking-wider text-stone-500">Nguồn truy xuất</p><div className="mt-3 grid gap-3">{result.citations.map((citation, index) => <div key={`${citation.source_id}-${citation.chunk_id ?? index}`} className="rounded-lg border border-[var(--border)] bg-white/55 p-3"><div className="flex items-center justify-between gap-3"><p className="font-bold text-charcoal">[{index + 1}] {citation.source_title}</p><Badge tone="neutral">Trang {citation.page_start ?? '—'}{citation.page_end && citation.page_end !== citation.page_start ? `-${citation.page_end}` : ''} · {Math.round(citation.score * 100)}%</Badge></div>{citation.facets?.length ? <div className="mt-2 flex flex-wrap gap-1">{citation.facets.map((facet) => <Badge key={facet} tone="gold">{facet}</Badge>)}</div> : null}<p className="mt-2 text-xs leading-5 text-stone-600">{citation.excerpt}</p></div>)}</div></div>
  </div>;
}

function EvolutionPeriodDiagnostics({
  retrieval,
}: {
  retrieval: NonNullable<EvaluationResult['retrieval']>;
}) {
  return <details className="mt-4 rounded-lg border border-[var(--border)] bg-white/45 p-4">
    <summary className="cursor-pointer text-xs font-black uppercase tracking-wider text-stone-600">
      Period plan động F9
    </summary>
    <div className="mt-3 grid gap-2">
      {(retrieval.evolution_periods ?? []).map(([start, end], index) => <div key={`${start}-${end}-${index}`} className="rounded-md border border-[var(--border)] bg-white/65 p-3">
        <p className="text-sm font-bold text-charcoal">{start}–{end}: {retrieval.evolution_period_labels?.[index] ?? 'Chưa đặt tên'}</p>
        {retrieval.evolution_boundary_causes?.[index] ? <p className="mt-1 text-xs leading-5 text-stone-600">Bước ngoặt: {retrieval.evolution_boundary_causes[index]}</p> : null}
      </div>)}
    </div>
    {retrieval.evolution_subject_lifetime?.length === 2 ? <p className="mt-3 text-xs font-semibold text-stone-600">Vòng đời đối tượng: {retrieval.evolution_subject_lifetime[0]}–{retrieval.evolution_subject_lifetime[1]}</p> : null}
    {retrieval.evolution_range_mismatch ? <p className="mt-2 text-xs font-semibold text-amber-800">Khoảng hỏi vượt vòng đời đối tượng: {retrieval.evolution_range_resolution || 'giải thích quá trình kế tiếp'}.</p> : null}
  </details>;
}

function Diagnostic({ label, value }: { label: string; value: string }) { return <div><p className="text-[11px] font-black uppercase text-stone-500">{label}</p><p className="mt-1 text-sm font-bold text-charcoal">{value}</p></div>; }
function verdictLabel(value?: EvaluationResult['verdict']) { return value === 'pass' ? 'Đạt' : value === 'partial' ? 'Cần sửa nhỏ' : value === 'fail' ? 'Không đạt' : 'Chờ review'; }
function facetLabel(value: string) { return ({ political_administrative: 'Chính trị & hành chính', economic_taxation: 'Kinh tế & thuế khóa', culture_education: 'Văn hóa & giáo dục', social_transformation: 'Xã hội', objectives_consequences: 'Mục đích & hậu quả', historical_evolution: 'Thay đổi theo thời gian', governance_methods: 'Đàn áp, kiểm soát & nhượng bộ', wartime_mobilization: 'Huy động thời chiến', comparison_context: 'Thời gian & bối cảnh', organizer: 'Người tổ chức', scale_investment: 'Quy mô & vốn đầu tư', agriculture: 'Nông nghiệp', industry: 'Công nghiệp', commerce: 'Thương nghiệp', transport: 'Giao thông', progress: 'Diễn biến', forces: 'Lực lượng', leadership: 'Lãnh đạo', result: 'Kết quả', significance: 'Ý nghĩa', cause: 'Nguyên nhân', geographic_scope: 'Phạm vi & địa bàn', strategy_methods: 'Âm mưu & biện pháp', scale_intensity: 'Quy mô & mức độ', representative_events: 'Sự kiện tiêu biểu', participants: 'Các bên tham gia', agreement_content: 'Nội dung điều khoản', implementation_mechanism: 'Cơ chế thực hiện', limitations: 'Hạn chế', role_contribution: 'Vai trò & đóng góp', ideology_goals: 'Tư tưởng & con đường', organization_structure: 'Cơ cấu tổ chức', source_perspective: 'Quan điểm nguồn', continuity_change: 'Tiếp nối & thay đổi', resources_logistics: 'Nguồn lực & hậu cần' } as Record<string, string>)[value] ?? value; }
function comparisonIntentLabel(value: string) { return ({ similarities_differences: 'Giống và khác', main_similarity: 'Điểm giống chủ yếu', main_difference: 'Khác biệt chính', extent_comparison: 'So sánh mức độ', cause_comparison: 'So sánh nguyên nhân', consequence_comparison: 'So sánh kết quả/tác động', effectiveness_comparison: 'Đánh giá hiệu quả', significance_comparison: 'So sánh ý nghĩa', continuity_change: 'Tiếp nối và thay đổi', role_comparison: 'So sánh vai trò', interpretation_comparison: 'So sánh quan điểm nguồn', judgement: 'Đưa ra nhận định', focused_facets: 'Tiêu chí được chỉ định' } as Record<string, string>)[value] ?? value; }
function comparisonDomainLabel(value: string) { return ({ economic_policy: 'Chính sách kinh tế', military_strategy: 'Chiến lược quân sự', military_campaign: 'Chiến dịch/trận đánh', diplomatic_agreement: 'Ngoại giao/hiệp định', historical_person: 'Nhân vật lịch sử', movement_revolution: 'Phong trào/cách mạng', political_administration: 'Chính trị/hành chính', state_dynasty: 'Nhà nước/triều đại', multi_domain: 'Tiến trình đa lĩnh vực', source_interpretation: 'Tư liệu/quan điểm', historical_event: 'Sự kiện lịch sử' } as Record<string, string>)[value] ?? value; }
function evolutionIntentLabel(value: string) { return ({ evolution_over_time: 'Phát triển theo thời gian', continuity_and_change: 'Tiếp nối và thay đổi', turning_points: 'Các bước ngoặt', extent_of_change: 'Mức độ thay đổi', cause_of_change: 'Nguyên nhân thay đổi', before_after: 'Trước và sau mốc', short_long_term: 'Ngắn hạn và dài hạn', acceleration_slowdown: 'Tốc độ thay đổi', reversal: 'Đảo chiều', inheritance_development: 'Kế thừa và phát triển', periodization: 'Phân kỳ', decisive_change: 'Thay đổi quyết định' } as Record<string, string>)[value] ?? value; }
