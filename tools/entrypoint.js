#!/usr/bin/env node
'use strict';

const { spawnSync, spawn } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

console.log('[entrypoint] Running preflight checks...');

const preflight = spawnSync('node', [path.join(__dirname, 'preflight.js')], {
  stdio: 'inherit',
  cwd: ROOT,
  env: process.env,
});

if (preflight.status !== 0) {
  console.error('[entrypoint] Preflight failed - aborting startup.');
  process.exit(preflight.status ?? 1);
}

console.log('[entrypoint] Starting Mission Control...');

const app = spawn('npm', ['start'], {
  stdio: 'inherit',
  cwd: ROOT,
  env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? 'production' },
});

app.on('exit',  (code) => process.exit(code ?? 0));
app.on('error', (err)  => { console.error('[entrypoint] Start failed:', err); process.exit(1); });
