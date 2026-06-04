-- =============================================================
--  Jogo Comidas da Copa — Schema v4: edição da galeria
--  (legenda, marcar a dupla, exportar pro feed)
--  Rode DEPOIS de schema.sql, schema_v2.sql e schema_v3_rooms.sql.
--  É SEGURO rodar mais de uma vez (additive / idempotente).
-- =============================================================

-- ---------- Novas colunas em matches ----------
-- caption    : legenda/comentário que a dupla escreve sobre o prato
-- published  : aparece no feed Social? (default: privado, só na galeria)
-- partner_id : quem cozinhou junto (referencia profiles → aparece na galeria dele também)
alter table matches add column if not exists caption    text;
alter table matches add column if not exists published  boolean not null default false;
alter table matches add column if not exists partner_id uuid references profiles(user_id) on delete set null;

-- ---------- Funções ----------

-- Lista os perfis das duplas que você já adicionou (pelo código de amigo).
create or replace function get_friends()
returns setof profiles
language sql
security definer
set search_path = public
as $$
  select p.*
  from friendships f
  join profiles p
    on p.user_id = case when f.user1_id = auth.uid() then f.user2_id else f.user1_id end
  where auth.uid() in (f.user1_id, f.user2_id)
  order by p.display_name;
$$;

-- Edita uma entrada da galeria: legenda, dupla marcada e (opcional) troca a foto.
-- Só quem participou da rodada (escreveu prato) OU a dupla marcada pode editar.
create or replace function update_gallery_entry(
  p_match_id   uuid,
  p_caption    text,
  p_partner_id uuid,
  p_photo_url  text
)
returns matches
language plpgsql
security definer
set search_path = public
as $$
declare
  m matches;
begin
  if auth.uid() is null then
    raise exception 'Precisa estar logado.';
  end if;

  if not exists (select 1 from foods where match_id = p_match_id and user_id = auth.uid())
     and not exists (select 1 from matches where id = p_match_id and partner_id = auth.uid())
  then
    raise exception 'Você não participou dessa rodada.';
  end if;

  update matches set
    caption    = nullif(btrim(coalesce(p_caption, '')), ''),
    partner_id = p_partner_id,
    photo_url  = coalesce(nullif(btrim(coalesce(p_photo_url, '')), ''), photo_url)
  where id = p_match_id
  returning * into m;

  return m;
end;
$$;

-- Liga/desliga a foto no feed Social.
create or replace function set_published(p_match_id uuid, p_published boolean)
returns matches
language plpgsql
security definer
set search_path = public
as $$
declare
  m matches;
begin
  if auth.uid() is null then
    raise exception 'Precisa estar logado.';
  end if;

  if not exists (select 1 from foods where match_id = p_match_id and user_id = auth.uid())
     and not exists (select 1 from matches where id = p_match_id and partner_id = auth.uid())
  then
    raise exception 'Você não participou dessa rodada.';
  end if;

  update matches set published = p_published
    where id = p_match_id
  returning * into m;

  return m;
end;
$$;
