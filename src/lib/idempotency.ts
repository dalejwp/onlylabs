/**
 * Idempotency helper for Mission Control API routes.
 *
 * Usage:
 *   export async function POST(req: NextRequest) {
 *     return withIdempotency(req, async (r) => {
 *       // your handler
 *     });
 *   }
 *
 * The client must send `Idempotency-Key: <uuid>` header.
 * Duplicate requests within TTL return the cached response.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createHash }                from 'crypto';
import { prisma }                    from '@/lib/db';

/** 24-hour TTL for idempotency records */
const TTL_MS = 24 * 60 * 60 * 1000;

export type IdempotentHandler = (req: NextRequest) => Promise<NextResponse>;

export async function withIdempotency(
  req: NextRequest,
  handler: IdempotentHandler,
): Promise<NextResponse> {
  const key = req.headers.get('idempotency-key');
  if (!key) return handler(req);

  // Check for existing (non-expired) record
  const existing = await (prisma as any).idempotencyRecord.findUnique({ where: { key } });

  if (existing) {
    if (new Date() < new Date(existing.expiresAt)) {
      // Return cached response
      const cachedBody = JSON.parse(existing.body);
      return NextResponse.json(cachedBody, {
        status: existing.status,
        headers: { 'X-Idempotency-Replayed': 'true' },
      });
    }
    // Expired — delete and proceed
    await (prisma as any).idempotencyRecord.delete({ where: { key } }).catch(() => {});
  }

  const response = await handler(req);

  // Store result (best-effort — don't fail the request if storage fails)
  try {
    const responseBody = await response.clone().json().catch(() => ({}));
    await (prisma as any).idempotencyRecord.create({
      data: {
        key,
        status:    response.status,
        body:      JSON.stringify(responseBody),
        expiresAt: new Date(Date.now() + TTL_MS),
      },
    });
  } catch (err) {
    // Ignore unique constraint races; log other errors
    if (!String(err).includes('Unique') && !String(err).includes('unique')) {
      console.error('[idempotency] store error:', err);
    }
  }

  return response;
}

/**
 * Derive a deterministic idempotency key from content + an optional time slot.
 * Use for external calls (email, Telegram, Apify) to prevent duplicates on retry.
 *
 * @param prefix  - e.g. 'email', 'telegram', 'apify-job'
 * @param content - the content being sent (stringified)
 * @param slotMs  - time slot in ms (default 5 min); two calls within the same slot share the key
 */
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
