'use strict';
const fs = require('fs');
const path = require('path');

/* Storage priority:
   1. Supabase Storage (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) — production
   2. Vercel KV (KV_REST_API_URL) — fallback
   3. Local JSON file — development */

const SB_URL = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const SB_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const useSupabase = !!(SB_URL && SB_KEY);
const useKv = !useSupabase && !!process.env.KV_REST_API_URL;
const DB_FILE = path.join(__dirname, '..', 'data.json');
const BUCKET = 'app_data';

/* ---------- Supabase Storage API (bucket as key-value store) ---------- */
function sbHeaders(extra) {
  const h = {
    Authorization: 'Bearer ' + SB_KEY,
    apikey: SB_KEY
  };
  return Object.assign(h, extra || {});
}

let _bucketReady = false;
async function initSupabase() {
  if (!useSupabase || _bucketReady) return;
  const res = await fetch(SB_URL + '/storage/v1/bucket', {
    method: 'POST',
    headers: sbHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name: BUCKET, public: false })
  });
  if (res.ok || res.status === 409) { _bucketReady = true; return; }
  const body = await res.text().catch(function () { return ''; });
  throw new Error('cannot create storage bucket "' + BUCKET + '" (HTTP ' + res.status + '). ' +
    'Make sure SUPABASE_SERVICE_ROLE_KEY is the SECRET key (starts with sb_secret_), not the publishable one (sb_publishable_). ' + body.slice(0, 120));
}

async function sbGet(keyPath) {
  const res = await fetch(SB_URL + '/storage/v1/object/' + BUCKET + '/' + keyPath, {
    headers: sbHeaders()
  });
  if (res.status === 404 || res.status === 400) return null; /* not found / bucket missing */
  if (!res.ok) {
    console.error('Supabase GET failed (' + res.status + ') for: ' + keyPath);
    return null;
  }
  const text = await res.text();
  try { return JSON.parse(text); } catch (e) { return null; }
}

async function sbSet(keyPath, value) {
  await initSupabase();
  const res = await fetch(SB_URL + '/storage/v1/object/' + BUCKET + '/' + keyPath, {
    method: 'POST',
    headers: sbHeaders({ 'Content-Type': 'application/json', 'x-upsert': 'true' }),
    body: JSON.stringify(value)
  });
  if (!res.ok) {
    const body = await res.text().catch(function () { return ''; });
    throw new Error('Supabase write failed (' + res.status + '): ' + body.slice(0, 200));
  }
}

/* ---------- Vercel KV ---------- */
let _kv = null;
async function getKv() {
  if (!_kv) {
    const mod = require('@vercel/kv');
    _kv = mod.kv;
  }
  return _kv;
}

/* ---------- Local JSON file ---------- */
function readDb() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch (e) { return { users: {}, data: {} }; }
}

function writeDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

/* ---------- Public API ---------- */
async function getUser(username) {
  if (useSupabase) return sbGet('users/' + encodeURIComponent(username));
  if (useKv) { const kv = await getKv(); return kv.get('user:' + username); }
  const db = readDb();
  return db.users[username] || null;
}

async function setUser(username, passwordHash) {
  if (useSupabase) return sbSet('users/' + encodeURIComponent(username), { password: passwordHash });
  if (useKv) { const kv = await getKv(); return kv.set('user:' + username, { password: passwordHash }); }
  const db = readDb();
  db.users[username] = { password: passwordHash };
  writeDb(db);
}

async function getData(username) {
  if (useSupabase) return sbGet('data/' + encodeURIComponent(username));
  if (useKv) { const kv = await getKv(); return kv.get('data:' + username); }
  const db = readDb();
  return db.data[username] || null;
}

async function setData(username, data) {
  if (useSupabase) return sbSet('data/' + encodeURIComponent(username), data);
  if (useKv) { const kv = await getKv(); return kv.set('data:' + username, data); }
  const db = readDb();
  db.data[username] = data;
  writeDb(db);
}

module.exports = { getUser, setUser, getData, setData, initSupabase };
