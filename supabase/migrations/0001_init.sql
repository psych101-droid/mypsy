-- MyPsych — initial schema
-- Apply via the Supabase SQL editor or `supabase db push`.
-- Requires the pgvector extension (available on all Supabase projects).

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- Knowledge base (David Webb's published content)
-- ---------------------------------------------------------------------------

create table public.content_items (
  id           uuid primary key default gen_random_uuid(),
  source       text not null check (source in ('substack', 'website')),
  source_id    text not null,            -- substack post_id or normalized page URL
  url          text not null,
  title        text not null,
  subtitle     text,
  audience     text not null default 'everyone' check (audience in ('everyone', 'only_paid')),
  published_at timestamptz,
  full_text    text not null,
  word_count   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (source, source_id)
);

-- Embeddings are voyage-3.5 (1024 dimensions). If the embedding model changes,
-- the vector dimension below and all stored embeddings must change with it.
create table public.content_chunks (
  id              uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items (id) on delete cascade,
  chunk_index     integer not null,
  text            text not null,
  token_count     integer not null default 0,
  embedding       vector(1024),
  created_at      timestamptz not null default now(),
  unique (content_item_id, chunk_index)
);

create index content_chunks_embedding_idx
  on public.content_chunks
  using hnsw (embedding vector_cosine_ops);

create table public.concepts (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  explanation     text not null,            -- plain-English, in David's voice, sourced from the KB
  theme           text not null check (theme in (
                    'Cognitive', 'Social', 'Developmental', 'Clinical',
                    'Personality', 'Biological', 'Emotion & Wellbeing'
                  )),
  source_item_id  uuid references public.content_items (id) on delete set null,
  source_url      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- One global prompt per day, shown on the home screen ("daily prompt" feature).
create table public.daily_prompts (
  id          uuid primary key default gen_random_uuid(),
  prompt_date date not null unique,
  prompt_text text not null,
  concept_id  uuid references public.concepts (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- User data (private — protected by RLS below)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Managed exclusively by Stripe webhooks via the service role.
create table public.subscriptions (
  user_id                uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  status                 text not null default 'none' check (status in (
                           'none', 'active', 'trialing', 'past_due', 'canceled', 'incomplete'
                         )),
  plan                   text check (plan in ('monthly', 'annual')),
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);

create table public.mood_checkins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  mood       smallint not null check (mood between 1 and 5),
  theme      text check (theme in (
               'Relationships', 'Work & Motivation', 'Identity & Values',
               'Emotions', 'Habits & Behaviour', 'Social Life'
             )),
  created_at timestamptz not null default now()
);

create index mood_checkins_user_created_idx on public.mood_checkins (user_id, created_at desc);

create table public.journal_entries (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  mood_checkin_id       uuid references public.mood_checkins (id) on delete set null,
  prompt_text           text,
  prompt_concept_id     uuid references public.concepts (id) on delete set null,
  entry_text            text not null,
  reflection_text       text,
  reflection_concept_id uuid references public.concepts (id) on delete set null,
  theme                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index journal_entries_user_created_idx on public.journal_entries (user_id, created_at desc);

create table public.favorites (
  user_id    uuid not null references auth.users (id) on delete cascade,
  concept_id uuid not null references public.concepts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, concept_id)
);

create table public.weekly_insights (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  week_start date not null,               -- Monday of the summarized week
  summary    text not null,
  themes     jsonb not null default '[]', -- [{"theme": "...", "count": n}, ...]
  concept_id uuid references public.concepts (id) on delete set null, -- "this week in psychology"
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- ---------------------------------------------------------------------------
-- Auto-create a profile row on signup
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.subscriptions (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Semantic search over the knowledge base (called via supabase.rpc)
-- ---------------------------------------------------------------------------

create or replace function public.match_content_chunks(
  query_embedding vector(1024),
  match_count     integer default 5,
  min_similarity  double precision default 0.3
)
returns table (
  chunk_id    uuid,
  item_id     uuid,
  title       text,
  url         text,
  source      text,
  chunk_text  text,
  similarity  double precision
)
language sql stable
as $$
  select
    c.id,
    i.id,
    i.title,
    i.url,
    i.source,
    c.text,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.content_chunks c
  join public.content_items i on i.id = c.content_item_id
  where c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) >= min_similarity
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- Journal entries and check-ins are deeply personal: each row is readable and
-- writable only by its owner. There is no policy granting anyone else access,
-- so neither the app team nor other users can read them. The service role is
-- used only for Stripe webhooks (subscriptions) and content ingestion.
-- ---------------------------------------------------------------------------

alter table public.content_items  enable row level security;
alter table public.content_chunks enable row level security;
alter table public.concepts       enable row level security;
alter table public.daily_prompts  enable row level security;
alter table public.profiles       enable row level security;
alter table public.subscriptions  enable row level security;
alter table public.mood_checkins  enable row level security;
alter table public.journal_entries enable row level security;
alter table public.favorites      enable row level security;
alter table public.weekly_insights enable row level security;

-- Knowledge base: readable by everyone; written only by the service role
-- (which bypasses RLS), so no insert/update policies are defined.
create policy "content_items_read"  on public.content_items  for select using (true);
create policy "content_chunks_read" on public.content_chunks for select using (true);
create policy "concepts_read"       on public.concepts       for select using (true);
create policy "daily_prompts_read"  on public.daily_prompts  for select using (true);

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Users can see their own subscription; only webhooks (service role) write it.
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

create policy "mood_checkins_all_own" on public.mood_checkins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "journal_entries_all_own" on public.journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "favorites_all_own" on public.favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "weekly_insights_select_own" on public.weekly_insights
  for select using (auth.uid() = user_id);
