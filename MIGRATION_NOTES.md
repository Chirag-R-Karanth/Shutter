# Shutter — Migration Audit (Phase 0)

Read-only audit of the current Next.js app. No files were modified or deleted.
Source reviewed: `supabase/`, `services/`, `actions/`, `lib/`, `types/`,
`components/`, `app/`, `.env.example`, `app/globals.css`, `media_rows.csv`.

Stack today: Next.js 16 (App Router) + React 19 + TypeScript + Supabase JS +
Tailwind v4 + shadcn/base-ui + framer-motion. No auth, no stats, no
export/import, no middleware.

> **Workspace state at this audit.** A prior session already scaffolded
> `/static` (Phase 1) and part of Phase 2 (`config.js`, `supabase.js`, `auth.js`,
> `login.html` + login page logic; `api.js` has browser-side AniList/Open Library
> search and Edge-Function dispatch stubs). `supabase/functions/` does **not**
> exist yet (Phase 3 not started). `supabase/migrations/…_migrate_media_for_static_site.sql`
> exists but has **not been applied**. Also uncommitted in the working tree:
> `AGENTS.md` and `CLAUDE.md` are deleted, and `services/igdb.ts` is modified
> (adds Twitch client-credentials token minting). Nothing was deleted by this
> audit.

---

## 1. Table schema & RLS

Single table, defined in `supabase/schema.sql`:

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `category` | `text` | NOT NULL, CHECK in `('movie','movies','tv','anime','book','books','game','games')` |
| `title` | `text` | NOT NULL |
| `release_year` | `integer` | nullable |
| `poster_url` | `text` | nullable |
| `backdrop_url` | `text` | nullable |
| `external_id` | `text` | nullable |
| `rating` | `decimal` | nullable (supports half stars, e.g. 3.5) |
| `review` | `text` | nullable (free-form "feelings/notes") |
| `is_logged` | `boolean` | default `true` |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()` |

Relations: none. Single denormalized table.

**RLS policies (current):**

```sql
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users"   ON media FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON media FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON media FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON media FOR DELETE USING (true);
```

**⚠ Blocker for Phase 2:** there is **no `user_id` column** and every policy is
`USING (true)` — any anonymous client with the anon key can read/write/delete
all rows. The Phase 2 requirement (`auth.uid() = user_id`) cannot be met without
a schema migration. Proposal in the Gaps section — needs your approval.

**Category drift:** schema/`types/index.ts` use plural (`movies`,`books`,`games`,
plus `tv`,`anime`), but the live data (`media_rows.csv`) stores singular
(`movie`,`book`,`game`) alongside `tv`/`anime`. `actions/media.ts` works around
this with `getCategoryVariants()`. The new client must normalize to one canonical
set (recommend plural, matching the TS types) and either migrate existing rows or
keep the variant-tolerant read.

**`media_rows.csv`** (untracked, 162 data rows): a Supabase table dump
(`id,category,...,created_at,updated_at`). Distribution: movie 63, book 39, tv 39,
anime 16, game 6. Useful as the real test/import fixture. No `user_id` column.

---

## 2. External API calls

| Source | File | Endpoint | Auth | Browser-safe? |
|---|---|---|---|---|
| TMDB (movies) | `services/tmdb.ts` | `GET /3/search/movie` | `api_key` query param — **currently `NEXT_PUBLIC_`** | ❌ needs proxy |
| TMDB (TV) | `services/tmdb.ts` | `GET /3/search/tv` | same | ❌ needs proxy |
| Anime | `services/anilist.ts` | `POST https://graphql.anilist.co` (GraphQL) | none | ✅ direct (CORS ok) |
| Books | `services/books.ts` | `GET https://openlibrary.org/search.json` | none | ✅ direct (CORS ok) |
| Games | `services/igdb.ts` | `POST https://api.igdb.com/v4/games` (Apicalypse) | `Client-ID` + OAuth Bearer; token minted from Twitch client credentials (`IGDB_CLIENT_SECRET`) | ❌ needs proxy |

