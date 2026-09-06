# Base44 Setup Notes

## Project
Single static `index.html` page (Chookee Inasal franchise marketing site). No build step, no backend, no dependencies.

## Running
- `docker compose -f docker-compose.base44.yml up -d`
- nginx:alpine serves `index.html` on host port 3000.
- The source file is bind-mounted, so edits to `index.html` appear on browser refresh (no rebuild needed).

## Quirk
Static files are bind-mounted individually in compose. Any NEW static file (e.g. `dashboard.js`) must be added to `docker-compose.base44.yml` volumes or nginx will 404 it.

`auth.js` dispatches a `chookee:session` window event on every login/logout/logout-header-render; `dashboard.js` listens to it to show/hide the franchisee dashboard. Marketing page sections are hidden via `body.dash-mode` CSS.

## Verification
- `curl -sf http://localhost:3000/` returns the HTML page.
- No secrets required.
