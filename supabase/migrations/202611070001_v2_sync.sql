-- Meu Repertorio V2 - Etapa 8
-- Esta migracao e somente para revisao e aplicacao manual pelo usuario.
-- Ela nao altera nenhuma tabela da versao antiga.

create table if not exists public.v2_songs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  title text not null,
  artist text,
  original_key text,
  current_key text,
  preferred_key text,
  capo integer,
  tuning text,
  rhythm text,
  strumming text,
  difficulty text,
  content text not null,
  structure jsonb not null,
  notes text,
  revision integer not null default 1 check (revision > 0),
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, id)
);

create table if not exists public.v2_repertories (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  name text not null,
  description text,
  revision integer not null default 1 check (revision > 0),
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, id)
);

create table if not exists public.v2_repertory_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null,
  repertory_id text not null,
  song_id text not null,
  position double precision not null,
  preferred_key text,
  revision integer not null default 1 check (revision > 0),
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, id)
);

create index if not exists v2_songs_user_updated_at_idx
  on public.v2_songs (user_id, updated_at);
create index if not exists v2_repertories_user_updated_at_idx
  on public.v2_repertories (user_id, updated_at);
create index if not exists v2_repertory_items_user_updated_at_idx
  on public.v2_repertory_items (user_id, updated_at);

create or replace function public.v2_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- clock_timestamp muda por linha, inclusive dentro do mesmo RPC/lote.
  new.updated_at := timezone('utc', clock_timestamp());
  return new;
end;
$$;

drop trigger if exists v2_songs_set_updated_at on public.v2_songs;
create trigger v2_songs_set_updated_at
before insert or update on public.v2_songs
for each row execute function public.v2_set_updated_at();

drop trigger if exists v2_repertories_set_updated_at on public.v2_repertories;
create trigger v2_repertories_set_updated_at
before insert or update on public.v2_repertories
for each row execute function public.v2_set_updated_at();

drop trigger if exists v2_repertory_items_set_updated_at on public.v2_repertory_items;
create trigger v2_repertory_items_set_updated_at
before insert or update on public.v2_repertory_items
for each row execute function public.v2_set_updated_at();

alter table public.v2_songs enable row level security;
alter table public.v2_repertories enable row level security;
alter table public.v2_repertory_items enable row level security;

revoke all on table public.v2_songs from anon;
revoke all on table public.v2_repertories from anon;
revoke all on table public.v2_repertory_items from anon;
revoke all on table public.v2_songs from authenticated;
revoke all on table public.v2_repertories from authenticated;
revoke all on table public.v2_repertory_items from authenticated;
grant select, insert, update, delete on table public.v2_songs to authenticated;
grant select, insert, update, delete on table public.v2_repertories to authenticated;
grant select, insert, update, delete on table public.v2_repertory_items to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'v2_songs' and policyname = 'v2_songs_select_own') then
    create policy v2_songs_select_own on public.v2_songs for select to authenticated using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'v2_songs' and policyname = 'v2_songs_insert_own') then
    create policy v2_songs_insert_own on public.v2_songs for insert to authenticated with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'v2_songs' and policyname = 'v2_songs_update_own') then
    create policy v2_songs_update_own on public.v2_songs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'v2_songs' and policyname = 'v2_songs_delete_own') then
    create policy v2_songs_delete_own on public.v2_songs for delete to authenticated using ((select auth.uid()) = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'v2_repertories' and policyname = 'v2_repertories_select_own') then
    create policy v2_repertories_select_own on public.v2_repertories for select to authenticated using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'v2_repertories' and policyname = 'v2_repertories_insert_own') then
    create policy v2_repertories_insert_own on public.v2_repertories for insert to authenticated with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'v2_repertories' and policyname = 'v2_repertories_update_own') then
    create policy v2_repertories_update_own on public.v2_repertories for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'v2_repertories' and policyname = 'v2_repertories_delete_own') then
    create policy v2_repertories_delete_own on public.v2_repertories for delete to authenticated using ((select auth.uid()) = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'v2_repertory_items' and policyname = 'v2_repertory_items_select_own') then
    create policy v2_repertory_items_select_own on public.v2_repertory_items for select to authenticated using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'v2_repertory_items' and policyname = 'v2_repertory_items_insert_own') then
    create policy v2_repertory_items_insert_own on public.v2_repertory_items for insert to authenticated with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'v2_repertory_items' and policyname = 'v2_repertory_items_update_own') then
    create policy v2_repertory_items_update_own on public.v2_repertory_items for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'v2_repertory_items' and policyname = 'v2_repertory_items_delete_own') then
    create policy v2_repertory_items_delete_own on public.v2_repertory_items for delete to authenticated using ((select auth.uid()) = user_id);
  end if;
