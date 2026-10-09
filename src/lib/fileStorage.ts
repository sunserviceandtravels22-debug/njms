import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { db } from '@/server/db';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

export async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

function getFormattedDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

export interface SaveFileOptions {
  buffer: Buffer;
  kindPrefix?: string;
  mimeType?: string;
  userId: string;
}

export async function saveWebPFile({
  buffer,
  kindPrefix = 'CUS',
  mimeType = 'image/webp',
  userId,
}: SaveFileOptions) {
  await ensureUploadDir();

  const hashSum = crypto.createHash('sha256');
  hashSum.update(buffer);
  const sha256Full = hashSum.digest('hex');
  const sha256Prefix12 = sha256Full.substring(0, 12);

  const dateStr = getFormattedDate();
  const uniqueId = crypto.randomBytes(8).toString('hex');
  const cleanPrefix = kindPrefix.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4) || 'FILE';

  const filename = `${cleanPrefix}_${dateStr}_${sha256Prefix12}_${uniqueId}.webp`;
  const filePath = path.join(UPLOAD_DIR, filename);

  await fs.writeFile(filePath, buffer);

  const fileRecord = await db.file.create({
    data: {
      kind: cleanPrefix,
      storageKey: filename,
      mime: mimeType,
      sizeBytes: buffer.length,
      sha256: sha256Full,
      createdById: userId,
    },
  });

  return {
    id: fileRecord.id,
    filename,
    url: `/api/v1/files/${filename}`,
    sizeBytes: buffer.length,
    sha256: sha256Full,
  };
}

export async function getFileBuffer(filename: string): Promise<Buffer | null> {
  const safeFilename = path.basename(filename);
  const filePath = path.join(UPLOAD_DIR, safeFilename);

  try {
    return await fs.readFile(filePath);
  } catch (err) {
    return null;
  }
}
