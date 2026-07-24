import { historicalYearToDate } from '@/lib/utils/historicalDate';

export function prepareFirestoreContent<T extends { startDate?: string; endDate?: string }>(data: T) {
  const result: Record<string, unknown> = { ...data };
  const startDate = historicalYearToDate(data.startDate);
  const endDate = historicalYearToDate(data.endDate);
  if (startDate) result.startDate = startDate;
  else result.startDate = null;
  if (endDate) result.endDate = endDate;
  else if (data.endDate === '') result.endDate = null;
  return result;
}
