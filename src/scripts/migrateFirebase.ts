import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { cert, deleteApp, initializeApp, type App } from 'firebase-admin/app';
import {
  DocumentReference,
  FieldPath,
  GeoPoint,
  Timestamp,
  getFirestore,
  type CollectionReference,
  type Firestore,
} from 'firebase-admin/firestore';
import {
  getAuth,
  type UserImportOptions,
  type UserImportRecord,
  type UserRecord,
} from 'firebase-admin/auth';
import { GoogleAuth } from 'google-auth-library';

type Command =
  | 'access'
  | 'export-config'
  | 'deploy-config'
  | 'migrate-firestore'
  | 'verify-firestore'
  | 'migrate-auth'
  | 'verify-auth';

type ServiceAccountJson = {
  project_id: string;
  client_email: string;
  private_key: string;
};

type CollectionCheckpoint = {
  completed: boolean;
  lastDocumentId?: string;
};

type MigrationCheckpoint = {
  version: 1;
  sourceProjectId: string;
  targetProjectId: string;
  startedAt: string;
  updatedAt: string;
  collections: Record<string, CollectionCheckpoint>;
  sourceDocumentHashes: Record<string, string>;
  firestoreWrites: number;
  auth?: {
    completed: boolean;
    imported: number;
    failed: number;
  };
};

type IdentityConfig = {
  signIn?: {
    email?: {
      enabled?: boolean;
      passwordRequired?: boolean;
      hashConfig?: PasswordHashConfig;
    };
    hashConfig?: PasswordHashConfig;
  };
};

type PasswordHashConfig = {
  algorithm?: string;
  signerKey?: string;
  saltSeparator?: string;
  rounds?: number;
  memoryCost?: number;
};

const PAGE_SIZE = 200;
const ROOT = path.resolve(process.cwd(), '..');
const DEFAULT_SOURCE_CREDENTIAL = path.join(
  ROOT,
  'lichsuvietnam-d3c26-firebase-adminsdk-fbsvc-197d8974ca.json',
);
const DEFAULT_TARGET_CREDENTIAL = path.join(
  ROOT,
  'historyapplication-de20b-firebase-adminsdk-fbsvc-1271bd04bd.json',
);
const CHECKPOINT_PATH = path.resolve(
  process.env.FIREBASE_MIGRATION_CHECKPOINT ?? '.data/firebase-migration-checkpoint.json',
);
const CONFIG_EXPORT_PATH = path.resolve(
  process.env.FIREBASE_MIGRATION_CONFIG_EXPORT
    ?? '.data/firebase-migration-source-config.json',
);
const SAFE_RULES_PATH = path.resolve(
  process.env.FIREBASE_MIGRATION_RULES_FILE
    ?? '../VietNamHistoryApplicationReact/firestore.rules',
);

type RulesFile = { name: string; content: string };
type FirestoreIndex = {
  name?: string;
  state?: string;
  queryScope?: string;
  apiScope?: string;
  fields?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};
type FirestoreFieldConfig = {
  name: string;
  indexConfig?: Record<string, unknown>;
  ttlConfig?: Record<string, unknown>;
};
type FirebaseConfigExport = {
  sourceProjectId: string;
  exportedAt: string;
  firestoreRules: RulesFile[];
  compositeIndexes: FirestoreIndex[];
  fieldConfigs: FirestoreFieldConfig[];
};

function credentialPath(name: 'source' | 'target') {
  const configured = name === 'source'
    ? process.env.FIREBASE_SOURCE_SERVICE_ACCOUNT_PATH
    : process.env.FIREBASE_TARGET_SERVICE_ACCOUNT_PATH;
  return path.resolve(configured ?? (
    name === 'source' ? DEFAULT_SOURCE_CREDENTIAL : DEFAULT_TARGET_CREDENTIAL
  ));
}

function loadServiceAccount(filePath: string): ServiceAccountJson {
  if (!existsSync(filePath)) {
    throw new Error(`Không tìm thấy service account: ${filePath}`);
  }
  const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as ServiceAccountJson;
  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error(`Service account không hợp lệ: ${filePath}`);
  }
  return parsed;
}

