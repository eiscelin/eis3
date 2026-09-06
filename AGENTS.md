# Base44 Setup Notes

## Project
Single static `index.html` page (Chookee Inasal franchise marketing site). No build step, no backend, no dependencies.

## Running
- `docker compose -f docker-compose.base44.yml up -d`
- nginx:alpine serves `index.html` on host port 3000.
- The source file is bind-mounted, so edits to `index.html` appear on browser refresh (no rebuild needed).

## Verification
- `curl -sf http://localhost:3000/` returns the HTML page.
- No secrets required.
