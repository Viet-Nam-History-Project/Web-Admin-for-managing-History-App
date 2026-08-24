import { loadEnvConfig } from '@next/env';
import { getAdminDb } from '@/lib/firebase/admin';

type StatusSummary = Record<string, number>;

function statusOf(data: FirebaseFirestore.DocumentData) {
  if (data.isDeleted === true || data.status === 'deleted') return 'deleted';
  if (typeof data.status === 'string' && data.status.trim()) return data.status;
  return 'missing';
}

function summarize(documents: FirebaseFirestore.QueryDocumentSnapshot[]): StatusSummary {
  return documents.reduce<StatusSummary>((result, document) => {
    const status = statusOf(document.data());
    result[status] = (result[status] ?? 0) + 1;
    return result;
  }, {});
}

async function main() {
  loadEnvConfig(process.cwd());
  const db = getAdminDb();
  const rootNames = ['periods', 'periods_person', 'articles', 'museums', 'explore', 'events', 'timelines'];
  const rootSnapshots = await Promise.all(rootNames.map((name) => db.collection(name).get()));
  const [stages, allEvents, persons, quizzes, questions, eras] = await Promise.all([
    db.collectionGroup('stages').get(),
    db.collectionGroup('events').get(),
    db.collectionGroup('persons').get(),
    db.collectionGroup('quizzes').get(),
    db.collectionGroup('questions').get(),
    db.collection('games/timelinepuzzle/eras').get(),
  ]);

  const root = Object.fromEntries(rootSnapshots.map((snapshot, index) => [rootNames[index], summarize(snapshot.docs)]));
  const personPeriods = rootSnapshots[rootNames.indexOf('periods_person')].docs;
  const personGroups = await Promise.all(personPeriods.map(async (period) => {
    const entries = await period.ref.collection('persons').get();
    const events = await Promise.all(entries.docs.map((person) => person.ref.collection('events').get()));
    return {
      id: period.id,
      status: statusOf(period.data()),
      persons: summarize(entries.docs),
      personEvents: summarize(events.flatMap((snapshot) => snapshot.docs)),
      total: entries.size,
    };
  }));

  console.log(JSON.stringify({
    root,
    nested: {
      stages: summarize(stages.docs),
      events: summarize(allEvents.docs),
      persons: summarize(persons.docs),
      quizzes: summarize(quizzes.docs),
      questions: summarize(questions.docs),
      timelineEras: summarize(eras.docs),
    },
    personGroups,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
