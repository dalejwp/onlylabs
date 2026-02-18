import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db';
import { jobsEnqueuedTotal, http5xxTotal } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

const ARTIFACT_DIR = process.env.ARTIFACT_DIR
  ? path.resolve(process.env.ARTIFACT_DIR)
  : path.join(process.cwd(), 'data', 'artifacts');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let artifactId: string | undefined = body.artifactId;

    if (!artifactId && body.content) {
      console.warn(
        '[run-from-artifact] DEPRECATED: raw `content` field received. ' +
        'Please migrate to uploading an artifact via POST /api/artifacts first.',
      );
      await fs.mkdir(ARTIFACT_DIR, { recursive: true });
      const { randomUUID } = await import('crypto');
      artifactId = randomUUID();
      const filename = `${artifactId}.txt`;
      await fs.writeFile(path.join(ARTIFACT_DIR, filename), String(body.content));
      const meta = { artifactId, filename, originalName: 'paste.txt', mimeType: 'text/plain', size: Buffer.byteLength(body.content), uploadedAt: new Date().toISOString() };
      await fs.writeFile(path.join(ARTIFACT_DIR, filename + '.meta.json'), JSON.stringify(meta));
    }

    if (!artifactId) {
      return NextResponse.json({ error: 'artifactId is required' }, { status: 400 });
    }
    if (!/^[0-9a-f-]{36}$/.test(artifactId)) {
      return NextResponse.json({ error: 'invalid artifactId' }, { status: 400 });
    }

    const metaPath = (await fs.readdir(ARTIFACT_DIR).catch(() => []))
      .find(f => f.startsWith(artifactId!) && f.endsWith('.meta.json'));
    if (!metaPath) {
      return NextResponse.json({ error: 'artifact not found' }, { status: 404 });
    }

    const job = await (prisma as any).job.create({
      data: {
        jobType: 'run-from-artifact',
        payload: JSON.stringify({ artifactId, meta: body.meta ?? {} }),
        status: 'pending',
        idempotencyKey: `rfa:${artifactId}`,
      },
    });

    jobsEnqueuedTotal.inc({ job_type: 'run-from-artifact' });

    return NextResponse.json({ ok: true, jobId: job.id, artifactId });
  } catch (err) {
    http5xxTotal.inc({ route: '/api/run-from-artifact' });
    console.error('[run-from-artifact] error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
