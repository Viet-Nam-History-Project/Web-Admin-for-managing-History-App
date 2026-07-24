import {
  DocumentReference,
  GeoPoint,
  Timestamp,
} from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { paths } from '@/lib/firebase/firestorePaths';

type ExportedDocument = {
  id: string;
  path: string;
  fields: Record<string, unknown>;
  subcollections: Record<string, ExportedDocument[]>;
};

function convertFirestoreValue(value: unknown): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (value instanceof Timestamp) {
    return { __type: 'timestamp', iso: value.toDate().toISOString() };
  }
  if (value instanceof Date) return value.toISOString();
  if (value instanceof DocumentReference) {
    return { __type: 'reference', path: value.path };
  }
  if (value instanceof GeoPoint) {
    return {
      __type: 'geopoint',
      latitude: value.latitude,
      longitude: value.longitude,
    };
  }
  if (Buffer.isBuffer(value)) {
    return { __type: 'bytes', base64: value.toString('base64') };
  }
  if (Array.isArray(value)) return value.map(convertFirestoreValue);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, convertFirestoreValue(nestedValue)]),
    );
  }
  return value;
}

async function exportDocument(documentRef: DocumentReference): Promise<ExportedDocument | null> {
  const snapshot = await documentRef.get();
  if (!snapshot.exists) return null;

  const subcollections: Record<string, ExportedDocument[]> = {};
  const collections = (await documentRef.listCollections()).sort((a, b) => a.id.localeCompare(b.id));

  for (const collection of collections) {
    const childSnapshot = await collection.get();
    const children = await Promise.all(
      childSnapshot.docs.map((document) => exportDocument(document.ref)),
    );
    subcollections[collection.id] = children.filter(
      (document): document is ExportedDocument => document !== null,
    );
  }

  return {
    id: snapshot.id,
    path: snapshot.ref.path,
    fields: convertFirestoreValue(snapshot.data() ?? {}) as Record<string, unknown>,
    subcollections,
  };
}

export const periodExportService = {
  async exportAll(): Promise<ExportedDocument[]> {
    const snapshot = await getAdminDb().collection(paths.periods).get();
    const documents = await Promise.all(snapshot.docs.map((document) => exportDocument(document.ref)));
    return documents.filter((document): document is ExportedDocument => document !== null);
  },
};
