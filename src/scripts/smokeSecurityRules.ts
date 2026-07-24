import { readFileSync } from 'node:fs';
import path from 'node:path';
import { cert, deleteApp, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const workspace = path.resolve(process.cwd(), '..');
const credentialPath = path.join(workspace, 'historyapplication-de20b-firebase-adminsdk-fbsvc-1271bd04bd.json');
const configPath = path.join(workspace, 'firebaseConfig');

function configValue(name: string) {
  const source = readFileSync(configPath, 'utf8');
  const match = source.match(new RegExp(`${name}\\s*:\\s*["']([^"']+)["']`));
  if (!match) throw new Error(`firebaseConfig thiếu ${name}`);
  return match[1];
}

async function main() {
  const serviceAccount = JSON.parse(readFileSync(credentialPath, 'utf8')) as {
    project_id: string; client_email: string; private_key: string;
  };
  const app = initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    }),
    projectId: serviceAccount.project_id,
  }, 'rules-smoke');
  try {
    const auth = getAuth(app);
    const users = await auth.listUsers(20);
    const user = users.users.find((candidate) => candidate.customClaims?.admin === true) ?? users.users[0];
    if (!user) throw new Error('Project không có Firebase Auth user để smoke test.');
    const customToken = await auth.createCustomToken(user.uid);
    const signInResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${configValue('apiKey')}`,
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: customToken, returnSecureToken: true }) },
    );
    const signIn = await signInResponse.json() as { idToken?: string };
    if (!signIn.idToken) throw new Error(`Không đổi được ID token: HTTP ${signInResponse.status}`);
    const base = `https://firestore.googleapis.com/v1/projects/${serviceAccount.project_id}/databases/(default)/documents`;
    const unauthenticatedContent = await fetch(`${base}/periods?pageSize=1`);
    const authenticatedContent = await fetch(`${base}/periods?pageSize=1`, { headers: { authorization: `Bearer ${signIn.idToken}` } });
    const protectedStats = await fetch(`${base}/admin_stats/users`, { headers: { authorization: `Bearer ${signIn.idToken}` } });
    const result = {
      unauthenticatedContent: unauthenticatedContent.status,
      authenticatedContent: authenticatedContent.status,
      protectedAdminStatsFromClient: protectedStats.status,
      customClaimsAdmin: user.customClaims?.admin === true,
      customClaimRoles: user.customClaims?.roles ?? [],
    };
    console.log(JSON.stringify(result, null, 2));
    if (unauthenticatedContent.ok || !authenticatedContent.ok || protectedStats.ok) process.exitCode = 1;
  } finally {
    await deleteApp(app);
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
