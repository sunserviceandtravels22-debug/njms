// Implements: Doc 14 §12 (Storage abstraction for persistent uploads)
import fs from 'fs';
import path from 'path';

export function getUploadDir(): string {
  const dir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      console.error(`[storage] Could not create UPLOAD_DIR at ${dir}:`, e);
    }
  }
  return dir;
}

export async function saveFile(filename: string, buffer: Buffer): Promise<string> {
  const uploadDir = getUploadDir();
  const safeFilename = path.basename(filename);
  const targetPath = path.join(uploadDir, safeFilename);
  await fs.promises.writeFile(targetPath, buffer);
  return safeFilename;
}

export async function getFile(filename: string): Promise<Buffer | null> {
  const uploadDir = getUploadDir();
  const safeFilename = path.basename(filename);
  const targetPath = path.join(uploadDir, safeFilename);
  if (!fs.existsSync(targetPath)) return null;
  return fs.promises.readFile(targetPath);
}

export async function deleteFile(filename: string): Promise<boolean> {
  const uploadDir = getUploadDir();
  const safeFilename = path.basename(filename);
  const targetPath = path.join(uploadDir, safeFilename);
  if (!fs.existsSync(targetPath)) return false;
  await fs.promises.unlink(targetPath);
  return true;
}

export async function checkStorageHealth(): Promise<{ ok: boolean; path: string; writable: boolean; error?: string }> {
  const uploadDir = getUploadDir();
  const testFile = path.join(uploadDir, `.health-probe-${Date.now()}.tmp`);
  try {
    await fs.promises.writeFile(testFile, 'njms-storage-probe-ok');
    const read = await fs.promises.readFile(testFile, 'utf8');
    await fs.promises.unlink(testFile);
    return { ok: read === 'njms-storage-probe-ok', path: uploadDir, writable: true };
  } catch (error: any) {
    return { ok: false, path: uploadDir, writable: false, error: error.message };
  }
}
