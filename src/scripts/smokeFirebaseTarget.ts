import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { cert, deleteApp, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const WORKSPACE = path.resolve(process.cwd(), '..');
const CREDENTIAL_PATH = path.join(
  WORKSPACE,
  'historyapplication-de20b-firebase-adminsdk-fbsvc-1271bd04bd.json',
);
const CONFIG_PATH = path.join(WORKSPACE, 'firebaseConfig');

function clientValue(name: string) {
  const source = readFileSync(CONFIG_PATH, 'utf8');
  const match = source.match(new RegExp(`${name}\\s*:\\s*["']([^"']+)["']`));
  if (!match) throw new Error(`firebaseConfig thiếu ${name}`);
  return match[1];
}

async function jsonFetch(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    throw new Error(`${url} trả về HTTP ${response.status}: ${text.slice(0, 300)}`);
  }
  return { status: response.status, data };
}

async function main() {
  const credential = JSON.parse(readFileSync(CREDENTIAL_PATH, 'utf8')) as {
    project_id: string;
    client_email: string;
    private_key: string;
  };
  const apiKey = clientValue('apiKey');
  const projectId = clientValue('projectId');
  if (credential.project_id !== projectId) throw new Error('Sai cặp config/credential.');
  const app = initializeApp({
    credential: cert({
      projectId,
      clientEmail: credential.client_email,
      privateKey: credential.private_key,
    }),
    projectId,
  }, 'firebase-target-smoke');

  try {
    const adminSnapshot = await getFirestore(app).collection('admin_users').limit(1).get();
    if (adminSnapshot.empty) throw new Error('Project đích không có admin_users.');
    const uid = adminSnapshot.docs[0].id;
    const customToken = await getAuth(app).createCustomToken(uid);
    const signIn = await jsonFetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: customToken, returnSecureToken: true }),
      },
    );
    const idToken = (signIn.data as { idToken?: string }).idToken;
    if (!idToken) throw new Error('Không nhận được target Firebase ID token.');
    const headers = { authorization: `Bearer ${idToken}` };

    const firestore = await jsonFetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/periods?pageSize=1`,
      { headers },
    );
    const webAdmin = await jsonFetch('http://127.0.0.1:3000/api/admin/periods', {
      headers,
    });
    const health = await jsonFetch('http://127.0.0.1:8000/health');

    const pythonPath = path.join(WORKSPACE, 'History-Chatbot/.venv/bin/python');
    const pythonResult = spawnSync(
      pythonPath,
      ['-c', [
        'import os',
        'from src.api.auth import initialize_firebase',
        'from firebase_admin import auth',
        'initialize_firebase()',
        'decoded = auth.verify_id_token(os.environ["FIREBASE_SMOKE_ID_TOKEN"])',
        'assert decoded.get("uid") or decoded.get("sub")',
      ].join(';')],
      {
        cwd: path.join(WORKSPACE, 'History-Chatbot/SourceCode'),
        env: { ...process.env, FIREBASE_SMOKE_ID_TOKEN: idToken },
        encoding: 'utf8',
      },
    );
    if (pythonResult.status !== 0) {
      throw new Error(`FastAPI Firebase verify thất bại: ${pythonResult.stderr.slice(0, 300)}`);
    }

    let aiChat: { status: number; answerLength: number; confidence?: number } | undefined;
    if (process.env.SMOKE_AI_CHAT === '1') {
      const chat = await jsonFetch('http://127.0.0.1:8000/v1/chat', {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify({ question: 'Chiến dịch Điện Biên Phủ diễn ra như thế nào?' }),
      });
      const result = chat.data as { answer?: string; confidence?: number };
      aiChat = {
        status: chat.status,
        answerLength: result.answer?.length ?? 0,
        confidence: result.confidence,
      };
    }

    console.log(JSON.stringify({
      projectId,
      firebaseAuth: signIn.status,
      firestoreRules: {
        status: firestore.status,
        returnedDocuments: ((firestore.data as { documents?: unknown[] }).documents ?? []).length,
      },
      webAdmin: {
        status: webAdmin.status,
        returnedPeriods: Array.isArray(webAdmin.data)
          ? webAdmin.data.length
          : ((webAdmin.data as { items?: unknown[] })?.items ?? []).length,
      },
      fastApiFirebaseVerification: 'ok',
      aiHealth: health.data,
      aiChat,
    }, null, 2));
  } finally {
    await deleteApp(app);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
