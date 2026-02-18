import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Verify DB is reachable via a lightweight query
    await prisma.task.count();
    return NextResponse.json({ ok: true, time: new Date().toISOString() });
  } catch (err) {
    console.error('[health] DB check failed:', err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 503 },
    );
  }
}
