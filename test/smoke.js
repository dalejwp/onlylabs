#!/usr/bin/env node
'use strict';

const BASE   = process.env.SMOKE_BASE_URL   || 'http://localhost:3000';
const COOKIE = process.env.SMOKE_AUTH_COOKIE || '';

let passed = 0, failed = 0;

function ok(msg)         { console.log('  PASS  ' + msg); passed++; }
function fail(msg, detail) {
  console.error('  FAIL  ' + msg);
  if (detail) console.error('         ' + detail);
  failed++;
}

async function get(path, headers = {}) {
  return fetch(BASE + path, { headers: { Cookie: COOKIE, ...headers } });
}

async function runTests() {
  console.log('\nSmoke tests -> ' + BASE + '\n');

  // 1. Health
  try {
    const r = await get('/_health');
    const b = await r.json();
    if (r.status === 200 && b.ok) ok('GET /_health -> 200');
    else fail('GET /_health', 'status=' + r.status + ' body=' + JSON.stringify(b));
  } catch (e) { fail('GET /_health', e.message); }

  // 2. Status
  try {
    const r = await get('/api/status');
    const b = await r.json();
    if (r.status === 200 && b.ok && typeof b.tasks === 'object')
      ok('GET /api/status -> 200 tasks present');
    else fail('GET /api/status', 'status=' + r.status);
  } catch (e) { fail('GET /api/status', e.message); }

  // 3. Unauthenticated root redirects
  try {
    const r = await fetch(BASE + '/', { redirect: 'manual' });
    if ([200, 302, 307].includes(r.status)) ok('GET / -> ' + r.status + ' (unauthenticated)');
    else fail('GET /', 'unexpected status=' + r.status);
  } catch (e) { fail('GET /', e.message); }

  // 4. Tasks (auth)
  if (COOKIE) {
    try {
      const r = await get('/api/tasks');
      const b = await r.json();
      if (r.status === 200 && b.ok && Array.isArray(b.tasks))
        ok('GET /api/tasks -> 200 tasks array (authenticated)');
      else fail('GET /api/tasks', 'status=' + r.status);
    } catch (e) { fail('GET /api/tasks', e.message); }
  } else {
    console.log('  SKIP  GET /api/tasks (no SMOKE_AUTH_COOKIE)');
  }

  console.log('\nSmoke: ' + passed + ' passed, ' + failed + ' failed\n');
  if (failed > 0) process.exit(1);
}

runTests().catch(err => { console.error('Smoke crashed:', err); process.exit(2); });