Notes:
- Images only, no extra calls: TMDB `image.tmdb.org/t/p/w500` + `/original`;
  IGDB `images.igdb.com/igdb/image/upload/t_cover_big|t_1080p`; Open Library
  `covers.openlibrary.org/b/id/{id}-L.jpg`; AniList `coverImage.extraLarge` +
  `bannerImage`.
- **Current app leaks the TMDB key to the client** via `NEXT_PUBLIC_TMDB_API_KEY`
  (and historically IGDB token via `NEXT_PUBLIC_*`). This must be fixed in the
  static migration: TMDB + IGDB move behind Edge Functions.
- **`TMDB_TOKEN` vs `TMDB_API_KEY` (resolved):** `.env.local` contains only a v3
  key (`NEXT_PUBLIC_TMDB_API_KEY=6ee2…`, 32 hex chars). There is **no v4
  read-access token**. So the Edge Function should read secret `TMDB_API_KEY`
  (or store the v3 key under `TMDB_TOKEN`) and call `?api_key=`. If you create a
  v4 Read Access Token instead, switch to `Authorization: Bearer $TMDB_TOKEN`.
- **Games uses IGDB, not RAWG.** IGDB requires a secret → Edge Function required.
  (RAWG would also need a key; not currently used.)
- **Anime uses AniList, not Jikan.** No key, so it can be called directly from
  the browser. (Confirm keeping AniList vs. switching to Jikan.)
- **Books uses Open Library, not Google Books.** No key; direct call is fine.
  (The `.env.example` comment mentions Google Books but the code uses Open Library.)

---

## 3. Server actions

`actions/media.ts` (all `"use server"`, all use the shared anon Supabase client):

| Action | Does | Revalidates |
|---|---|---|
| `getMediaByCategory(category)` | `select * from media where category in <variants> order by created_at desc` | — |
| `getMediaById(id)` | `select * where id = ?` (`.single()`) | — |
| `addMedia(item)` | Inserts from a search result with `is_logged = false`; retries category singular/plural variants until CHECK passes | `/{category}` |
| `updateMediaReview(id, category, rating, review)` | Updates `rating`, `review`, `updated_at` | `/{category}`, `/{category}/{id}` |
| `removeMedia(id, category)` | Deletes by id | `/{category}`, `/` |

`actions/search.ts`:

| Action | Does |
|---|---|
| `searchMediaAction(category, query)` | Dispatches to the matching `services/*` search; swallows errors → `[]` |

No auth checks in any action.

---

## 4. Pages / features (current)

| Route | File | Feature |
|---|---|---|
| `/` | `app/page.tsx` | Landing: five category links |
| `/[category]` | `app/[category]/page.tsx` | Poster grid for a category + floating "+" button |
| `/[category]/[id]` | `app/[category]/[id]/page.tsx` | Full-screen detail (server fetch → client component) |

UI behaviors:
- **Navbar** (`components/Navbar.tsx`): Movies / TV / Anime / Books / Games, active
  state, no auth/user menu.
- **Poster grid** (`PosterGrid.tsx`): client-side text search + Watched/Unwatched
  filter (watched = `rating > 0`). Grid: 2 / 4 / 6 cols.
- **Poster card** (`PosterCard.tsx`): cover, hover title + logged check +
  rating sentiment dot (green ≥4, yellow ≥2.5, red >0), X cross overlay when rated.
- **Add flow** (`FloatingAddButton.tsx` + `SearchDialog.tsx`): floating button →
  modal → debounced (180 ms) live search → click result inserts. **No manual entry.**
- **Detail** (`MediaDetailClient.tsx`): blurred backdrop, Letterboxd-style
  half-star rating (click/drag halves, click-same-to-clear), inline review editor,
  delete with confirm. Saves rating and/or review.
- **Theme** (`app/globals.css`): dark Catppuccin Mocha (`--background #1e1e2e`,
  `--foreground #cdd6f4`, `--muted-foreground #a6adc8`), Cormorant Garamond
  headings, Inter/Geist body, transparent cards/borders.

**Features that do NOT exist yet** (all new work in later phases): authentication/login,
stats page, export/import, status (planned/in-progress/done), user "date", full
edit form, manual entry, filter by type/rating/status, sort, multi-type unified
archive grid.