function initializeMigrationApp(
  name: string,
  serviceAccount: ServiceAccountJson,
): App {
  return initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    }),
    projectId: serviceAccount.project_id,
  }, name);
}

function newCheckpoint(sourceProjectId: string, targetProjectId: string): MigrationCheckpoint {
  const now = new Date().toISOString();
  return {
    version: 1,
    sourceProjectId,
    targetProjectId,
    startedAt: now,
    updatedAt: now,
    collections: {},
    sourceDocumentHashes: {},
    firestoreWrites: 0,
  };
}

function loadCheckpoint(sourceProjectId: string, targetProjectId: string) {
  if (!existsSync(CHECKPOINT_PATH)) {
    return newCheckpoint(sourceProjectId, targetProjectId);
  }
  const checkpoint = JSON.parse(
    readFileSync(CHECKPOINT_PATH, 'utf8'),
  ) as MigrationCheckpoint;
  if (
    checkpoint.version !== 1
    || checkpoint.sourceProjectId !== sourceProjectId
    || checkpoint.targetProjectId !== targetProjectId
  ) {
    throw new Error('Checkpoint không thuộc cặp Firebase project hiện tại.');
  }
  return checkpoint;
}

function saveCheckpoint(checkpoint: MigrationCheckpoint) {
  checkpoint.updatedAt = new Date().toISOString();
  mkdirSync(path.dirname(CHECKPOINT_PATH), { recursive: true });
  writeFileSync(CHECKPOINT_PATH, `${JSON.stringify(checkpoint, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
}

function stableValue(value: unknown): unknown {
  if (value instanceof Timestamp) {
    return { $timestamp: [value.seconds, value.nanoseconds] };
  }
  if (value instanceof GeoPoint) {
    return { $geoPoint: [value.latitude, value.longitude] };
  }
  if (value instanceof DocumentReference) {
    return { $documentReference: value.path };
  }
  if (value instanceof Date) {
    return { $date: value.toISOString() };
  }
  if (Buffer.isBuffer(value)) {
    return { $buffer: value.toString('base64') };
  }
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)]),
    );
  }
  return value;
}

function documentHash(documentPath: string, data: Record<string, unknown>) {
  return createHash('sha256')
    .update(documentPath)
    .update('\n')
    .update(JSON.stringify(stableValue(data)))
    .digest('hex');
}

function retargetValue(value: unknown, targetDb: Firestore): unknown {
  if (value instanceof DocumentReference) {
    return targetDb.doc(value.path);
  }
  if (Array.isArray(value)) {
    return value.map((item) => retargetValue(item, targetDb));
  }
  if (
    value
    && typeof value === 'object'
    && !(value instanceof Timestamp)
    && !(value instanceof GeoPoint)
    && !(value instanceof Date)
    && !Buffer.isBuffer(value)
  ) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, item]) => [key, retargetValue(item, targetDb)]),
    );
  }
  return value;
}

async function identityConfig(
  serviceAccount: ServiceAccountJson,
): Promise<IdentityConfig> {
  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const response = await client.request<IdentityConfig>({
    url: `https://identitytoolkit.googleapis.com/admin/v2/projects/${serviceAccount.project_id}/config`,
  });
  return response.data;
}

function googleClient(serviceAccount: ServiceAccountJson) {
  const auth = new GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  return auth.getClient();
}

