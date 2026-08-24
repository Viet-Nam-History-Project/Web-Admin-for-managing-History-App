import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import { GoogleAuth } from 'google-auth-library';

type FirestoreIndex = {
  collectionGroup: string;
  queryScope: 'COLLECTION' | 'COLLECTION_GROUP';
  fields: Array<Record<string, unknown>>;
};

type ServiceAccount = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

async function main() {
  loadEnvConfig(process.cwd());
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const serviceAccount: ServiceAccount = serviceAccountPath
    ? JSON.parse(readFileSync(path.resolve(serviceAccountPath), 'utf8')) as ServiceAccount
    : {};
  const projectId = serviceAccount.project_id ?? process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = serviceAccount.client_email ?? process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (serviceAccount.private_key ?? process.env.FIREBASE_PRIVATE_KEY)?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Thiếu FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL hoặc FIREBASE_PRIVATE_KEY.');
  }

  const auth = new GoogleAuth({
    credentials: { project_id: projectId, client_email: clientEmail, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const rules = readFileSync(path.resolve(process.cwd(), '../VietNamHistoryApplicationReact/firestore.rules'), 'utf8');
  const ruleset = await client.request<{ name: string }>({
    url: `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`,
    method: 'POST',
    data: { source: { files: [{ name: 'firestore.rules', content: rules }] } },
  });

  const releaseName = `projects/${projectId}/releases/cloud.firestore`;
  await client.request({
    url: `https://firebaserules.googleapis.com/v1/${releaseName}`,
    method: 'PATCH',
    data: {
      release: { name: releaseName, rulesetName: ruleset.data.name },
      updateMask: 'rulesetName',
    },
  });

  const config = JSON.parse(
    readFileSync(path.resolve(process.cwd(), 'firestore.indexes.json'), 'utf8'),
  ) as { indexes?: FirestoreIndex[] };
  let indexesCreated = 0;
  for (const index of config.indexes ?? []) {
    try {
      await client.request({
        url: `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/collectionGroups/${index.collectionGroup}/indexes`,
        method: 'POST',
        data: { queryScope: index.queryScope, fields: index.fields },
      });
      indexesCreated += 1;
    } catch (error) {
      const response = (error as { response?: { status?: number; data?: { error?: { message?: string } } } }).response;
      const notNeeded = response?.status === 400
        && response.data?.error?.message?.includes('not necessary');
      if (response?.status !== 409 && !notNeeded) throw error;
    }
  }

  console.log(JSON.stringify({ projectId, ruleset: ruleset.data.name, indexesCreated }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
