import { NextResponse } from 'next/server';
import { registry } from '@/lib/metrics';

export const dynamic = 'force-dynamic';

// Port 3000 is localhost-only (behind nginx), so no token is required.
// Set METRICS_TOKEN env var to enable bearer-token auth if you expose this externally.
export async function GET(req: Request) {
  const token = process.env.METRICS_TOKEN;
  if (token) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${token}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }

  const body = await registry.metrics();
  return new NextResponse(body, {
    headers: { 'Content-Type': registry.contentType },
  });
}
