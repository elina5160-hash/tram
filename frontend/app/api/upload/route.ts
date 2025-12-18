import { NextResponse } from 'next/server';
import fs from 'fs';
import { writeFile } from 'fs/promises';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize filename
    const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uploadDir = '/tmp/uploads';

    // Ensure dir exists
    try { fs.mkdirSync(uploadDir, { recursive: true }); } catch {}

    const filepath = `${uploadDir}/${filename}`;
    await writeFile(filepath, buffer);

    return NextResponse.json({ path: filepath });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
