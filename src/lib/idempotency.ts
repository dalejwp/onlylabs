import { NextRequest, NextResponse } from 'next/server';
import { createHash }                from 'crypto';
import { prisma }                    from '@/lib/db';
import { idempotencyHitsTotal, idempotencyMissesTotal } from '@/lib/metrics';

const TTL_MS = 24 * 60 * 60 * 1000;

export type IdempotentHandler = (req: NextRequest) => Promise<NextResponse>;

export async function withIdempotency(
  req: NextRequest,
  handler: IdempotentHandler,
): Promise<NextResponse> {
  const key = req.headers.get('idempotency-key');
  if (!key) return handler(req);

  const existing = await prisma.idempotencyRecord.findUnique({ where: { key } });

  if (existing) {
    if (new Date() < new Date(existing.expiresAt)) {
      idempotencyHitsTotal.inc();
      const cachedBody = JSON.parse(existing.body);
      return NextResponse.json(cachedBody, {
        status: existing.status,
        headers: { 'X-Idempotency-Replayed': 'true' },
      });
    }
    await prisma.idempotencyRecord.delete({ where: { key } }).catch(() => {});
  }

  idempotencyMissesTotal.inc();
  const response = await handler(req);

  try {
    const responseBody = await response.clone().json().catch(() => ({}));
    await prisma.idempotencyRecord.create({
      data: {
        key,
        status:    response.status,
        body:      JSON.stringify(responseBody),
        expiresAt: new Date(Date.now() + TTL_MS),
      },
    });
  } catch (err) {
    if (!String(err).includes('Unique') && !String(err).includes('unique')) {
      console.error('[idempotency] store error:', err);
    }
  }

  return response;
}

export function makeIdempotencyKey(
  prefix: string,
  content: string,
  slotMs = 5 * 60 * 1000,
): string {
  const slot = Math.floor(Date.now() / slotMs);
  return createHash('sha256')
    .update(`${prefix}:${slot}:${content}`)
    .digest('hex')
    .slice(0, 40);
}
