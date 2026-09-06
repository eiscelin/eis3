'use strict';
const fs = require('fs');
const path = require('path');

/* Use Vercel KV when the env var is present (Vercel production).
   Otherwise fall back to a local JSON file (docker compose dev). */
const useKv = !!process.env.KV_REST_API_URL;
const DB_FILE = path.join(__dirname, '..', 'data.json');

let _kv = null;
async function getKv() {
  if (!_kv) {
    const mod = require('@vercel/kv');
    _kv = mod.kv;
  }
  return _kv;
}

function readDb() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch (e) { return { users: {}, data: {} }; }
}

function writeDb(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

async function getUser(username) {
  if (useKv) { const kv = await getKv(); return kv.get('user:' + username); }
  const db = readDb();
  return db.users[username] || null;
}

async function setUser(username, passwordHash) {
  if (useKv) { const kv = await getKv(); return kv.set('user:' + username, { password: passwordHash }); }
  const db = readDb();
  db.users[username] = { password: passwordHash };
  writeDb(db);
}

async function getData(username) {
  if (useKv) { const kv = await getKv(); return kv.get('data:' + username); }
  const db = readDb();
  return db.data[username] || null;
}

async function setData(username, data) {
  if (useKv) { const kv = await getKv(); return kv.set('data:' + username, data); }
  const db = readDb();
  db.data[username] = data;
  writeDb(db);
}

module.exports = { getUser, setUser, getData, setData };
