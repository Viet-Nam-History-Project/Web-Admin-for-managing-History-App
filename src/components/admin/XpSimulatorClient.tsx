'use client';

import { useState } from 'react';
import {
  Calculator,
  CheckCircle2,
  Clock,
  Flame,
  HelpCircle,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function XpSimulatorClient() {
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [correctAnswers, setCorrectAnswers] = useState(9);
  const [timeTaken, setTimeTaken] = useState(24);
  const [currentStreak, setCurrentStreak] = useState(4);

  // Calculations
  const baseXP = Math.max(0, correctAnswers);
  const accuracy = totalQuestions > 0 ? correctAnswers / totalQuestions : 0;
  const accuracyBonus = accuracy >= 0.8 ? 20 : 0;
  const speedBonus = timeTaken < 30 && baseXP > 0 ? 10 : 0;
  const streakMultiplier = currentStreak >= 3 ? 1.5 : 1.0;

  const rawSubtotal = baseXP + accuracyBonus + speedBonus;
  const totalXP = Math.ceil(rawSubtotal * streakMultiplier);

  function applyPreset(preset: 'perfect' | 'normal' | 'speed') {
    if (preset === 'perfect') {
      setTotalQuestions(10);
      setCorrectAnswers(10);
      setTimeTaken(25);
      setCurrentStreak(5);
    } else if (preset === 'normal') {
      setTotalQuestions(10);
      setCorrectAnswers(6);
      setTimeTaken(45);
      setCurrentStreak(1);
    } else if (preset === 'speed') {
      setTotalQuestions(10);
      setCorrectAnswers(8);
      setTimeTaken(18);
      setCurrentStreak(3);
    }
  }

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-gradient-to-b from-stone-50/70 to-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/20 text-bronze ring-1 ring-gold/30">
            <Calculator className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-charcoal sm:text-xl">
              Công cụ mô phỏng tính điểm XP (Interactive Simulator)
            </h3>
            <p className="text-xs text-stone-500">
              Thử nghiệm các tình huống người chơi để kiểm chứng công thức phân bổ XP
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-stone-500">Kịch bản mẫu:</span>
          <Button
            variant="outline"
            className="h-8 px-2.5 text-xs"
            onClick={() => applyPreset('perfect')}
          >
            Xuất sắc + Chuỗi cao
          </Button>
          <Button
            variant="outline"
            className="h-8 px-2.5 text-xs"
            onClick={() => applyPreset('speed')}
          >
            Siêu tốc &lt; 20s
          </Button>
          <Button
            variant="outline"
            className="h-8 px-2.5 text-xs"
            onClick={() => applyPreset('normal')}
          >
            Bình thường
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-12">
        {/* Controls */}
        <div className="grid gap-5 lg:col-span-6">
          {/* Total Questions */}
          <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-bold text-charcoal">
                <HelpCircle className="h-4 w-4 text-bronze" />
                Tổng số câu hỏi:
              </label>
              <span className="font-mono text-base font-black text-charcoal">
                {totalQuestions} câu
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              value={totalQuestions}
              onChange={(e) => {
                const val = Number(e.target.value);
                setTotalQuestions(val);
                if (correctAnswers > val) setCorrectAnswers(val);
              }}
              className="mt-3 w-full accent-bronze"
            />
          </div>

          {/* Correct Answers */}
          <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-bold text-charcoal">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Số câu trả lời đúng:
              </label>
              <span className="font-mono text-base font-black text-emerald-700">
                {correctAnswers} / {totalQuestions} (
                {Math.round(accuracy * 100)}%)
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={totalQuestions}
              value={correctAnswers}
              onChange={(e) => setCorrectAnswers(Number(e.target.value))}
              className="mt-3 w-full accent-emerald-600"
            />
          </div>

          {/* Time Taken */}
          <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-bold text-charcoal">
                <Clock className="h-4 w-4 text-amber-600" />
                Thời gian làm bài:
              </label>
              <span className="font-mono text-base font-black text-charcoal">
                {timeTaken} giây
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={120}
              value={timeTaken}
              onChange={(e) => setTimeTaken(Number(e.target.value))}
              className="mt-3 w-full accent-amber-600"
            />
          </div>

          {/* Current Streak */}
          <div className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-bold text-charcoal">
                <Flame className="h-4 w-4 text-orange-500" />
                Chuỗi ngày học tập (Streak):
              </label>
              <span className="font-mono text-base font-black text-orange-600">
                {currentStreak} ngày
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              value={currentStreak}
              onChange={(e) => setCurrentStreak(Number(e.target.value))}
              className="mt-3 w-full accent-orange-500"
            />
          </div>
        </div>

        {/* Live Calculation Output */}
        <div className="flex flex-col justify-between rounded-2xl border-2 border-gold/60 bg-white p-6 shadow-museum lg:col-span-6">
          <div>
            <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Chi tiết từng khoản điểm
              </span>
              <span className="text-xs text-stone-400 font-medium">Phiên hiện tại</span>
            </div>

            <div className="mt-4 grid gap-3">
              {/* Base XP */}
              <div className="flex items-center justify-between rounded-xl bg-stone-50 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-stone-500" />
                  <span className="font-medium text-charcoal">Điểm cơ bản (số câu đúng)</span>
                </div>
                <span className="font-mono font-black text-stone-800">
                  +{baseXP} XP
                </span>
              </div>

              {/* Accuracy Bonus */}
              <div
                className={`flex items-center justify-between rounded-xl p-3 text-sm transition ${
                  accuracyBonus > 0
                    ? 'border border-emerald-200 bg-emerald-50/70 font-semibold text-emerald-950'
                    : 'bg-stone-50 text-stone-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles
                    className={`h-4 w-4 ${
                      accuracyBonus > 0 ? 'text-emerald-600' : 'text-stone-400'
                    }`}
                  />
                  <span>Thưởng chính xác (&ge; 80%)</span>
                </div>
                <span className="font-mono font-black">
                  {accuracyBonus > 0 ? `+${accuracyBonus} XP` : '0 XP'}
                </span>
              </div>

              {/* Speed Bonus */}
              <div
                className={`flex items-center justify-between rounded-xl p-3 text-sm transition ${
                  speedBonus > 0
                    ? 'border border-amber-200 bg-amber-50/70 font-semibold text-amber-950'
                    : 'bg-stone-50 text-stone-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Zap
                    className={`h-4 w-4 ${
                      speedBonus > 0 ? 'text-amber-500' : 'text-stone-400'
                    }`}
                  />
                  <span>Thưởng tốc độ (&lt; 30 giây)</span>
                </div>
                <span className="font-mono font-black">
                  {speedBonus > 0 ? `+${speedBonus} XP` : '0 XP'}
                </span>
              </div>

              {/* Subtotal */}
              <div className="flex items-center justify-between px-3 text-xs text-stone-500">
                <span>Tổng điểm trước khi nhân chuỗi:</span>
                <span className="font-mono font-bold">
                  {baseXP} + {accuracyBonus} + {speedBonus} = {rawSubtotal} XP
                </span>
              </div>

              {/* Streak Multiplier */}
              <div
                className={`flex items-center justify-between rounded-xl p-3 text-sm transition ${
                  streakMultiplier > 1
                    ? 'border border-orange-200 bg-orange-50/80 font-semibold text-orange-950'
                    : 'bg-stone-50 text-stone-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Flame
                    className={`h-4 w-4 ${
                      streakMultiplier > 1
                        ? 'fill-orange-500 text-orange-500'
                        : 'text-stone-400'
                    }`}
                  />
                  <span>Hệ số nhân chuỗi ngày (&ge; 3 ngày)</span>
                </div>
                <span className="font-mono font-black text-orange-600">
                  &times; {streakMultiplier} lần
                </span>
              </div>
            </div>
          </div>

          {/* Grand Total Card */}
          <div className="mt-6 rounded-2xl bg-gradient-to-r from-bronze to-amber-700 p-5 text-white shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-200">
                  Tổng XP người chơi nhận được
                </p>
                <p className="text-xs text-white/80 mt-0.5">
                  {rawSubtotal} XP &times; {streakMultiplier} {streakMultiplier > 1 ? '(nhân chuỗi)' : ''}
                </p>
              </div>

              <div className="flex items-baseline gap-1 font-mono text-3xl font-black sm:text-4xl text-white">
                {totalXP}
                <span className="text-base font-bold text-amber-200">XP</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
