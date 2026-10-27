-- Scarlet Pokédex cloud sync. Run once in the Supabase SQL editor (Dashboard → SQL Editor → New query)
-- of the same project FireRed Companion and Quit use, so the same account and passkey work.
-- One row per signed-in user holding the caught list, team and shiny settings.

create table if not exists public.scarlet_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  doc jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.scarlet_progress enable row level security;

drop policy if exists "owner can read" on public.scarlet_progress;
drop policy if exists "owner can insert" on public.scarlet_progress;
drop policy if exists "owner can update" on public.scarlet_progress;
drop policy if exists "owner can delete" on public.scarlet_progress;
create policy "owner can read" on public.scarlet_progress
  for select using (auth.uid() = user_id);
create policy "owner can insert" on public.scarlet_progress
  for insert with check (auth.uid() = user_id);
create policy "owner can update" on public.scarlet_progress
  for update using (auth.uid() = user_id);
create policy "owner can delete" on public.scarlet_progress
  for delete using (auth.uid() = user_id);

-- Make the table reachable through the Data API even if "Automatically expose new tables" is off.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.scarlet_progress to authenticated;