async function pagedGoogleList<T>(
  serviceAccount: ServiceAccountJson,
  url: string,
  resultKey: string,
  pageSize?: number,
): Promise<T[]> {
  const client = await googleClient(serviceAccount);
  const output: T[] = [];
  let pageToken: string | undefined;
  do {
    const query = new URLSearchParams();
    if (pageSize !== undefined) query.set('pageSize', String(pageSize));
    if (pageToken) query.set('pageToken', pageToken);
    const requestUrl = query.size
      ? `${url}${url.includes('?') ? '&' : '?'}${query.toString()}`
      : url;
    let response;
    try {
      response = await client.request<Record<string, unknown>>({
        url: requestUrl,
      });
    } catch (error) {
      throw new Error(
        `Không đọc được Firebase config API ${url}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    const page = response.data[resultKey];
    if (Array.isArray(page)) output.push(...page as T[]);
    pageToken = typeof response.data.nextPageToken === 'string'
      ? response.data.nextPageToken
      : undefined;
  } while (pageToken);
  return output;
}

async function exportFirebaseConfig(sourceCredential: ServiceAccountJson) {
  const client = await googleClient(sourceCredential);
  const releases = await pagedGoogleList<{ name: string; rulesetName: string }>(
    sourceCredential,
    `https://firebaserules.googleapis.com/v1/projects/${sourceCredential.project_id}/releases`,
    'releases',
    100,
  );
  const firestoreRelease = releases.find((release) =>
    release.name.endsWith('/releases/cloud.firestore'),
  );
  if (!firestoreRelease) {
    throw new Error('Không tìm thấy Firestore Rules release trong project nguồn.');
  }
  const ruleset = await client.request<{
    source?: { files?: RulesFile[] };
  }>({
    url: `https://firebaserules.googleapis.com/v1/${firestoreRelease.rulesetName}`,
  });
  const databasePath = `projects/${sourceCredential.project_id}/databases/(default)`;
  const compositeIndexes = await pagedGoogleList<FirestoreIndex>(
    sourceCredential,
    `https://firestore.googleapis.com/v1/${databasePath}/collectionGroups/-/indexes`,
    'indexes',
  );
  const fieldConfigs = await pagedGoogleList<FirestoreFieldConfig>(
    sourceCredential,
    `https://firestore.googleapis.com/v1/${databasePath}/collectionGroups/-/fields?filter=${encodeURIComponent('indexConfig.usesAncestorConfig:false OR ttlConfig:*')}`,
    'fields',
  );
  const exported: FirebaseConfigExport = {
    sourceProjectId: sourceCredential.project_id,
    exportedAt: new Date().toISOString(),
    firestoreRules: ruleset.data.source?.files?.map((file) => ({
      name: file.name,
      content: file.content,
    })) ?? [],
    compositeIndexes,
    fieldConfigs: fieldConfigs.filter((field) =>
      Boolean(field.indexConfig || field.ttlConfig),
    ),
  };
  mkdirSync(path.dirname(CONFIG_EXPORT_PATH), { recursive: true });
  writeFileSync(CONFIG_EXPORT_PATH, `${JSON.stringify(exported, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  console.log(JSON.stringify({
    configExport: CONFIG_EXPORT_PATH,
    rulesFiles: exported.firestoreRules.map((file) => file.name),
    compositeIndexes: exported.compositeIndexes.length,
    fieldConfigs: exported.fieldConfigs.length,
  }, null, 2));
}

function targetResourceName(sourceName: string, targetProjectId: string) {
  return sourceName.replace(/^projects\/[^/]+\//, `projects/${targetProjectId}/`);
}

async function deployFirebaseConfig(targetCredential: ServiceAccountJson) {
  if (!existsSync(CONFIG_EXPORT_PATH)) {
    throw new Error(`Chưa có config export: ${CONFIG_EXPORT_PATH}`);
  }
  const exported = JSON.parse(
    readFileSync(CONFIG_EXPORT_PATH, 'utf8'),
  ) as FirebaseConfigExport;
  const firestoreRules = existsSync(SAFE_RULES_PATH)
    ? [{ name: 'firestore.rules', content: readFileSync(SAFE_RULES_PATH, 'utf8') }]
    : exported.firestoreRules;
  if (!firestoreRules.length) {
    throw new Error('Config export không có Firestore rules.');
  }
  const client = await googleClient(targetCredential);
  const ruleset = await client.request<{ name: string }>({
    url: `https://firebaserules.googleapis.com/v1/projects/${targetCredential.project_id}/rulesets`,
    method: 'POST',
    data: { source: { files: firestoreRules } },
  });
  const releases = await pagedGoogleList<{ name: string; rulesetName: string }>(
    targetCredential,
    `https://firebaserules.googleapis.com/v1/projects/${targetCredential.project_id}/releases`,
    'releases',
    100,
  );
  const releaseName = `projects/${targetCredential.project_id}/releases/cloud.firestore`;
  const releaseExists = releases.some((release) => release.name === releaseName);
  await client.request({
    url: releaseExists
      ? `https://firebaserules.googleapis.com/v1/${releaseName}`
      : `https://firebaserules.googleapis.com/v1/projects/${targetCredential.project_id}/releases`,
    method: releaseExists ? 'PATCH' : 'POST',
    data: releaseExists
      ? {
          release: { name: releaseName, rulesetName: ruleset.data.name },
          updateMask: 'rulesetName',
        }
      : { name: releaseName, rulesetName: ruleset.data.name },
  });

  let indexesCreated = 0;
  for (const sourceIndex of exported.compositeIndexes) {
    if (!sourceIndex.name) continue;
    const collectionMatch = sourceIndex.name.match(/\/collectionGroups\/([^/]+)\/indexes\//);
    if (!collectionMatch) continue;
    const collectionGroup = collectionMatch[1];
    const data = Object.fromEntries(
      Object.entries(sourceIndex).filter(([key]) => !['name', 'state'].includes(key)),
    );
    try {
      await client.request({
        url: `https://firestore.googleapis.com/v1/projects/${targetCredential.project_id}/databases/(default)/collectionGroups/${collectionGroup}/indexes`,
        method: 'POST',
        data,
      });
      indexesCreated += 1;
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status !== 409) throw error;
    }
  }

  let fieldsUpdated = 0;
  for (const field of exported.fieldConfigs) {
    if (field.name.includes('/collectionGroups/__default__/')) continue;
    const targetName = targetResourceName(field.name, targetCredential.project_id);
    const data: Record<string, unknown> = { name: targetName };
    const masks: string[] = [];
    if (field.indexConfig) {
      data.indexConfig = field.indexConfig;
      masks.push('indexConfig');
    }
    if (field.ttlConfig) {
      data.ttlConfig = field.ttlConfig;
      masks.push('ttlConfig');
    }
    if (!masks.length) continue;
    await client.request({
      url: `https://firestore.googleapis.com/v1/${targetName}?updateMask=${masks.join(',')}`,
      method: 'PATCH',
      data,
    });
    fieldsUpdated += 1;
  }
  console.log(JSON.stringify({
    ruleset: ruleset.data.name,
    rulesSource: existsSync(SAFE_RULES_PATH) ? SAFE_RULES_PATH : CONFIG_EXPORT_PATH,
    indexesCreated,
    fieldsUpdated,
  }, null, 2));
}

function importRecord(user: UserRecord): UserImportRecord {
  const record: UserImportRecord = {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
    phoneNumber: user.phoneNumber,
    photoURL: user.photoURL,
    disabled: user.disabled,
    metadata: {
      creationTime: user.metadata.creationTime,
      lastSignInTime: user.metadata.lastSignInTime,
    },
    providerData: user.providerData.map((provider) => ({
      uid: provider.uid,
      providerId: provider.providerId,
      displayName: provider.displayName,
      email: provider.email,
      phoneNumber: provider.phoneNumber,
      photoURL: provider.photoURL,
    })),
    customClaims: user.customClaims,
    tenantId: user.tenantId ?? undefined,
  };
  if (user.passwordHash) record.passwordHash = Buffer.from(user.passwordHash, 'base64');
  if (user.passwordSalt) record.passwordSalt = Buffer.from(user.passwordSalt, 'base64');
  if (user.multiFactor?.enrolledFactors?.length) {
    const enrolledFactors = user.multiFactor.enrolledFactors.flatMap((factor) => {
      const phoneNumber = 'phoneNumber' in factor && typeof factor.phoneNumber === 'string'
        ? factor.phoneNumber
        : undefined;
      if (!phoneNumber) return [];
      return [{
        uid: factor.uid,
        displayName: factor.displayName,
        factorId: factor.factorId,
        phoneNumber,
        enrollmentTime: factor.enrollmentTime,
      }];
    });
    record.multiFactor = {
      enrolledFactors,
    };
  }
  return record;
}

function authImportOptions(config: IdentityConfig): UserImportOptions | undefined {
  const hash = config.signIn?.hashConfig ?? config.signIn?.email?.hashConfig;
  if (!hash?.algorithm) return undefined;
  return {
    hash: {
      algorithm: hash.algorithm as UserImportOptions['hash']['algorithm'],
      key: hash.signerKey ? Buffer.from(hash.signerKey, 'base64') : undefined,
      saltSeparator: hash.saltSeparator
        ? Buffer.from(hash.saltSeparator, 'base64')
        : undefined,
      rounds: hash.rounds,
      memoryCost: hash.memoryCost,
    },
  };
}

async function accessAudit(
  sourceApp: App,
  targetApp: App,
  sourceCredential: ServiceAccountJson,
  targetCredential: ServiceAccountJson,
) {
  const sourceDb = getFirestore(sourceApp);
  const targetDb = getFirestore(targetApp);
  const [sourceCollections, targetCollections, sourceUsers, targetUsers] = await Promise.all([
    sourceDb.listCollections(),
    targetDb.listCollections(),
    getAuth(sourceApp).listUsers(1),
    getAuth(targetApp).listUsers(1),
  ]);
  const [sourceAuthConfig, targetAuthConfig] = await Promise.all([
    identityConfig(sourceCredential),
    identityConfig(targetCredential),
  ]);
  console.log(JSON.stringify({
    source: {
      projectId: sourceCredential.project_id,
      rootCollections: sourceCollections.map((item) => item.id).sort(),
      hasAuthUsers: sourceUsers.users.length > 0,
      hasMoreAuthUsers: Boolean(sourceUsers.pageToken),
      emailPasswordEnabled: Boolean(sourceAuthConfig.signIn?.email?.enabled),
      passwordHashConfigAvailable: Boolean(authImportOptions(sourceAuthConfig)),
    },
    target: {
      projectId: targetCredential.project_id,
      rootCollections: targetCollections.map((item) => item.id).sort(),
      hasAuthUsers: targetUsers.users.length > 0,
      hasMoreAuthUsers: Boolean(targetUsers.pageToken),
      emailPasswordEnabled: Boolean(targetAuthConfig.signIn?.email?.enabled),
    },
  }, null, 2));
}

async function copyCollection(
  sourceCollection: CollectionReference,
  sourceDb: Firestore,
  targetDb: Firestore,
  checkpoint: MigrationCheckpoint,
): Promise<void> {
  const collectionPath = sourceCollection.path;
  const state = checkpoint.collections[collectionPath] ?? { completed: false };
  if (state.completed) return;

  let lastDocumentId = state.lastDocumentId;
  while (true) {
    let query = sourceCollection
      .orderBy(FieldPath.documentId())
      .limit(PAGE_SIZE);
    if (lastDocumentId) query = query.startAfter(lastDocumentId);
    const snapshot = await query.get();
    if (snapshot.empty) {
      checkpoint.collections[collectionPath] = {
        completed: true,
        lastDocumentId,
      };
      saveCheckpoint(checkpoint);
      console.log(`Hoàn tất collection: ${collectionPath}`);
      return;
    }

    const batch = targetDb.batch();
    for (const document of snapshot.docs) {
      const data = document.data() as Record<string, unknown>;
      checkpoint.sourceDocumentHashes[document.ref.path] = documentHash(
        document.ref.path,
        data,
      );
      batch.set(targetDb.doc(document.ref.path), retargetValue(data, targetDb));
    }
    await batch.commit();
    checkpoint.firestoreWrites += snapshot.size;

    for (const document of snapshot.docs) {
      const subcollections = (await document.ref.listCollections())
        .sort((left, right) => left.id.localeCompare(right.id));
      for (const subcollection of subcollections) {
        await copyCollection(subcollection, sourceDb, targetDb, checkpoint);
      }
    }

    lastDocumentId = snapshot.docs.at(-1)?.id;
    checkpoint.collections[collectionPath] = {
      completed: false,
      lastDocumentId,
    };
    saveCheckpoint(checkpoint);
    console.log(
      `Đã ghi ${snapshot.size} documents từ ${collectionPath}; tổng ${checkpoint.firestoreWrites}`,
    );
  }
}

async function migrateFirestore(
  sourceDb: Firestore,
  targetDb: Firestore,
  checkpoint: MigrationCheckpoint,
) {
  sourceDb.settings({ ignoreUndefinedProperties: true });
  targetDb.settings({ ignoreUndefinedProperties: true });
  const roots = (await sourceDb.listCollections())
    .sort((left, right) => left.id.localeCompare(right.id));
  for (const collection of roots) {
    await copyCollection(collection, sourceDb, targetDb, checkpoint);
  }
  saveCheckpoint(checkpoint);
  console.log(JSON.stringify({
    migratedDocuments: Object.keys(checkpoint.sourceDocumentHashes).length,
    firestoreWrites: checkpoint.firestoreWrites,
    checkpoint: CHECKPOINT_PATH,
  }, null, 2));
}

async function collectTargetHashes(
  collection: CollectionReference,
  output: Record<string, string>,
): Promise<void> {
  let lastDocumentId: string | undefined;
  while (true) {
    let query = collection.orderBy(FieldPath.documentId()).limit(PAGE_SIZE);
    if (lastDocumentId) query = query.startAfter(lastDocumentId);
    const snapshot = await query.get();
    if (snapshot.empty) return;
    for (const document of snapshot.docs) {
      output[document.ref.path] = documentHash(
        document.ref.path,
        document.data() as Record<string, unknown>,
      );
      const subcollections = (await document.ref.listCollections())
        .sort((left, right) => left.id.localeCompare(right.id));
      for (const subcollection of subcollections) {
        await collectTargetHashes(subcollection, output);
      }
    }
    lastDocumentId = snapshot.docs.at(-1)?.id;
  }
}

async function verifyFirestore(targetDb: Firestore, checkpoint: MigrationCheckpoint) {
  const targetHashes: Record<string, string> = {};
  const roots = (await targetDb.listCollections())
    .sort((left, right) => left.id.localeCompare(right.id));
  for (const collection of roots) {
    await collectTargetHashes(collection, targetHashes);
  }
  const sourcePaths = Object.keys(checkpoint.sourceDocumentHashes).sort();
  const targetPaths = Object.keys(targetHashes).sort();
  const missing = sourcePaths.filter((item) => !(item in targetHashes));
  const extra = targetPaths.filter((item) => !(item in checkpoint.sourceDocumentHashes));
  const mismatched = sourcePaths.filter(
    (item) => item in targetHashes
      && checkpoint.sourceDocumentHashes[item] !== targetHashes[item],
  );
  const report = {
    sourceDocuments: sourcePaths.length,
    targetDocuments: targetPaths.length,
    missing: missing.slice(0, 20),
    extra: extra.slice(0, 20),
    mismatched: mismatched.slice(0, 20),
    valid: missing.length === 0 && extra.length === 0 && mismatched.length === 0,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.valid) process.exitCode = 2;
}

async function migrateAuth(
  sourceApp: App,
  targetApp: App,
  sourceCredential: ServiceAccountJson,
  checkpoint: MigrationCheckpoint,
) {
  if (checkpoint.auth?.completed) {
    console.log('Authentication đã được migrate theo checkpoint.');
    return;
  }
  const sourceAuth = getAuth(sourceApp);
  const targetAuth = getAuth(targetApp);
  const config = await identityConfig(sourceCredential);
  const options = authImportOptions(config);
  let pageToken: string | undefined;
  let imported = 0;
  let failed = 0;

  do {
    const page = await sourceAuth.listUsers(1000, pageToken);
    const records = page.users.map(importRecord);
    const passwordUserWithoutHash = page.users.some((user) =>
      user.providerData.some((provider) => provider.providerId === 'password')
      && !user.passwordHash,
    );
    if (passwordUserWithoutHash) {
      throw new Error(
        'Credential nguồn không đọc được password hash; dừng trước khi import Auth.',
      );
    }
    if (records.some((record) => record.passwordHash) && !options) {
      throw new Error('Không lấy được Firebase SCRYPT hash config từ project nguồn.');
    }
    if (records.length) {
      const result = await targetAuth.importUsers(records, options);
      imported += result.successCount;
      failed += result.failureCount;
      if (result.failureCount) {
        const details = result.errors.map((item) => ({
          index: item.index,
          code: item.error.code,
          message: item.error.message,
        }));
        throw new Error(`Auth import có lỗi: ${JSON.stringify(details)}`);
      }
    }
    pageToken = page.pageToken;
    checkpoint.auth = { completed: false, imported, failed };
    saveCheckpoint(checkpoint);
    console.log(`Đã import ${imported} Firebase Auth users.`);
  } while (pageToken);

  checkpoint.auth = { completed: true, imported, failed };
  saveCheckpoint(checkpoint);
}

function authUserHash(user: UserRecord) {
  const comparable = {
    uid: user.uid,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
    phoneNumber: user.phoneNumber,
    photoURL: user.photoURL,
    disabled: user.disabled,
    metadata: {
      creationTime: user.metadata.creationTime,
      lastSignInTime: user.metadata.lastSignInTime,
    },
    providerData: user.providerData
      .map((provider) => ({
        uid: provider.uid,
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        phoneNumber: provider.phoneNumber,
        photoURL: provider.photoURL,
      }))
      .sort((left, right) => left.providerId.localeCompare(right.providerId)),
    customClaims: user.customClaims,
    tenantId: user.tenantId,
    passwordHash: user.passwordHash,
    passwordSalt: user.passwordSalt,
  };
  return createHash('sha256')
    .update(JSON.stringify(stableValue(comparable)))
    .digest('hex');
}

async function authHashes(app: App) {
  const output: Record<string, string> = {};
  let pageToken: string | undefined;
  do {
    const page = await getAuth(app).listUsers(1000, pageToken);
    for (const user of page.users) output[user.uid] = authUserHash(user);
    pageToken = page.pageToken;
  } while (pageToken);
  return output;
}

async function verifyAuth(sourceApp: App, targetApp: App) {
  const [sourceHashes, targetHashes] = await Promise.all([
    authHashes(sourceApp),
    authHashes(targetApp),
  ]);
  const sourceIds = Object.keys(sourceHashes).sort();
  const targetIds = Object.keys(targetHashes).sort();
  const missing = sourceIds.filter((uid) => !(uid in targetHashes));
  const extra = targetIds.filter((uid) => !(uid in sourceHashes));
  const mismatched = sourceIds.filter(
    (uid) => uid in targetHashes && sourceHashes[uid] !== targetHashes[uid],
  );
  const report = {
    sourceUsers: sourceIds.length,
    targetUsers: targetIds.length,
    missingCount: missing.length,
    extraCount: extra.length,
    mismatchedCount: mismatched.length,
    valid: missing.length === 0 && extra.length === 0 && mismatched.length === 0,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.valid) process.exitCode = 2;
}

async function main() {
  const command = process.argv[2] as Command | undefined;
  if (!command || ![
    'access',
    'export-config',
    'deploy-config',
    'migrate-firestore',
    'verify-firestore',
    'migrate-auth',
    'verify-auth',
  ].includes(command)) {
    throw new Error(
      'Dùng: tsx src/scripts/migrateFirebase.ts '
      + '<access|export-config|deploy-config|migrate-firestore|verify-firestore|migrate-auth|verify-auth>',
    );
  }

  const sourceCredential = loadServiceAccount(credentialPath('source'));
  const targetCredential = loadServiceAccount(credentialPath('target'));
  const sourceApp = initializeMigrationApp('firebase-migration-source', sourceCredential);
  const targetApp = initializeMigrationApp('firebase-migration-target', targetCredential);
  const checkpoint = loadCheckpoint(
    sourceCredential.project_id,
    targetCredential.project_id,
  );

  try {
    if (command === 'access') {
      await accessAudit(sourceApp, targetApp, sourceCredential, targetCredential);
    } else if (command === 'export-config') {
      await exportFirebaseConfig(sourceCredential);
    } else if (command === 'deploy-config') {
      await deployFirebaseConfig(targetCredential);
    } else if (command === 'migrate-firestore') {
      await migrateFirestore(
        getFirestore(sourceApp),
        getFirestore(targetApp),
        checkpoint,
      );
    } else if (command === 'verify-firestore') {
      await verifyFirestore(getFirestore(targetApp), checkpoint);
    } else if (command === 'migrate-auth') {
      await migrateAuth(sourceApp, targetApp, sourceCredential, checkpoint);
    } else if (command === 'verify-auth') {
      await verifyAuth(sourceApp, targetApp);
    }
  } finally {
    await Promise.all([deleteApp(sourceApp), deleteApp(targetApp)]);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
