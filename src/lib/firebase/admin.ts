import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

type ServiceAccountEnv = {
  project_id?: string;
  projectId?: string;
  client_email?: string;
  clientEmail?: string;
  private_key?: string;
  privateKey?: string;
};

function resolvePrivateKey() {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  return key?.replace(/\\n/g, '\n');
}

function parseServiceAccountEnv(): ServiceAccountEnv | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY ?? process.env.FIREBASE_KEY;
  if (!raw) return null;

  const normalized = raw.trim();
  const jsonText = normalized.startsWith('{')
    ? normalized
    : Buffer.from(normalized, 'base64').toString('utf8');

  try {
    return JSON.parse(jsonText) as ServiceAccountEnv;
  } catch {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY/FIREBASE_KEY không phải JSON service account hợp lệ hoặc base64 JSON hợp lệ.',
    );
  }
}

function createAdminApp(): App {
  if (getApps().length) return getApps()[0];

  const serviceAccount = parseServiceAccountEnv();
  const projectId =
    serviceAccount?.project_id ??
    serviceAccount?.projectId ??
    process.env.FIREBASE_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail =
    serviceAccount?.client_email ??
    serviceAccount?.clientEmail ??
    process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey =
    (serviceAccount?.private_key ?? serviceAccount?.privateKey)?.replace(/\\n/g, '\n') ??
    resolvePrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    const missing = [
      !projectId && 'FIREBASE_PROJECT_ID',
      !clientEmail && 'FIREBASE_CLIENT_EMAIL',
      !privateKey && 'FIREBASE_PRIVATE_KEY',
    ].filter(Boolean).join(', ');
    throw new Error(
      `Thiếu Firebase Admin env: ${missing}. Có thể dùng FIREBASE_SERVICE_ACCOUNT_KEY hoặc FIREBASE_KEY để dán nguyên service account JSON.`,
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export function getAdminApp() {
  return createAdminApp();
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}
