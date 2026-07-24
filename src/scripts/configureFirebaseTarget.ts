import { chmodSync, copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

const WORKSPACE = path.resolve(process.cwd(), '..');
const CONFIG_PATH = path.join(WORKSPACE, 'firebaseConfig');
const TARGET_CREDENTIAL_PATH = path.join(
  WORKSPACE,
  'historyapplication-de20b-firebase-adminsdk-fbsvc-1271bd04bd.json',
);
const WEB_ENV = path.join(WORKSPACE, 'Web-Admin-for-managing-History-App/.env');
const WEB_LOCAL_ENV = path.join(WORKSPACE, 'Web-Admin-for-managing-History-App/.env.local');
const MOBILE_ENV = path.join(WORKSPACE, 'VietNamHistoryApplicationReact/.env');
const API_ENV = path.join(WORKSPACE, 'History-Chatbot/SourceCode/.env');

type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function parseClientConfig(): FirebaseClientConfig {
  const source = readFileSync(CONFIG_PATH, 'utf8');
  const value = (name: keyof FirebaseClientConfig) => {
    const match = source.match(new RegExp(`${name}\\s*:\\s*["']([^"']+)["']`));
    if (!match) throw new Error(`firebaseConfig thiếu ${name}`);
    return match[1];
  };
  const config: FirebaseClientConfig = {
    apiKey: value('apiKey'),
    authDomain: value('authDomain'),
    projectId: value('projectId'),
    storageBucket: value('storageBucket'),
    messagingSenderId: value('messagingSenderId'),
    appId: value('appId'),
  };
  const credential = JSON.parse(readFileSync(TARGET_CREDENTIAL_PATH, 'utf8')) as {
    project_id?: string;
  };
  if (credential.project_id !== config.projectId) {
    throw new Error('firebaseConfig và target service account không cùng project.');
  }
  return config;
}

function stripEnvKeys(source: string, prefixes: string[]) {
  const lines = source.split(/\r?\n/);
  const output: string[] = [];
  let skippingMultilineQuote: "'" | '"' | null = null;
  for (const line of lines) {
    if (skippingMultilineQuote) {
      if (line.trimEnd().endsWith(skippingMultilineQuote)) skippingMultilineQuote = null;
      continue;
    }
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || !prefixes.some((prefix) => match[1].startsWith(prefix))) {
      output.push(line);
      continue;
    }
    const rawValue = match[2].trimStart();
    const quote = rawValue.startsWith("'") ? "'" : rawValue.startsWith('"') ? '"' : null;
    if (quote && !rawValue.slice(1).includes(quote)) skippingMultilineQuote = quote;
  }
  return output.join('\n').replace(/^\s+|\s+$/g, '');
}

function replaceEnvValue(source: string, key: string, value: string) {
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  if (pattern.test(source)) return source.replace(pattern, `${key}=${value}`);
  return `${source.trimEnd()}\n${key}=${value}\n`;
}

function secureWrite(filePath: string, content: string) {
  writeFileSync(filePath, `${content.trim()}\n`, { encoding: 'utf8', mode: 0o600 });
  chmodSync(filePath, 0o600);
}

function main() {
  const config = parseClientConfig();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(
    WORKSPACE,
    'Web-Admin-for-managing-History-App/.data',
    `firebase-env-backup-${timestamp}`,
  );
  mkdirSync(backupDir, { recursive: true });
  for (const filePath of [WEB_ENV, WEB_LOCAL_ENV, MOBILE_ENV, API_ENV]) {
    const backupPath = path.join(
      backupDir,
      filePath.slice(WORKSPACE.length + 1).replaceAll('/', '__'),
    );
    copyFileSync(filePath, backupPath);
    chmodSync(backupPath, 0o600);
  }

  const originalWebEnv = readFileSync(WEB_ENV, 'utf8');
  const existingSessionSecret = originalWebEnv.match(/^ADMIN_SESSION_SECRET=(.+)$/m)?.[1]?.trim();
  const adminSessionSecret = existingSessionSecret && existingSessionSecret.length >= 32
    ? existingSessionSecret
    : randomBytes(48).toString('base64url');
  const webRemainder = stripEnvKeys(originalWebEnv, [
    'NEXT_PUBLIC_FIREBASE_',
    'FIREBASE_',
  ]);
  secureWrite(WEB_ENV, [
    `NEXT_PUBLIC_FIREBASE_API_KEY=${config.apiKey}`,
    `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${config.authDomain}`,
    `NEXT_PUBLIC_FIREBASE_PROJECT_ID=${config.projectId}`,
    '',
    `FIREBASE_PROJECT_ID=${config.projectId}`,
    `FIREBASE_SERVICE_ACCOUNT_PATH=${TARGET_CREDENTIAL_PATH}`,
    `ADMIN_SESSION_SECRET=${adminSessionSecret}`,
    '',
    webRemainder,
  ].join('\n'));

  let webLocal = readFileSync(WEB_LOCAL_ENV, 'utf8');
  webLocal = replaceEnvValue(
    webLocal,
    'FIREBASE_STORAGE_BUCKET',
    config.storageBucket,
  );
  secureWrite(WEB_LOCAL_ENV, webLocal);

  const mobileRemainder = stripEnvKeys(readFileSync(MOBILE_ENV, 'utf8'), [
    'EXPO_PUBLIC_FIREBASE_',
  ]);
  secureWrite(MOBILE_ENV, [
    `EXPO_PUBLIC_FIREBASE_API_KEY=${config.apiKey}`,
    `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=${config.authDomain}`,
    `EXPO_PUBLIC_FIREBASE_PROJECT_ID=${config.projectId}`,
    `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=${config.storageBucket}`,
    `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${config.messagingSenderId}`,
    `EXPO_PUBLIC_FIREBASE_APP_ID=${config.appId}`,
    `EXPO_PUBLIC_CONTENT_BASE_URL=https://${config.projectId}.web.app/content`,
    mobileRemainder,
  ].join('\n'));

  let apiEnv = readFileSync(API_ENV, 'utf8');
  apiEnv = replaceEnvValue(apiEnv, 'FIREBASE_PROJECT_ID', config.projectId);
  apiEnv = replaceEnvValue(
    apiEnv,
    'FIREBASE_SERVICE_ACCOUNT_PATH',
    TARGET_CREDENTIAL_PATH,
  );
  secureWrite(API_ENV, apiEnv);

  console.log(JSON.stringify({
    projectId: config.projectId,
    updated: [WEB_ENV, WEB_LOCAL_ENV, MOBILE_ENV, API_ENV],
    backupDir,
  }, null, 2));
}

main();
