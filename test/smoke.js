#!/usr/bin/env node
/**
 * Smoke tests for Mission Control.
 * Run after deploy to verify the app is healthy.
 *
 * Usage:
 *   SMOKE_BASE_URL=https://mc.aionlylabs.online node test/smoke.js
 *   SMOKE_BASE_URL=http://localhost:3000 SMOKE_AUTH_COOKIE="mc_session=<token>" node test/smoke.js
 */

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:3000';
const AUTH_COOKIE = process.env.SMOKE_AUTH_COOKIE || '';

let passed = 0, failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL  ${name}: ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function get(path, opts = {}) {
  const headers = { ...opts.headers };
  if (AUTH_COOKIE) headers['Cookie'] = AUTH_COOKIE;
  const res = await fetch(`${BASE_URL}${path}`, { headers, redirect: 'manual' });
  return res;
}

(async () => {
  console.log(`\nSmoke tests → ${BASE_URL}\n`);

  await test('GET /api/health → 200 { ok: true }', async () => {
    const res = await get('/api/health');
    assert(res.status === 200, `status ${res.status}`);
    const body = await res.json();
    assert(body.ok === true, `body.ok=${body.ok}`);
  });

  await test('GET /api/status unauthenticated → redirect to /login', async () => {
    const res = await get('/api/status');
    // Next.js middleware uses 307; also accept 302, 308, 401
    assert(
      [302, 307, 308, 401].includes(res.status),
      `expected redirect or 401, got ${res.status}`,
    );
    if (res.status !== 401) {
      const loc = res.headers.get('location') || '';
      assert(loc.includes('/login'), `expected /login redirect, got location: ${loc}`);
    }
  });

  await test('GET / unauthenticated → redirect to /login', async () => {
    const res = await fetch(`${BASE_URL}/`, { redirect: 'manual' });
    assert(
      [302, 307, 308].includes(res.status),
      `expected redirect, got ${res.status}`,
    );
    const loc = res.headers.get('location') || '';
    assert(loc.includes('/login'), `expected /login redirect, got ${loc}`);
  });

  if (AUTH_COOKIE) {
    await test('GET /api/tasks → 200 (authenticated)', async () => {
      const res = await get('/api/tasks');
      assert(res.status === 200, `status ${res.status}`);
    });
  } else {
    console.log('  SKIP  GET /api/tasks (no SMOKE_AUTH_COOKIE set)');
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
})();
