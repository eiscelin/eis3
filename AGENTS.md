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

## Vercel deployment
- `api/[[...slug]].js` is a catch-all serverless function that delegates to the Express app in `server.js`.
- Create a **Vercel KV** store in the Vercel project settings — this auto-sets `KV_REST_API_URL` and `KV_REST_API_TOKEN` env vars. Without KV, the serverless functions cannot persist data.
- `@vercel/kv` is an `optionalDependencies` entry (not needed for local dev).

## Verification
- `curl -sf http://localhost:3000/` returns the HTML page.
- `curl -sf -X POST http://localhost:3000/api/auth/signup -H 'Content-Type-Type: application/json' -d '{"username":"test","password":"test1234"}'` returns `{"ok":true,...}`.
- No secrets required for local dev.
