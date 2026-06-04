-- =============================================================
--  Schema v7: Modo Solo
--  Adiciona suporte a partidas individuais (sem dupla).
--  Execute no SQL Editor do Supabase após os schemas anteriores.
-- =============================================================

-- Coluna que identifica o dono de uma partida solo (NULL = partida de dupla)
alter table matches add column if not exists solo_user_id uuid references auth.users(id);

create index if not exists matches_solo_user_id_idx
  on matches(solo_user_id)
  where solo_user_id is not null;

-- Sorteia um país e abre uma rodada solo para o jogador logado.
-- Se já existe uma rodada solo ativa para este usuário, devolve ela
-- (evita criar duplicatas ao clicar duas vezes).
create or replace function draw_country_solo()
returns matches
language plpgsql
security definer
set search_path = public
as $$
declare
  c  countries;
  m  matches;
  ac matches;
begin
  if auth.uid() is null then
    raise exception 'Precisa estar logado.';
  end if;

  select * into ac
    from matches
   where status <> 'done'
     and solo_user_id = auth.uid()
   order by created_at desc
   limit 1;
  if found then
    return ac;
  end if;

  select * into c
    from countries
   where not drawn
   order by random()
   limit 1
   for update skip locked;

  if not found then
    raise exception 'Acabaram os países! Todos os 48 já foram sorteados.';
  end if;

  update countries set drawn = true where id = c.id;

  insert into matches (country_id, status, writing_deadline, solo_user_id)
    values (c.id, 'writing', now() + interval '7 minutes', auth.uid())
    returning * into m;

  return m;
end;
$$;
