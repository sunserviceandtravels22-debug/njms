import { NextRequest, NextResponse } from 'next/server';
import { getFileBuffer } from '@/lib/fileStorage';

export async function GET(
  req: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params;
    if (!filename || filename.includes('..')) {
      return NextResponse.json({ ok: false, error: 'Invalid filename' }, { status: 400 });
    }

    const fileBuffer = await getFileBuffer(filename);
    if (!fileBuffer) {
      return NextResponse.json({ ok: false, error: 'File not found' }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: 'Failed to retrieve file' }, { status: 500 });
  }
}
