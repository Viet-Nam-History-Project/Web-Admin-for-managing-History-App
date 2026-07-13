import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
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

export async function syncWithStatus(
  entityPath: string,
  sync: () => Promise<void>,
) {
  try {
    await sync();
    await getAdminDb().doc(entityPath).set({
      graphSyncStatus: 'synced',
      graphSyncedAt: FieldValue.serverTimestamp(),
      graphSyncError: FieldValue.delete(),
    }, { merge: true });
    return { status: 'synced' as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Graph sync failed';
    await getAdminDb().doc(entityPath).set({
      graphSyncStatus: 'error',
      graphSyncError: message,
    }, { merge: true });
    return { status: 'error' as const, error: message };
  }
}
