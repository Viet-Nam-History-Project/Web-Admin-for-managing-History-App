import { getAdminDb } from '@/lib/firebase/admin';
import { graphSyncService } from '@/services/graphSyncService';

async function main() {
  const db = getAdminDb();
  const periods = await db.collection('periods').get();

  for (const periodDoc of periods.docs) {
    const periodData = periodDoc.data();
    await graphSyncService.syncPeriod(periodDoc.id, { ...periodData, id: periodDoc.id });

    const stages = await periodDoc.ref.collection('stages').get();
    for (const stageDoc of stages.docs) {
      const stageData = stageDoc.data();
      await graphSyncService.syncStage(periodDoc.id, stageDoc.id, { ...stageData, id: stageDoc.id });

      const events = await stageDoc.ref.collection('events').get();
      for (const eventDoc of events.docs) {
        await graphSyncService.syncEvent(periodDoc.id, stageDoc.id, eventDoc.id, {
          ...eventDoc.data(),
          id: eventDoc.id,
        });
      }
    }
  }

  console.log(`Synced ${periods.size} periods and nested content to graph.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
