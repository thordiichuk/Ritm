-- «Ритм»: база для синхронізації між пристроями.
-- Як застосувати: Supabase → SQL Editor → New query → вставити весь файл → Run.
-- Файл можна запускати повторно: він нічого не ламає й не стирає.

-- Один рядок = один запис застосунку (блок, задача, звичка, позначка звички за день, день, підсумок…)
create table if not exists public.records (
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  key         text        not null check (char_length(key) <= 200),
  data        jsonb,
  deleted     boolean     not null default false,
  updated_at  bigint      not null,                 -- коли запис змінили на пристрої (мс)
  modified_at timestamptz not null default now(),   -- коли рядок змінився на сервері
  primary key (user_id, key)
);

create index if not exists records_user_modified on public.records (user_id, modified_at);

-- Правила доступу до рядків (RLS): кожен бачить і змінює лише свої записи
alter table public.records enable row level security;

drop policy if exists "читати свої" on public.records;
create policy "читати свої" on public.records
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "додавати свої" on public.records;
create policy "додавати свої" on public.records
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "змінювати свої" on public.records;
create policy "змінювати свої" on public.records
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Анонімним відвідувачам — нічого
revoke all on public.records from anon;

-- Запис пачки змін. Новіша версія перемагає: старіша зміна не затре новішу,
-- навіть якщо дійде на сервер пізніше (наприклад, телефон довго був без інтернету).
-- security invoker — функція працює з правами людини, тож правила вище діють і тут.
create or replace function public.push_records(rows jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.records (user_id, key, data, deleted, updated_at, modified_at)
  select (select auth.uid()), r->>'key', r->'data', coalesce((r->>'deleted')::boolean, false), (r->>'updated_at')::bigint, now()
  from jsonb_array_elements(rows) as r
  on conflict (user_id, key) do update
    set data = excluded.data,
        deleted = excluded.deleted,
        updated_at = excluded.updated_at,
        modified_at = now()
    where public.records.updated_at < excluded.updated_at;
$$;

revoke all on function public.push_records(jsonb) from public, anon;
grant execute on function public.push_records(jsonb) to authenticated;

-- Миттєві сповіщення про зміни (щоб інший пристрій підтягнув їх одразу, а не за кілька хвилин)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'records'
  ) then
    alter publication supabase_realtime add table public.records;
  end if;
end $$;