---

## 5. What can't run in the browser → Edge Functions

| Need | Why | Function |
|---|---|---|
| TMDB movie/TV search | Key would be exposed; also avoids per-user rate issues | `supabase/functions/tmdb` |
| IGDB game search | Client secret + OAuth token minting | `supabase/functions/games` (or `igdb`) |
| Anime (AniList) | No key; CORS allowed | — direct from browser |
| Books (Open Library) | No key; CORS allowed | — direct from browser |
| Auth | Handled by `supabase-js` + RLS | — |

Both Edge Functions must: handle `OPTIONS` CORS, verify a valid user JWT, read
secrets from Edge Function secrets only, and normalize output to
`{ title, year, type, cover, overview, externalId }`.

> Note: current search services do **not** fetch an `overview`/description at all
> (search endpoints only return title/year/poster/banner). So the normalized
> `overview` field will be empty unless we add a details lookup or use
> the summary field where available (AniList has `description`; Open Library has
> no summary in search results; TMDB needs `/movie/{id}` for `overview`; IGDB
> needs `summary` field added to the query). Flagging this.

---

## Proposed schema migration (needs approval)

To satisfy Phase 2 (per-user RLS) and Phase 4 (status/date) I'd propose:

```sql
-- 1. new columns
ALTER TABLE media ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE media ADD COLUMN status text NOT NULL DEFAULT 'planned'
  CHECK (status IN ('planned','in_progress','done'));
ALTER TABLE media ADD COLUMN consumed_on date;          -- user's date
-- review already serves as "my feelings/notes"; release_year stays.

-- 2. backfill user_id for existing rows (you'll need the target auth user's id)
UPDATE media SET user_id = '<YOUR_AUTH_USER_UUID>' WHERE user_id IS NULL;

-- 3. lock it down, drop the wide-open policies
DROP POLICY "Enable read access for all users"   ON media;
DROP POLICY "Enable insert access for all users" ON media;
DROP POLICY "Enable update access for all users" ON media;
DROP POLICY "Enable delete access for all users" ON media;

CREATE POLICY "media_select_own" ON media FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "media_insert_own" ON media FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "media_update_own" ON media FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "media_delete_own" ON media FOR DELETE USING (auth.uid() = user_id);
```

(Also decide: normalize `category` to plural and update existing rows, or keep
the tolerant read logic.)

---

## Decisions I need from you before building

1. **RLS/user_id:** approve the schema migration above? Without a `user_id` column
   I cannot implement the required `auth.uid() = user_id` policies. What UUID
   should existing 162 rows be backfilled to?
2. **Existing auth:** the current app has none. Do you already have a Supabase
   auth user created, or should the new site just support email/password sign-up
   on first run?
3. **TMDB credential — RESOLVED:** only a v3 API key exists (see section 2). Plan:
   Edge Function uses `?api_key=` with a secret. Confirm you're happy with that vs.
   generating a v4 Read Access Token.
4. **Games — RESOLVED:** keep IGDB. `.env.local` already has `IGDB_CLIENT_ID` +
   `IGDB_CLIENT_SECRET` (the client secret is what makes server-side token minting
   possible). These become Edge Function secrets; nothing RAWG.
5. **Anime — RESOLVED (pending your OK):** keep AniList; it is already ported in
   `static/js/api.js` and needs no key. Spec's "Jikan" would be a behavior change
   for no benefit.
6. **`overview`:** normalized shape includes `overview`, but current search calls
   never return a description. Add a details fetch per result, or leave overview
   empty for now?
7. **Category canonical form — RESOLVED in scaffold:** the migration and the
   existing `static/js/api.js` both standardize on **singular**
   (`movie`,`tv`,`anime`,`game`,`book`) and the migration backfills plural→singular.
   Confirm that's the canonical choice you want.
8. **File location:** I plan to put `MIGRATION_NOTES.md` and the future `static/`
   folder at the repo root (`media-archive/`), not inside the empty `new/` dir.
   OK?

Stopping here per the phase rules.
