import { createHash } from 'node:crypto';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import { DocumentReference, GeoPoint, Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';

type FileEntry = { logicalPath: string; value: unknown; json: string; sha256: string };

function jsonValue(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof GeoPoint) return { latitude: value.latitude, longitude: value.longitude };
  if (value instanceof DocumentReference) return value.path;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(jsonValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonValue(item)]));
  return value;
}

function visible(data: FirebaseFirestore.DocumentData) {
  return data.status !== 'draft' && data.status !== 'deleted' && data.isDeleted !== true;
}

function row(document: FirebaseFirestore.QueryDocumentSnapshot, extra: Record<string, unknown> = {}) {
  return jsonValue({ ...document.data(), ...extra, id: document.id, slug: document.id });
}

function entry(logicalPath: string, value: unknown): FileEntry {
  const json = `${JSON.stringify(jsonValue(value))}\n`;
  return { logicalPath, value, json, sha256: createHash('sha256').update(json).digest('hex') };
}

async function main() {
  loadEnvConfig(process.cwd());
  const db = getAdminDb();
  const files: FileEntry[] = [];

  const periodsSnapshot = await db.collection('periods').orderBy('sortOrder', 'asc').get();
  const periods = periodsSnapshot.docs.filter((document) => visible(document.data()));
  files.push(entry('periods.json', periods.map((document) => row(document))));
  for (const period of periods) {
    const stagesSnapshot = await period.ref.collection('stages').orderBy('sortOrder', 'asc').get();
    const stages = stagesSnapshot.docs.filter((document) => visible(document.data()));
    files.push(entry(`periods/${period.id}/stages.json`, stages.map((document) => row(document, { periodSlug: period.id }))));
    for (const stage of stages) {
      const eventsSnapshot = await stage.ref.collection('events').orderBy('sortOrder', 'asc').get();
      const events = eventsSnapshot.docs.filter((document) => visible(document.data()));
      files.push(entry(`periods/${period.id}/stages/${stage.id}/events.json`, events.map((document) => row(document, { periodSlug: period.id, stageSlug: stage.id }))));
    }
  }

  const personPeriodsSnapshot = await db.collection('periods_person').orderBy('sortOrder', 'asc').get();
  const personPeriods = personPeriodsSnapshot.docs.filter((document) => visible(document.data()));
  files.push(entry('persons/periods.json', personPeriods.map((document) => row(document))));
  for (const period of personPeriods) {
    const personsSnapshot = await period.ref.collection('persons').orderBy('sortOrder', 'asc').get();
    const persons = personsSnapshot.docs.filter((document) => visible(document.data()));
    files.push(entry(`persons/${period.id}/index.json`, persons.map((document) => row(document))));
    for (const person of persons) {
      files.push(entry(`persons/${period.id}/${person.id}.json`, row(person)));
      const eventsSnapshot = await person.ref.collection('events').get();
      files.push(entry(`persons/${period.id}/${person.id}/events.json`, eventsSnapshot.docs.filter((document) => visible(document.data())).map((document) => row(document))));
    }
  }

  for (const collectionName of ['articles', 'museums', 'explore', 'events', 'timelines']) {
    const snapshot = await db.collection(collectionName).orderBy('sortOrder', 'asc').get().catch(() => null);
    files.push(entry(`${collectionName}.json`, snapshot?.docs.filter((document) => visible(document.data())).map((document) => row(document)) ?? []));
  }

  const quizRoot = db.doc('games/quiz-lich-su-viet-nam');
  const quizzesSnapshot = await quizRoot.collection('quizzes').get();
  const quizzes = quizzesSnapshot.docs.filter((document) => visible(document.data()));
  files.push(entry('games/quizzes.json', quizzes.map((document) => row(document))));
  for (const quiz of quizzes) {
    const questions = await quiz.ref.collection('questions').orderBy('orderQuestion', 'asc').get();
    files.push(entry(`games/quizzes/${quiz.id}/questions.json`, questions.docs.filter((document) => visible(document.data())).map((document) => row(document))));
  }
  const erasSnapshot = await db.collection('games/timelinepuzzle/eras').get();
  files.push(entry('games/timeline-eras.json', erasSnapshot.docs.filter((document) => visible(document.data())).map((document) => row(document))));

  const versionHash = createHash('sha256')
    .update(files.map((file) => `${file.logicalPath}:${file.sha256}`).sort().join('\n'))
    .digest('hex').slice(0, 16);
  const version = `v-${versionHash}`;
  const contentRoot = path.resolve(process.cwd(), 'public/content');
  const versionRoot = path.join(contentRoot, version);
  mkdirSync(versionRoot, { recursive: true });
  const manifestFiles: Record<string, { url: string; sha256: string; size: number }> = {};
  for (const file of files) {
    const outputPath = path.join(versionRoot, file.logicalPath);
    mkdirSync(path.dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, file.json, 'utf8');
    manifestFiles[file.logicalPath] = { url: `${version}/${file.logicalPath}`, sha256: file.sha256, size: Buffer.byteLength(file.json) };
  }
  const manifest = {
    contentVersion: version,
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    minAppVersion: '1.0.0',
    files: manifestFiles,
  };
  const temporaryManifest = path.join(contentRoot, 'manifest.json.tmp');
  writeFileSync(temporaryManifest, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  renameSync(temporaryManifest, path.join(contentRoot, 'manifest.json'));
  console.log(JSON.stringify({ version, files: files.length, bytes: Object.values(manifestFiles).reduce((sum, file) => sum + file.size, 0), manifest: path.join(contentRoot, 'manifest.json') }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
