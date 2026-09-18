-- ============================================================================
-- MediaTrack — Schema Supabase / PostgreSQL
-- Executa este script completo no SQL Editor do teu projeto Supabase.
-- ============================================================================

-- Extensões necessárias
create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
do $$ begin
  create type media_category as enum ('book', 'manga', 'anime', 'tv_series', 'drama', 'movie');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type library_status as enum ('watching_reading', 'completed', 'backlog', 'favorite');
exception
  when duplicate_object then null;
end $$;

-- ----------------------------------------------------------------------------
-- TABELA: profiles
-- Um perfil por utilizador autenticado (espelha auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  favorite_genres text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- TABELA: media_items
-- Cache local dos itens de mídia vindos das APIs externas (TMDB/AniList/OpenLibrary)
-- Evita repetir pedidos às APIs e permite relacionar reviews/library por id interno
-- ----------------------------------------------------------------------------
create table if not exists public.media_items (
  id uuid primary key default uuid_generate_v4(),
  external_id text not null,           -- id na API de origem (tmdb id, anilist id, openlibrary key)
  source text not null,                -- 'tmdb' | 'anilist' | 'openlibrary'
  category media_category not null,
  title text not null,
  original_title text,
  synopsis text,
  cover_url text,
  release_year int,
  genres text[] default '{}',
  total_episodes int,                  -- séries/anime/dorama
  total_chapters int,                  -- manga
  total_pages int,                     -- livro
  extra jsonb default '{}'::jsonb,     -- payload bruto normalizado, campos específicos
  created_at timestamptz not null default now(),
  unique (source, external_id)
);

create index if not exists idx_media_items_category on public.media_items (category);
create index if not exists idx_media_items_title on public.media_items using gin (to_tsvector('simple', title));

-- ----------------------------------------------------------------------------
-- TABELA: user_library
-- Relação utilizador <-> item de mídia (biblioteca pessoal)
-- ----------------------------------------------------------------------------
create table if not exists public.user_library (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_item_id uuid not null references public.media_items(id) on delete cascade,
  status library_status not null default 'backlog',
  current_season smallint,             -- tv_series / drama
  current_episode smallint,            -- tv_series / drama / anime
  current_chapter smallint,            -- manga
  current_volume smallint,             -- manga (opcional, edição/tomo)
  current_page smallint,               -- book
  is_favorite boolean not null default false,
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, media_item_id)
);

create index if not exists idx_user_library_user on public.user_library (user_id);
create index if not exists idx_user_library_status on public.user_library (user_id, status);

-- ----------------------------------------------------------------------------
-- TABELA: reviews
-- Rating (1-5) e notas pessoais por item de mídia
-- ----------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_item_id uuid not null references public.media_items(id) on delete cascade,
  rating smallint check (rating between 1 and 5),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, media_item_id)
);

create index if not exists idx_reviews_user on public.reviews (user_id);

-- ----------------------------------------------------------------------------
-- TRIGGER: updated_at automático
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_user_library_updated_at on public.user_library;
create trigger trg_user_library_updated_at
  before update on public.user_library
  for each row execute function public.set_updated_at();

drop trigger if exists trg_reviews_updated_at on public.reviews;
create trigger trg_reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- TRIGGER: criar profile automaticamente após signup (magic link / OTP email)
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- GRANTS
-- RLS policies só são avaliadas depois de o role já ter privilégio na tabela.
-- Sem estes GRANTs, todos os pedidos falham com "permission denied" (42501),
-- mesmo com RLS e policies corretas.
-- ============================================================================
grant usage on schema public to authenticated, anon;

grant select, update on public.profiles to authenticated;
grant select, insert, update on public.media_items to authenticated;
grant select, insert, update, delete on public.user_library to authenticated;
grant select, insert, update, delete on public.reviews to authenticated;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.media_items enable row level security;
alter table public.user_library enable row level security;
alter table public.reviews enable row level security;

-- profiles: cada utilizador só vê/edita o seu próprio perfil
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- media_items: catálogo público de leitura para qualquer utilizador autenticado;
-- escrita permitida a qualquer utilizador autenticado (upsert de cache vindo das APIs)
drop policy if exists "media_items_select_all" on public.media_items;
create policy "media_items_select_all" on public.media_items
  for select using (auth.role() = 'authenticated');

drop policy if exists "media_items_insert_auth" on public.media_items;
create policy "media_items_insert_auth" on public.media_items
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "media_items_update_auth" on public.media_items;
create policy "media_items_update_auth" on public.media_items
  for update using (auth.role() = 'authenticated');

-- user_library: cada utilizador só vê e gere a sua própria biblioteca
drop policy if exists "user_library_select_own" on public.user_library;
create policy "user_library_select_own" on public.user_library
  for select using (auth.uid() = user_id);

drop policy if exists "user_library_insert_own" on public.user_library;
create policy "user_library_insert_own" on public.user_library
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_library_update_own" on public.user_library;
create policy "user_library_update_own" on public.user_library
  for update using (auth.uid() = user_id);

drop policy if exists "user_library_delete_own" on public.user_library;
create policy "user_library_delete_own" on public.user_library
  for delete using (auth.uid() = user_id);

-- reviews: cada utilizador só vê e gere as suas próprias reviews
-- (podes trocar o "select" para público se quiseres reviews visíveis a todos)
drop policy if exists "reviews_select_own" on public.reviews;
create policy "reviews_select_own" on public.reviews
  for select using (auth.uid() = user_id);

drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own" on public.reviews
  for insert with check (auth.uid() = user_id);

drop policy if exists "reviews_update_own" on public.reviews;
create policy "reviews_update_own" on public.reviews
  for update using (auth.uid() = user_id);

drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own" on public.reviews
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- KEEP-ALIVE
-- Função "vazia" chamável por qualquer pedido (mesmo sem sessão), só para
-- gerar atividade na API e evitar a pausa automática por inatividade do
-- plano gratuito do Supabase (projetos pausam ao fim de 7 dias sem pedidos).
-- Não lê nem expõe nenhuma tabela — devolve apenas a hora atual do servidor.
-- ============================================================================
create or replace function public.keepalive_ping()
returns timestamptz
language sql
security definer
set search_path = public
as $$
  select now();
$$;

grant execute on function public.keepalive_ping() to anon, authenticated;
