'use strict';
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const store = require('./lib/store');

/* Verify Supabase connectivity on startup (non-blocking) */
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  store.initSupabase().then(function () {
    console.log('Supabase: connected, table "app_data" is accessible.');
  }).catch(function (e) {
    console.error('Supabase: ' + e.message);
  });
}

const app = express();
app.use(express.json({ limit: '2mb' }));

/* CORS — same-origin locally and on Vercel, but harmless */
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

/* ---------- password helpers (built-in crypto, no deps) ---------- */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + hash;
}
function verifyPassword(password, stored) {
  const sep = stored.indexOf(':');
  if (sep < 0) return false;
  const salt = stored.slice(0, sep);
  const hash = stored.slice(sep + 1);
  const verify = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(verify));
}

/* ---------- auth routes ---------- */
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password || password.length < 4) {
      return res.json({ ok: false, error: 'Username and password (min 4 characters) are required.' });
    }
    const existing = await store.getUser(username);
    if (existing) {
      return res.json({ ok: false, error: 'That username is already taken. Try another.' });
    }
    await store.setUser(username, hashPassword(password));
    res.json({ ok: true, user: username });
  } catch (e) {
    console.error('signup error', e);
    res.json({ ok: false, error: 'Server error. Please try again.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.json({ ok: false, error: 'Username and password are required.' });
    }
    const record = await store.getUser(username);
    if (!record) {
      return res.json({ ok: false, error: 'No account found for that username.' });
    }
    if (!verifyPassword(password, record.password)) {
      return res.json({ ok: false, error: 'Incorrect password. Please try again.' });
    }
    res.json({ ok: true, user: username });
  } catch (e) {
    console.error('login error', e);
    res.json({ ok: false, error: 'Server error. Please try again.' });
  }
});

/* ---------- data routes ---------- */
app.get('/api/data/:username', async (req, res) => {
  try {
    const data = await store.getData(req.params.username);
    res.json({ ok: true, data: data || null });
  } catch (e) {
    console.error('get data error', e);
    res.json({ ok: false, data: null });
  }
});

app.put('/api/data/:username', async (req, res) => {
  try {
    await store.setData(req.params.username, req.body);
    res.json({ ok: true });
  } catch (e) {
    console.error('set data error', e);
    res.json({ ok: false });
  }
});

/* ---------- static files (local dev only; Vercel serves via CDN) ---------- */
app.use(express.static(path.join(__dirname)));

module.exports = app;

/* Start the server only when run directly (not when imported by Vercel) */
if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log('Chookee server running on port ' + port);
  });
}
