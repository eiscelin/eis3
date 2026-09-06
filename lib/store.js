'use strict';
const fs = require('fs');
const path = require('path');

/* Storage priority:
   1. Supabase PostgREST (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) — production
   2. Vercel KV (KV_REST_API_URL) — fallback
   3. Local JSON file — development */

const SB_URL = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const SB_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const useSupabase = !!(SB_URL && SB_KEY);
const useKv = !useSupabase && !!process.env.KV_REST_API_URL;
const DB_FILE = path.join(__dirname, '..', 'data.json');

/* ---------- Supabase (PostgREST key-value table) ---------- */
function sbHeaders(extra) {
  const h = {
    apikey: SB_KEY,
    Authorization: 'Bearer ' + SB_KEY,
    'Content-Type': 'application/json'
  };
  return Object.assign(h, extra || {});
}

async function sbGet(key) {
  const url = SB_URL + '/rest/v1/app_data?key=eq.' + encodeURIComponent(key) + '&select=value';
  const res = await fetch(url, { headers: sbHeaders() });
  if (!res.ok) {
    console.error('Supabase GET failed (' + res.status + ') for key: ' + key);
    return null;
  }
  const rows = await res.json();
  return rows.length ? rows[0].value : null;
}

async function sbSet(key, value) {
  const res = await fetch(SB_URL + '/rest/v1/app_data', {
    method: 'POST',
    headers: sbHeaders({ Prefer: 'resolution=merge-duplicates' }),
    body: JSON.stringify({ key: key, value: value })
  });
  if (!res.ok) {
    const body = await res.text().catch(function () { return ''; });
    throw new Error('Supabase write failed (' + res.status + '): ' + body.slice(0, 200));
  }
}

async function initSupabase() {
  if (!useSupabase) return;
  const res = await fetch(SB_URL + '/rest/v1/app_data?select=key&limit=1', { headers: sbHeaders() });
  if (res.ok) return;
  const body = await res.text().catch(function () { return ''; });
  throw new Error('table "app_data" not accessible (HTTP ' + res.status + '). ' +
    'Run the setup SQL in the Supabase SQL Editor (CREATE TABLE app_data ...). ' + body.slice(0, 120));
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
  if (useSupabase) return sbGet('user:' + username);
  if (useKv) { const kv = await getKv(); return kv.get('user:' + username); }
  const db = readDb();
  return db.users[username] || null;
}

async function setUser(username, passwordHash) {
  if (useSupabase) return sbSet('user:' + username, { password: passwordHash });
  if (useKv) { const kv = await getKv(); return kv.set('user:' + username, { password: passwordHash }); }
  const db = readDb();
  db.users[username] = { password: passwordHash };
  writeDb(db);
}

async function getData(username) {
  if (useSupabase) return sbGet('data:' + username);
  if (useKv) { const kv = await getKv(); return kv.get('data:' + username); }
  const db = readDb();
  return db.data[username] || null;
}

async function setData(username, data) {
  if (useSupabase) return sbSet('data:' + username, data);
  if (useKv) { const kv = await getKv(); return kv.set('data:' + username, data); }
  const db = readDb();
  db.data[username] = data;
  writeDb(db);
}

module.exports = { getUser, setUser, getData, setData, initSupabase };
