# Shutter

A personal media archive for **movies, TV, anime, books, and games**, built with plain HTML, CSS, and browser JavaScript.

## Run locally

1. Edit `js/config.js` with your Supabase project URL and browser-safe publishable/anon key.
2. Start a static file server:

   ```bash
   npm run dev
   ```

3. Visit [http://localhost:8080](http://localhost:8080).

No Node build step or frontend framework is required. Python 3 is used only to serve files locally. For a deploy, publish the static project root (where `index.html` lives).

## Current features

- Five category archives
- Title search and rated/unrated filters
- Metadata search adapters for TMDB, AniList, Open Library, and IGDB through a proxy
- Add/archive entries in Supabase
- Poster detail dialog, half-star ratings, review editing, and removal
- Responsive poster grid, lazy-loaded images, keyboard-closeable dialogs, and reduced-motion support

## Provider setup

- **AniList:** direct GraphQL requests; no key configured here.
- **Open Library:** direct search requests.
- **TMDB:** requires a browser-approved public key in `js/config.js`, or a protected server-side proxy. Browser-delivered keys are visible to visitors.
- **IGDB:** requires a server-side proxy endpoint in `igdbProxyUrl`. Do not put Twitch OAuth secrets or IGDB access tokens in frontend files.

The IGDB proxy should accept a `q` query parameter and return an array with `external_id`, `title`, `release_year`, `poster_url`, and `backdrop_url` properties.

## Data and security

Shutter continues using the existing Supabase `media` table. The vanilla frontend does not recreate, migrate, or overwrite your records.

**Do not deploy this as a private archive with the current RLS policies.** The existing `supabase/schema.sql` policies grant anyone with the public project URL and anon key permission to read, insert, update, and delete rows. Add authentication and owner-scoped RLS (or a server-side API) before public deployment. Never put a Supabase service-role key in browser code.

## Migration safety

The `vanilla-migration` branch replaces the frontend runtime only on that branch. The original Next.js source remains on `main` and in Git history. Do not merge or switch production hosting until you've configured a staging Supabase project and checked existing records, add/update/delete behavior, provider requests, RLS, and browser errors.

See [README-VANILLA.md](README-VANILLA.md) for the migration verification checklist.
