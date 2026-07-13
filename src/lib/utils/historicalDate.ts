export function extractYear(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const match = value.match(/-?\d{1,4}/);
    return match ? Number(match[0]) : null;
  }
  if (value instanceof Date) return value.getFullYear();
  if (typeof value === 'object') {
    const maybe = value as { seconds?: number; toDate?: () => Date };
    if (typeof maybe.toDate === 'function') return maybe.toDate().getFullYear();
    if (typeof maybe.seconds === 'number') return new Date(maybe.seconds * 1000).getFullYear();
  }
  return null;
}

export function formatHistoricalYear(year: number | null) {
  if (year === null || Number.isNaN(year)) return 'N/A';
  if (year < 0) return `${Math.abs(year)} TCN`;
  return String(year);
}

export function formatHistoricalRange(startDate: unknown, endDate: unknown) {
  return `${formatHistoricalYear(extractYear(startDate))} - ${formatHistoricalYear(extractYear(endDate))}`;
}

export function normalizeHistoricalDate(value: unknown) {
  if (typeof value === 'string') return value.trim();
  const year = extractYear(value);
  return year === null ? '' : String(year);
}

export function historicalYearToDate(value?: string) {
  if (!value?.trim()) return null;
  const year = Number(value.trim());
  if (!Number.isInteger(year)) throw new Error('Năm lịch sử phải là số nguyên.');
  const date = new Date(0);
  date.setUTCFullYear(year, 0, 1);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export function formatAdminDateTime(value: unknown) {
  if (!value) return 'N/A';
  let date: Date | null = null;
  if (value instanceof Date) date = value;
  else if (typeof value === 'object' && value && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    date = (value as { toDate: () => Date }).toDate();
  } else if (typeof value === 'object' && value && 'seconds' in value) {
    date = new Date(Number((value as { seconds: number }).seconds) * 1000);
  } else if (typeof value === 'string' || typeof value === 'number') date = new Date(value);
  return date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date) : 'N/A';
}
