import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { saveWebPFile } from '@/lib/fileStorage';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = req.headers.get('content-type') || '';
    let buffer: Buffer | null = null;
    let kind = 'CUS';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      kind = (formData.get('kind') as string) || 'CUS';

      if (!file) {
        return NextResponse.json({ ok: false, error: 'No file provided in form data' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if (contentType.includes('application/json')) {
      const body = await req.json();
      kind = body.kind || 'CUS';

      if (body.base64) {
        const base64Data = body.base64.replace(/^data:image\/\w+;base64,/, '');
        buffer = Buffer.from(base64Data, 'base64');
      }
    }

    if (!buffer || buffer.length === 0) {
      return NextResponse.json({ ok: false, error: 'Invalid or empty image payload' }, { status: 400 });
    }

    const fileResult = await saveWebPFile({
      buffer,
      kindPrefix: kind,
      mimeType: 'image/webp',
      userId: user.id,
    });

    return NextResponse.json({
      ok: true,
      data: fileResult,
    });
  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Upload failed' }, { status: 500 });
  }
}
