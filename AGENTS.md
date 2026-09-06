# Base44 Setup Notes

## Project
Static marketing page + franchisee dashboard for Chookee Inasal. Frontend is vanilla JS (`index.html`, `auth.js`, `dashboard.js`). A small Express backend (`server.js` + `lib/store.js`) provides shared auth and data storage so accounts and dashboard data sync across devices.

## Running
- `docker compose -f docker-compose.base44.yml up -d`
- `node:22-slim` runs `server.js` (Express) on host port 3000.
- Express serves the static files AND the `/api/*` routes. Nodemon watches `server.js` and `lib/` for live reload.
- Source is bind-mounted; edits to `auth.js`/`dashboard.js` appear on browser refresh (call `reload_preview` after backend changes).

## Architecture
- **Auth**: `POST /api/auth/signup` and `POST /api/auth/login` — passwords are hashed with Node's built-in `crypto.scryptSync`. Session (username only) is stored in `localStorage` on the client.
- **Data**: `GET /api/data/:username` and `PUT /api/data/:username` — dashboard data (profile, orders, sales) is stored server-side.
- **Storage**: `lib/store.js` uses a local JSON file (`data.json`, gitignored) in dev. On Vercel it uses `@vercel/kv` (Redis) when `KV_REST_API_URL` is set.
- `auth.js` dispatches a `chookee:session` window event on login/logout; `dashboard.js` listens to it to mount/unmount the dashboard. Marketing page sections are hidden via `body.dash-mode` CSS.

## Supabase (primary production storage)
- Secrets: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (from Supabase dashboard → Settings → API; both publishable `sb_publishable_…` and secret `sb_secret_…` keys work because the RLS policy allows anon). Delivered via `/run/base44/app.env` (wired in compose as `env_file`).
- `lib/store.js` uses the Supabase PostgREST API against an `app_data` table (key-value with JSONB). Priority: Supabase → Vercel KV → local JSON file.
- Required SQL (run once in Supabase SQL Editor — safe to re-run):
  ```sql
  CREATE TABLE IF NOT EXISTS app_data (
    key TEXT PRIMARY KEY,
    value JSONB
  );
  ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS "app_data_full_access" ON app_data;
  CREATE POLICY "app_data_full_access" ON app_data
    FOR ALL TO anon, authenticated
    USING (true) WITH CHECK (true);
  ```
- The permissive policy is what makes the publishable key work; the app's API is the only consumer of the key (it lives server-side, never in the browser).
- Server logs a startup check: `Supabase: connected, table "app_data" is accessible.` — an error means the SQL hasn't been run yet.

## Vercel deployment
- `api/[[...slug]].js` is a catch-all serverless function that delegates to the Express app in `server.js`.
- Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the Vercel project env vars.
- Supabase has replaced the need for Vercel KV (which is deprecated); the KV code path remains only as a fallback.

## Verification
- `curl -sf http://localhost:3000/` returns the HTML page.
- `curl -sf -X POST http://localhost:3000/api/auth/signup -H 'Content-Type-Type: application/json' -d '{"username":"test","password":"test1234"}'` returns `{"ok":true,...}`.
- No secrets required for local dev.
