import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getAdminStorage } from '@/lib/firebase/admin';

export type PdfStorageProvider = 'local' | 'firebase';

export function getPdfStorageProvider(): PdfStorageProvider {
  return process.env.AI_PDF_STORAGE_DRIVER === 'firebase' ? 'firebase' : 'local';
}

function getLocalStorageRoot() {
  const configuredPath = process.env.AI_PDF_LOCAL_DIR?.trim() || '.data';
  return path.resolve(process.cwd(), configuredPath);
}

function resolveLocalPath(storagePath: string) {
  const root = getLocalStorageRoot();
  const target = path.resolve(root, storagePath);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error('Đường dẫn PDF không hợp lệ.');
  }
  return target;
}

export async function saveKnowledgePdf(storagePath: string, buffer: Buffer) {
  const provider = getPdfStorageProvider();

  if (provider === 'firebase') {
    await getAdminStorage().bucket().file(storagePath).save(buffer, {
      contentType: 'application/pdf',
      resumable: true,
    });
    return provider;
  }

  const target = resolveLocalPath(storagePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
  return provider;
}

export async function readKnowledgePdf(
  storagePath: string,
  provider: PdfStorageProvider,
) {
  if (provider === 'firebase') {
    const [buffer] = await getAdminStorage().bucket().file(storagePath).download();
    return buffer;
  }

  return readFile(resolveLocalPath(storagePath));
}

export async function deleteKnowledgePdf(
  storagePath: string,
  provider: PdfStorageProvider,
) {
  if (provider === 'firebase') {
    await getAdminStorage().bucket().file(storagePath).delete({ ignoreNotFound: true });
    return;
  }

  const target = resolveLocalPath(storagePath);
  await rm(path.dirname(target), { recursive: true, force: true });
}
