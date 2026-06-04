-- =============================================================
--  Jogo Comidas da Copa — Schema v6: nota de apresentação (0–10)
--  Qualquer pessoa do Social pode dar uma nota de apresentação ao prato.
--  (A avaliação em estrelas continua sendo só dos participantes, na galeria.)
--  Rode DEPOIS dos schemas v1..v5. Seguro rodar mais de uma vez.
-- =============================================================

create table if not exists presentations (
  match_id    uuid not null references matches(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  score       int  not null check (score between 0 and 10),
  created_at  timestamptz not null default now(),
  primary key (match_id, user_id)
);

alter table presentations enable row level security;

drop policy if exists "read presentations" on presentations;
create policy "read presentations" on presentations
  for select to authenticated using (true);

-- Publica no Realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'presentations'
  ) then
    execute 'alter publication supabase_realtime add table presentations';
  end if;
end;
$$;

-- Dá (ou atualiza) a nota de apresentação 0–10. Qualquer um logado.
create or replace function rate_presentation(
  p_match_id uuid,
  p_score    int,
  p_author   text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Precisa estar logado.';
  end if;
  if p_score < 0 or p_score > 10 then
    raise exception 'A nota de apresentação é de 0 a 10.';
  end if;

  insert into presentations (match_id, user_id, author_name, score)
    values (p_match_id, auth.uid(), p_author, p_score)
  on conflict (match_id, user_id)
    do update set score = excluded.score,
                  author_name = excluded.author_name,
                  created_at = now();
end;
$$;
