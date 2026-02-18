#!/usr/bin/env node
/**
 * Smoke tests for Mission Control.
 *
 * Usage:
 *   SMOKE_BASE_URL=https://mc.aionlylabs.online node test/smoke.js
 *   SMOKE_BASE_URL=https://mc.aionlylabs.online SMOKE_AUTH_COOKIE="mc_session=<token>" node test/smoke.js
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

// Fetch with auth cookie
async function get(path) {
  const headers = {};
  if (AUTH_COOKIE) headers['Cookie'] = AUTH_COOKIE;
  return fetch(`${BASE_URL}${path}`, { headers, redirect: 'manual' });
}

// Fetch without auth cookie (always unauthenticated)
async function getAnon(path) {
  return fetch(`${BASE_URL}${path}`, { redirect: 'manual' });
}

(async () => {
  console.log(`\nSmoke tests → ${BASE_URL}\n`);

  await test('GET /api/health → 200 { ok: true }', async () => {
    const res = await getAnon('/api/health');
    assert(res.status === 200, `status ${res.status}`);
    const body = await res.json();
    assert(body.ok === true, `body.ok=${body.ok}`);
  });

  await test('GET /api/status unauthenticated → 307 redirect to /login', async () => {
    const res = await getAnon('/api/status');
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
    const res = await getAnon('/');
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

    await test('GET /api/status → 200 (authenticated)', async () => {
      const res = await get('/api/status');
      assert(res.status === 200, `status ${res.status}`);
    });
  } else {
    console.log('  SKIP  GET /api/tasks (no SMOKE_AUTH_COOKIE set)');
    console.log('  SKIP  GET /api/status authenticated (no SMOKE_AUTH_COOKIE set)');
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
})();
