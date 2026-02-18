import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

// Local filesystem artifact store.
// Swap write/read for S3Client calls when S3_ENDPOINT + S3_KEY + S3_SECRET + S3_BUCKET are set.
const ARTIFACT_DIR = process.env.ARTIFACT_DIR
  ? path.resolve(process.env.ARTIFACT_DIR)
  : path.join(process.cwd(), 'data', 'artifacts');

export const dynamic = 'force-dynamic';

/** POST /api/artifacts
 *  Body: multipart/form-data with `file` field.
 *  Returns: { ok, artifactId, filename, size, mimeType }
 */
export async function POST(req: NextRequest) {
  try {
    await fs.mkdir(ARTIFACT_DIR, { recursive: true });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'file field is required' }, { status: 400 });
    }
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'file exceeds 50 MB limit' }, { status: 413 });
    }

    const artifactId = randomUUID();
    const ext        = file.name.split('.').pop() ?? 'bin';
    const filename   = `${artifactId}.${ext}`;
    const filepath   = path.join(ARTIFACT_DIR, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filepath, buffer);

    // Store metadata alongside the file
    const meta = { artifactId, filename, originalName: file.name, mimeType: file.type, size: buffer.length, uploadedAt: new Date().toISOString() };
    await fs.writeFile(filepath + '.meta.json', JSON.stringify(meta, null, 2));

    return NextResponse.json({ ok: true, ...meta });
  } catch (err) {
    console.error('[artifacts] upload failed:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

/** GET /api/artifacts?id=<artifactId>
 *  Returns artifact metadata.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param required' }, { status: 400 });

  // Sanitise: only allow UUID-like ids
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  try {
    const metaFiles = await fs.readdir(ARTIFACT_DIR);
    const metaFile  = metaFiles.find(f => f.startsWith(id) && f.endsWith('.meta.json'));
    if (!metaFile) return NextResponse.json({ error: 'artifact not found' }, { status: 404 });

    const meta = JSON.parse(await fs.readFile(path.join(ARTIFACT_DIR, metaFile), 'utf8'));
    return NextResponse.json({ ok: true, ...meta });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
