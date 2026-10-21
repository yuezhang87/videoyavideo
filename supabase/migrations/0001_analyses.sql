create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  piece text,
  level text not null default 'beginner',
  duration_seconds real,
  metrics jsonb not null,
  feedback jsonb not null,
  videos jsonb not null default '[]'::jsonb,
  thumbnail text
);

create index if not exists analyses_user_created_idx on public.analyses (user_id, created_at desc);

alter table public.analyses enable row level security;

create policy "own rows select" on public.analyses for select using (auth.uid() = user_id);
create policy "own rows insert" on public.analyses for insert with check (auth.uid() = user_id);
create policy "own rows delete" on public.analyses for delete using (auth.uid() = user_id);
