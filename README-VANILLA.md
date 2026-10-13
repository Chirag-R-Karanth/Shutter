# Shutter — Vanilla frontend migration

This branch introduces a plain HTML/CSS/JavaScript frontend while leaving the existing Next.js app and Supabase schema intact. The migration is intentionally additive.

## Requirements

- A static web server (ES modules and browser imports do not work reliably from `file://`).
- A Supabase project with the existing `media` table.
- A local `js/config.js` copied from `js/config.example.js`.
- An IGDB proxy endpoint to enable games search.
- TMDB search needs an approved browser-exposed key or, preferably, a small server-side proxy. No provider secrets belong in browser code.

## Run locally

1. Copy `js/config.example.js` to `js/config.js` and insert the Supabase project URL and publishable/anon key.
2. Run a static server from the repository root, for example:

   ```sh
   python -m http.server 8080
   ```

3. Open `http://localhost:8080`.

The existing Next.js application still runs with its existing commands; the vanilla frontend is not yet the default entrypoint.

## Current parity

- [x] Home page / category navigation
- [x] Five category archives
- [x] Search archive titles; filter rated/unrated entries
- [x] Add media from metadata providers (provider credentials/configuration required)
- [x] Detail dialog and half-star database values (click full-star targets; partial-star interaction can be added if strict parity is required)
- [x] Edit and save reviews
- [x] Delete media with confirmation
- [x] Lazy-loaded poster images and responsive grids
- [ ] Provider request proxy and credentials configuration
- [ ] Authentication / private per-user row-level security
- [ ] Browser and production deployment testing
- [ ] Verify existing records, ratings, category variants, and duplicate handling against a real project

## Important security note

The existing `supabase/schema.sql` policies allow anyone with the project URL and anon key to read, insert, update, or delete every row. Because this frontend runs in the browser, that policy is not suitable for private data. Before deploying the frontend publicly, add authentication and owner-scoped RLS (or use a server-side API). Never put a Supabase service-role key or IGDB access token in frontend code.

## Rollout plan

1. Keep the current main branch live.
2. Configure a staging Supabase project or a safe test user and run the vanilla version locally.
3. Verify CRUD operations and provider result normalization.
4. Tighten RLS and add a secure IGDB/TMDB proxy.
5. Deploy the vanilla frontend to staging, inspect browser errors and network requests, then switch hosting only after parity checks pass.

Do not delete the existing `app/`, `components/`, `actions/`, or Next.js configuration until the replacement has been tested against the actual archive.