end;
$$;

-- A funcao compara revision no servidor. Em empate, a linha que ja esta no
-- servidor vence; o cliente nunca envia
-- updated_at como criterio de conflito.
create or replace function public.v2_upsert_songs(p_rows jsonb)
returns setof public.v2_songs
language plpgsql
security invoker
set search_path = public
as $$
declare row_data jsonb;
declare current_row public.v2_songs;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  for row_data in select value from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    if row_data->>'user_id' <> auth.uid()::text then raise exception 'invalid user'; end if;
    insert into public.v2_songs (user_id, id, title, artist, original_key, current_key, preferred_key, capo, tuning, rhythm, strumming, difficulty, content, structure, notes, revision, deleted_at, created_at)
    values (auth.uid(), row_data->>'id', row_data->>'title', row_data->>'artist', row_data->>'original_key', row_data->>'current_key', row_data->>'preferred_key', (row_data->>'capo')::integer, row_data->>'tuning', row_data->>'rhythm', row_data->>'strumming', row_data->>'difficulty', row_data->>'content', row_data->'structure', row_data->>'notes', (row_data->>'revision')::integer, (row_data->>'deleted_at')::timestamptz, coalesce((row_data->>'created_at')::timestamptz, timezone('utc', now())))
    on conflict (user_id, id) do update set title = excluded.title, artist = excluded.artist, original_key = excluded.original_key, current_key = excluded.current_key, preferred_key = excluded.preferred_key, capo = excluded.capo, tuning = excluded.tuning, rhythm = excluded.rhythm, strumming = excluded.strumming, difficulty = excluded.difficulty, content = excluded.content, structure = excluded.structure, notes = excluded.notes, revision = excluded.revision, deleted_at = excluded.deleted_at
    where excluded.revision > public.v2_songs.revision;
    select * into current_row from public.v2_songs where user_id = auth.uid() and id = row_data->>'id';
    return next current_row;
  end loop;
end;
$$;

create or replace function public.v2_upsert_repertories(p_rows jsonb)
returns setof public.v2_repertories
language plpgsql security invoker set search_path = public
as $$
declare row_data jsonb;
declare current_row public.v2_repertories;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  for row_data in select value from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    if row_data->>'user_id' <> auth.uid()::text then raise exception 'invalid user'; end if;
    insert into public.v2_repertories (user_id, id, name, description, revision, deleted_at, created_at)
    values (auth.uid(), row_data->>'id', row_data->>'name', row_data->>'description', (row_data->>'revision')::integer, (row_data->>'deleted_at')::timestamptz, coalesce((row_data->>'created_at')::timestamptz, timezone('utc', now())))
    on conflict (user_id, id) do update set name = excluded.name, description = excluded.description, revision = excluded.revision, deleted_at = excluded.deleted_at
    where excluded.revision > public.v2_repertories.revision;
    select * into current_row from public.v2_repertories where user_id = auth.uid() and id = row_data->>'id';
    return next current_row;
  end loop;
end;
$$;

create or replace function public.v2_upsert_repertory_items(p_rows jsonb)
returns setof public.v2_repertory_items
language plpgsql security invoker set search_path = public
as $$
declare row_data jsonb;
declare current_row public.v2_repertory_items;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  for row_data in select value from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    if row_data->>'user_id' <> auth.uid()::text then raise exception 'invalid user'; end if;
    insert into public.v2_repertory_items (user_id, id, repertory_id, song_id, position, preferred_key, revision, deleted_at, created_at)
    values (auth.uid(), row_data->>'id', row_data->>'repertory_id', row_data->>'song_id', (row_data->>'position')::double precision, row_data->>'preferred_key', (row_data->>'revision')::integer, (row_data->>'deleted_at')::timestamptz, coalesce((row_data->>'created_at')::timestamptz, timezone('utc', now())))
    on conflict (user_id, id) do update set repertory_id = excluded.repertory_id, song_id = excluded.song_id, position = excluded.position, preferred_key = excluded.preferred_key, revision = excluded.revision, deleted_at = excluded.deleted_at
    where excluded.revision > public.v2_repertory_items.revision;
    select * into current_row from public.v2_repertory_items where user_id = auth.uid() and id = row_data->>'id';
    return next current_row;
  end loop;
end;
$$;

revoke execute on function public.v2_upsert_songs(jsonb) from public, anon;
revoke execute on function public.v2_upsert_repertories(jsonb) from public, anon;
revoke execute on function public.v2_upsert_repertory_items(jsonb) from public, anon;
grant execute on function public.v2_upsert_songs(jsonb) to authenticated;
grant execute on function public.v2_upsert_repertories(jsonb) to authenticated;
grant execute on function public.v2_upsert_repertory_items(jsonb) to authenticated;
