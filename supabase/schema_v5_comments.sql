-- =============================================================
--  Jogo Comidas da Copa — Schema v5: comentários do feed +
--  avaliação restrita a quem participou
--  Rode DEPOIS dos schemas v1..v4. Seguro rodar mais de uma vez.
-- =============================================================

-- ---------- Comentários do feed Social (texto, sem estrela) ----------
-- Qualquer pessoa logada pode comentar um prato publicado.
create table if not exists comments (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references matches(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  text        text not null,
  created_at  timestamptz not null default now()
);

alter table comments enable row level security;

drop policy if exists "read comments" on comments;
create policy "read comments" on comments
  for select to authenticated using (true);

-- Publica no Realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'comments'
  ) then
    execute 'alter publication supabase_realtime add table comments';
  end if;
end;
$$;

-- ---------- Funções ----------

-- Adiciona um comentário (qualquer um logado).
create or replace function add_comment(p_match_id uuid, p_text text, p_author text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Precisa estar logado.';
  end if;
  if btrim(coalesce(p_text, '')) = '' then
    raise exception 'Escreva um comentário.';
  end if;
  insert into comments (match_id, user_id, author_name, text)
    values (p_match_id, auth.uid(), p_author, btrim(p_text));
end;
$$;

-- Avaliação (estrelas + comentário): agora SÓ quem participou do prato
-- (escreveu um prato na rodada OU foi marcado como dupla) pode avaliar.
create or replace function submit_review(
  p_match_id uuid,
  p_rating   int,
  p_comment  text,
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
  if p_rating < 1 or p_rating > 5 then
    raise exception 'A nota precisa ser de 1 a 5 estrelas.';
  end if;
  if not exists (select 1 from foods where match_id = p_match_id and user_id = auth.uid())
     and not exists (select 1 from matches where id = p_match_id and partner_id = auth.uid())
  then
    raise exception 'Só quem participou do prato pode avaliar.';
  end if;

  insert into reviews (match_id, user_id, author_name, rating, comment)
    values (p_match_id, auth.uid(), p_author, p_rating, nullif(btrim(p_comment), ''))
  on conflict (match_id, user_id)
    do update set rating = excluded.rating,
                  comment = excluded.comment,
                  author_name = excluded.author_name,
                  created_at = now();
end;
$$;
