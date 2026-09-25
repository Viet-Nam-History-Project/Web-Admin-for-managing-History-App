'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Award,
  Crown,
  ExternalLink,
  Flame,
  Gamepad2,
  Medal,
  Search,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Form';
import { EmptyState } from '@/components/ui/State';

export interface LeaderboardUser {
  uid: string;
  displayName: string;
  email: string;
  username: string;
  avatar: string;
  totalXP: number;
  currentRank: string;
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  highestScore: number;
  lastPlayedDate: string;
  accountStatus: string;
}

const ranks = ['All', 'Legend', 'Platinum', 'Gold', 'Silver', 'Bronze', 'Newcomer'];

function rankBadgeTone(rank: string): 'gold' | 'dark' | 'neutral' | 'green' {
  switch (rank) {
    case 'Legend':
      return 'gold';
    case 'Platinum':
      return 'dark';
    case 'Gold':
      return 'gold';
    case 'Silver':
      return 'neutral';
    case 'Bronze':
      return 'gold';
    default:
      return 'neutral';
  }
}

export function LeaderboardTableClient({
  users,
}: {
  users: LeaderboardUser[];
}) {
  const [search, setSearch] = useState('');
  const [selectedRank, setSelectedRank] = useState('All');
  const [sortBy, setSortBy] = useState<'totalXP' | 'currentStreak' | 'totalSessions' | 'highestScore'>('totalXP');

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let list = [...users];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (u) =>
          u.displayName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q),
      );
    }

    if (selectedRank !== 'All') {
      list = list.filter((u) => u.currentRank === selectedRank);
    }

    list.sort((a, b) => b[sortBy] - a[sortBy]);

    return list;
  }, [users, search, selectedRank, sortBy]);

  const top1 = users[0];
  const top2 = users[1];
  const top3 = users[2];

  return (
    <div className="grid gap-8">
      {/* Top 3 Podium (shown only when viewing initial rankings) */}
      {!search.trim() && selectedRank === 'All' && sortBy === 'totalXP' && users.length >= 3 && (
        <div className="rounded-3xl border border-[var(--border)] bg-gradient-to-b from-amber-50/60 via-white to-amber-50/20 p-6 shadow-sm">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-gold/20 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-bronze ring-1 ring-gold/30">
              <Trophy className="h-3.5 w-3.5 text-gold" />
              Bục vinh danh cao thủ
            </div>
            <h3 className="mt-2 text-xl font-black text-charcoal sm:text-2xl">
              Top 3 người chơi xuất sắc nhất
            </h3>
          </div>

          <div className="grid items-end gap-4 sm:grid-cols-3">
            {/* 2nd Place */}
            {top2 && (
              <div className="order-2 sm:order-1 flex flex-col items-center rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm transition hover:shadow-md">
                <div className="relative mb-3">
                  <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-slate-300 bg-slate-100 shadow">
                    {top2.avatar ? (
                      <img src={top2.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full place-items-center font-black text-slate-600 text-xl">
                        {top2.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="absolute -bottom-2 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-400 font-mono text-xs font-black text-white shadow ring-2 ring-white">
                    #2
                  </span>
                </div>

                <Link
                  href={`/users/${top2.uid}`}
                  className="max-w-[180px] truncate font-bold text-charcoal hover:text-bronze text-center"
                >
                  {top2.displayName}
                </Link>
                <div className="mt-1">
                  <Badge tone={rankBadgeTone(top2.currentRank)}>{top2.currentRank}</Badge>
                </div>

                <div className="mt-3 flex items-center gap-1.5 font-mono text-base font-black text-slate-700">
                  <Sparkles className="h-4 w-4 text-slate-400" />
                  {top2.totalXP.toLocaleString('vi-VN')} XP
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-stone-500">
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  {top2.currentStreak} ngày streak
                </div>
              </div>
            )}

            {/* 1st Place */}
            {top1 && (
              <div className="order-1 sm:order-2 flex flex-col items-center rounded-2xl border-2 border-gold/70 bg-gradient-to-b from-amber-100/50 to-white p-6 shadow-museum transition hover:shadow-lg sm:-translate-y-2">
                <div className="relative mb-3">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                    <Crown className="h-7 w-7 fill-amber-400 text-amber-500 animate-bounce" />
                  </div>
                  <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-gold bg-amber-50 shadow-md">
                    {top1.avatar ? (
                      <img src={top1.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full place-items-center font-black text-bronze text-2xl">
                        {top1.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="absolute -bottom-2 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-gold font-mono text-sm font-black text-white shadow ring-2 ring-white">
                    #1
                  </span>
                </div>

                <Link
                  href={`/users/${top1.uid}`}
                  className="max-w-[200px] truncate text-lg font-black text-charcoal hover:text-bronze text-center"
                >
                  {top1.displayName}
                </Link>
                <div className="mt-1">
                  <Badge tone="gold">{top1.currentRank}</Badge>
                </div>

                <div className="mt-3 flex items-center gap-1.5 font-mono text-lg font-black text-bronze">
                  <Sparkles className="h-5 w-5 text-gold" />
                  {top1.totalXP.toLocaleString('vi-VN')} XP
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-orange-600">
                  <Flame className="h-4 w-4 fill-orange-500 text-orange-500" />
                  {top1.currentStreak} ngày streak liên tục
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {top3 && (
              <div className="order-3 flex flex-col items-center rounded-2xl border border-amber-200 bg-white/90 p-5 shadow-sm transition hover:shadow-md">
                <div className="relative mb-3">
                  <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-amber-600/40 bg-amber-50 shadow">
                    {top3.avatar ? (
                      <img src={top3.avatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full place-items-center font-black text-amber-800 text-xl">
                        {top3.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="absolute -bottom-2 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-700 font-mono text-xs font-black text-white shadow ring-2 ring-white">
                    #3
                  </span>
                </div>

                <Link
                  href={`/users/${top3.uid}`}
                  className="max-w-[180px] truncate font-bold text-charcoal hover:text-bronze text-center"
                >
                  {top3.displayName}
                </Link>
                <div className="mt-1">
                  <Badge tone={rankBadgeTone(top3.currentRank)}>{top3.currentRank}</Badge>
                </div>

                <div className="mt-3 flex items-center gap-1.5 font-mono text-base font-black text-amber-900">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  {top3.totalXP.toLocaleString('vi-VN')} XP
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-stone-500">
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  {top3.currentStreak} ngày streak
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white/80 p-4 shadow-sm">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm người chơi theo tên hoặc email..."
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-500">Hạng:</span>
            <select
              value={selectedRank}
              onChange={(e) => setSelectedRank(e.target.value)}
              className="h-10 rounded-xl border border-[var(--border)] bg-white px-3 text-xs font-medium text-stone-700 shadow-sm focus:border-bronze focus:outline-none"
            >
              {ranks.map((r) => (
                <option key={r} value={r}>
                  {r === 'All' ? 'Tất cả hạng' : r}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-stone-500">Sắp xếp:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="h-10 rounded-xl border border-[var(--border)] bg-white px-3 text-xs font-medium text-stone-700 shadow-sm focus:border-bronze focus:outline-none"
            >
              <option value="totalXP">Điểm kinh nghiệm (XP)</option>
              <option value="currentStreak">Chuỗi ngày (Streak)</option>
              <option value="totalSessions">Số phiên chơi</option>
              <option value="highestScore">Điểm cao nhất</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      {filteredUsers.length === 0 ? (
        <EmptyState
          title="Không tìm thấy người chơi"
          description="Thử thay đổi từ khóa tìm kiếm hoặc điều kiện lọc hạng."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-white shadow-museum">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50/75 text-xs font-bold uppercase tracking-wider text-stone-500">
              <tr>
                <th className="py-3.5 pl-6 pr-3">Hạng</th>
                <th className="py-3.5 px-3">Người chơi</th>
                <th className="py-3.5 px-3">Cấp bậc</th>
                <th className="py-3.5 px-3 text-right">Tổng XP</th>
                <th className="py-3.5 px-3 text-center">Streak</th>
                <th className="py-3.5 px-3 text-center">Phiên chơi</th>
                <th className="py-3.5 px-3 text-right">Điểm cao nhất</th>
                <th className="py-3.5 pl-3 pr-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredUsers.map((user, idx) => {
                const rankNum = idx + 1;
                return (
                  <tr
                    key={user.uid}
                    className="transition hover:bg-stone-50/60"
                  >
                    <td className="py-4 pl-6 pr-3">
                      {rankNum === 1 ? (
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400 font-mono text-sm font-black text-white shadow-sm ring-2 ring-amber-300">
                          1
                        </span>
                      ) : rankNum === 2 ? (
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-400 font-mono text-sm font-black text-white shadow-sm ring-2 ring-slate-300">
                          2
                        </span>
                      ) : rankNum === 3 ? (
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-700 font-mono text-sm font-black text-white shadow-sm ring-2 ring-amber-600">
                          3
                        </span>
                      ) : (
                        <span className="font-mono text-sm font-bold text-stone-500 pl-2">
                          #{rankNum}
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gold/20">
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="grid h-full place-items-center font-black text-bronze">
                              {user.displayName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/users/${user.uid}`}
                            className="truncate font-bold text-charcoal hover:text-bronze block"
                          >
                            {user.displayName}
                          </Link>
                          <p className="truncate text-xs text-stone-500">
                            {user.email || user.username || user.uid}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-3">
                      <Badge tone={rankBadgeTone(user.currentRank)}>
                        {user.currentRank}
                      </Badge>
                    </td>

                    <td className="py-4 px-3 text-right">
                      <span className="font-mono font-black text-bronze">
                        {user.totalXP.toLocaleString('vi-VN')}
                      </span>
                    </td>

                    <td className="py-4 px-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-0.5 font-mono text-xs font-bold text-orange-700 border border-orange-200/60">
                        <Flame className="h-3 w-3 text-orange-500" />
                        {user.currentStreak}
                      </span>
                    </td>

                    <td className="py-4 px-3 text-center font-mono text-stone-700">
                      {user.totalSessions}
                    </td>

                    <td className="py-4 px-3 text-right font-mono font-bold text-stone-700">
                      {user.highestScore.toLocaleString('vi-VN')}
                    </td>

                    <td className="py-4 pl-3 pr-6 text-right">
                      <Link href={`/users/${user.uid}`}>
                        <Button variant="outline" className="h-8 px-2.5 text-xs">
                          <ExternalLink className="h-3.5 w-3.5" /> Hồ sơ
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
