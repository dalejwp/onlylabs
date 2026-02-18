#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ROOT = path.resolve(__dirname, '..');

const REQUIRED_ENV = [
  'DATABASE_URL',
  'NODE_ENV',
  'MC_ADMIN_EMAIL',
  'MC_ADMIN_PASSWORD',
  'MC_AUTH_SECRET',
];

let passed = 0, failed = 0;

function ok(msg)         { console.log('  OK  ' + msg); passed++; }
function fail(msg, hint) {
  console.error('  FAIL  ' + msg);
  if (hint) console.error('        -> ' + hint);
  failed++;
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function checkNodeVersion() {
  console.log('\n[1/5] Node version');
  const current  = process.versions.node;
  const pkg      = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const required = pkg.engines?.node;
  if (!required) { ok('Node ' + current + ' (no engines constraint)'); return; }
  const major         = parseInt(current.split('.')[0], 10);
  const requiredMajor = parseInt(required.replace(/[^0-9].*/, ''), 10);
  if (major >= requiredMajor) ok('Node ' + current + ' satisfies ' + required);
  else fail('Node ' + current + ' does not satisfy ' + required, 'Install Node ' + requiredMajor + '+');
}

function checkEnvVars() {
  console.log('\n[2/5] Required environment variables');
  for (const key of REQUIRED_ENV) {
    if (process.env[key]) ok(key + ' is set');
    else fail(key + ' is missing', 'Set in .env or: export ' + key + '=<value>');
  }
}

function checkPrismaClient() {
  console.log('\n[3/5] Prisma client');
  const clientDir = path.join(ROOT, 'node_modules', '.prisma', 'client');
  if (fs.existsSync(clientDir)) ok('Prisma client exists (.prisma/client)');
  else fail('Prisma client not found', 'Run: npx prisma generate --schema=./prisma/schema.prisma');
}

async function checkDatabase() {
  console.log('\n[4/5] Database connectivity (SQLite)');
  const url = process.env.DATABASE_URL || '';
  if (!url) { fail('DATABASE_URL not set'); return; }

  const filePath = url.replace(/^file:/, '');
  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(ROOT, filePath);

  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); }
    catch (e) { fail('Cannot create DB dir: ' + e.message); return; }
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const Database = require('better-sqlite3');
      const db  = new Database(resolved);
      const row = db.prepare('SELECT 1 AS v').get();
      db.close();
      if (row?.v === 1) { ok('SQLite reachable at ' + resolved); return; }
      fail('Unexpected result from SELECT 1'); return;
    } catch (err) {
      if (attempt < 3) {
        console.log('    Attempt ' + attempt + '/3: ' + err.message + ' - retrying in 2s...');
        await sleep(2000);
      } else {
        fail('Cannot open SQLite at ' + resolved + ': ' + err.message,
          'Check DATABASE_URL and directory permissions');
      }
    }
  }
}

function checkMigrations() {
  console.log('\n[5/5] Prisma migration status');
  try {
    const out = execSync(
      'npx prisma migrate status --schema=./prisma/schema.prisma 2>&1',
      { cwd: ROOT, encoding: 'utf8', timeout: 30000 }
    );
    if (out.includes('up to date') || out.includes('Database schema is up to date')) {
      ok('All migrations applied');
    } else if (out.includes('not yet been applied') || out.includes('following migration')) {
      fail('Pending migrations detected', 'Run: npx prisma migrate deploy --schema=./prisma/schema.prisma');
    } else {
      ok('Migration check complete');
    }
  } catch (err) {
    fail('Migration status failed: ' + err.message,
      'Run: npx prisma migrate deploy --schema=./prisma/schema.prisma');
  }
}

async function main() {
  console.log('============================================');
  console.log('  Mission Control - Preflight Check');
  console.log('============================================');

  checkNodeVersion();
  checkEnvVars();
  checkPrismaClient();
  await checkDatabase();
  checkMigrations();

  console.log('\n--------------------------------------------');
  console.log('Preflight: ' + passed + ' passed, ' + failed + ' failed');

  if (failed > 0) {
    console.error('\nPreflight FAILED - fix the issues above before starting.\n');
    process.exit(1);
  }
  console.log('\nPreflight PASSED - ready to start.\n');
  process.exit(0);
}

main().catch(err => { console.error('Preflight crashed:', err); process.exit(2); });
