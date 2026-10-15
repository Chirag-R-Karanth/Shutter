# Shutter — Vanilla frontend

The plain HTML/CSS/JavaScript frontend is now the default application on `main`. The original Next.js source remains in Git history, but is not present in the current `main` tree. Restoring this frontend did not modify the Supabase schema or existing database records.

## Requirements

- Python 3 for the local static server; no Node build step or `npm install` is required.
- The existing Supabase project with its `media` table, if you want to access the existing archive.
- Valid browser-safe settings in `js/config.js`. The committed file deliberately contains placeholders.
- An IGDB proxy endpoint to enable games search.
- TMDB search needs an approved browser-exposed key or, preferably, a server-side proxy. Never put provider secrets in browser code.

## Run locally

1. Pull the repaired default branch:

   ```sh
   git pull origin main
   ```

2. Configure `js/config.js` with the Supabase project URL and publishable/anon key. Do not put a service-role key or other secret in this file.
3. Start the server from the repository root:

   ```sh
   npm run dev
   ```

4. Open http://localhost:8080.

You can also run `python3 -m http.server 8080` directly. Do not open `index.html` through `file://`; ES modules require a server.

## Current parity

- [x] Home page and category navigation
- [x] Five category archives
- [x] Archive search and rated/unrated filters
- [x] Detail dialog with half-star ratings
- [x] Review editing and removal
- [x] Lazy-loaded poster images and responsive grids
- [ ] Provider proxy and production credentials configuration
- [ ] Authentication / private per-user row-level security
- [ ] Browser and production deployment testing
- [ ] Verify existing records, category variants, duplicate handling, and CRUD behavior against a real project

## Data and security warning

The current `supabase/schema.sql` policies allow anyone with the project URL and anon key to read, insert, update, or delete every row. Do not use that policy for a private archive or public deployment. Add authentication with owner-scoped RLS (or use a server-side API) first. Never put a Supabase service-role key or IGDB access token in frontend code.

The static frontend still uses Supabase; this recovery does not migrate data to a local database. Do not change database architecture or run destructive migrations until the existing records have been backed up and verified.
