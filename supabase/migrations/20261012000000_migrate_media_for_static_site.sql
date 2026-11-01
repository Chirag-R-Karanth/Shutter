-- Shutter — migrate `media` for the static site (single-user, owner-only RLS).
--
-- REVIEW BEFORE APPLYING. Do NOT run until:
--   1. You have created your auth account (Authentication > Users).
--   2. You have replaced '<YOUR_USER_UUID>' below with that account's id.
-- Order matters: the account must exist first, then backfill, then NOT NULL.
-- Wrapped in a transaction, so any failure rolls the whole file back.

begin;

-- ---------------------------------------------------------------------------
-- 1. Ownership column
-- ---------------------------------------------------------------------------
-- Added nullable first so existing rows can be backfilled; it then becomes
-- NOT NULL with auth.uid() as the default for all future inserts.
alter table public.media
  add column if not exists user_id uuid references auth.users (id) on delete cascade;

-- Backfill every existing row to your account. REPLACE THE PLACEHOLDER.
update public.media
   set user_id = '<YOUR_USER_UUID>'
 where user_id is null;

-- New rows get owner automatically; enforce that every row has an owner.
alter table public.media
  alter column user_id set default auth.uid();
alter table public.media
  alter column user_id set not null;

-- ---------------------------------------------------------------------------
-- 2. Normalize category to singular (movie, tv, anime, game, book)
-- ---------------------------------------------------------------------------
-- Live data currently mixes singular (movie/book/game) and the old CHECK also
-- allowed plural. Collapse plural -> singular, then tighten the constraint.
update public.media set category = 'movie' where category = 'movies';
update public.media set category = 'book'  where category = 'books';
update public.media set category = 'game'  where category = 'games';

-- NOTE: `media_category_check` is Postgres' auto-generated name for the inline
-- CHECK in schema.sql. If your constraint has a different name, adjust here.
alter table public.media drop constraint if exists media_category_check;
alter table public.media
  add constraint media_category_check
  check (category in ('movie', 'tv', 'anime', 'game', 'book'));

-- ---------------------------------------------------------------------------
-- 3. New tracking fields
-- ---------------------------------------------------------------------------
alter table public.media
  add column if not exists status text not null default 'planned';

alter table public.media drop constraint if exists media_status_check;
alter table public.media
  add constraint media_status_check
  check (status in ('planned', 'in_progress', 'done'));

alter table public.media
  add column if not exists consumed_on date;

-- ---------------------------------------------------------------------------
-- 4. Owner-only RLS — replace the four permissive USING (true) policies
-- ---------------------------------------------------------------------------
alter table public.media enable row level security;

drop policy if exists "Enable read access for all users"   on public.media;
drop policy if exists "Enable insert access for all users" on public.media;
drop policy if exists "Enable update access for all users" on public.media;
drop policy if exists "Enable delete access for all users" on public.media;

-- Idempotent re-runs.
drop policy if exists "media_select_own" on public.media;
drop policy if exists "media_insert_own" on public.media;
drop policy if exists "media_update_own" on public.media;
drop policy if exists "media_delete_own" on public.media;

create policy "media_select_own" on public.media
  for select using (auth.uid() = user_id);

create policy "media_insert_own" on public.media
  for insert with check (auth.uid() = user_id);

create policy "media_update_own" on public.media
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "media_delete_own" on public.media
  for delete using (auth.uid() = user_id);

commit;
