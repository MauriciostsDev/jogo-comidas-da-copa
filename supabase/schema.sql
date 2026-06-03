-- =============================================================
--  Jogo Comidas da Copa — schema completo do Supabase
--  Rode este arquivo inteiro no SQL Editor do Supabase
--  (Dashboard > SQL Editor > New query > cole tudo > Run)
-- =============================================================

-- ---------- Tabelas ----------

create table if not exists countries (
  id            serial primary key,
  name_pt       text not null,
  flag          text not null,
  confederation text not null,
  drawn         boolean not null default false,
  created_at    timestamptz not null default now()
);

create table if not exists matches (
  id               uuid primary key default gen_random_uuid(),
  country_id       int references countries(id),
  status           text not null default 'writing', -- writing | cooking | done
  writing_deadline timestamptz not null,
  chosen_food_id   uuid,
  photo_url        text,
  created_at       timestamptz not null default now()
);

create table if not exists foods (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references matches(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  text        text not null,
  created_at  timestamptz not null default now(),
  unique (match_id, user_id) -- cada jogador tem 1 prato por rodada (editável)
);

alter table matches
  drop constraint if exists matches_chosen_food_id_fkey;
alter table matches
  add constraint matches_chosen_food_id_fkey
  foreign key (chosen_food_id) references foods(id) on delete set null;

-- Avaliações dos pratos prontos (estrelas de 1 a 5 + comentário, estilo iFood).
create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references matches(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  rating      int  not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  unique (match_id, user_id) -- cada pessoa avalia um prato uma vez (editável)
);

-- ---------- Row Level Security ----------
-- Leitura liberada para usuários logados (o Realtime depende do SELECT).
-- Escrita só acontece pelas funções abaixo (security definer), então
-- não criamos policies de INSERT/UPDATE diretos.

alter table countries enable row level security;
alter table matches   enable row level security;
alter table foods     enable row level security;
alter table reviews   enable row level security;

drop policy if exists "read countries" on countries;
create policy "read countries" on countries
  for select to authenticated using (true);

drop policy if exists "read matches" on matches;
create policy "read matches" on matches
  for select to authenticated using (true);

drop policy if exists "read foods" on foods;
create policy "read foods" on foods
  for select to authenticated using (true);

drop policy if exists "read reviews" on reviews;
create policy "read reviews" on reviews
  for select to authenticated using (true);

-- ---------- Funções (atômicas e seguras) ----------

-- Sorteia 1 país ainda não sorteado e abre uma rodada de 7 minutos.
-- Se já existe uma rodada em andamento, devolve ela (evita sorteio duplo
-- quando os dois clicam ao mesmo tempo).
create or replace function draw_country()
returns matches
language plpgsql
security definer
set search_path = public
as $$
declare
  c countries;
  m matches;
  active matches;
begin
  select * into active from matches where status <> 'done'
    order by created_at desc limit 1;
  if found then
    return active;
  end if;

  select * into c from countries
    where not drawn
    order by random()
    limit 1
    for update skip locked;

  if not found then
    raise exception 'Acabaram os países! Todos os 48 já foram sorteados.';
  end if;

  update countries set drawn = true where id = c.id;

  insert into matches (country_id, status, writing_deadline)
    values (c.id, 'writing', now() + interval '7 minutes')
    returning * into m;

  return m;
end;
$$;

-- Salva (ou atualiza) o prato típico que o jogador escreveu.
create or replace function submit_food(p_match_id uuid, p_text text, p_author text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Precisa estar logado.';
  end if;
  insert into foods (match_id, user_id, author_name, text)
    values (p_match_id, auth.uid(), p_author, p_text)
  on conflict (match_id, user_id)
    do update set text = excluded.text, author_name = excluded.author_name;
end;
$$;

-- Sorteia aleatoriamente um dos pratos escritos e passa para a fase "cozinhar".
create or replace function choose_food(p_match_id uuid)
returns matches
language plpgsql
security definer
set search_path = public
as $$
declare
  f foods;
  m matches;
begin
  select * into m from matches where id = p_match_id;
  if m.chosen_food_id is not null then
    return m; -- já foi sorteado
  end if;

  select * into f from foods where match_id = p_match_id
    order by random() limit 1;
  if not found then
    raise exception 'Ninguém escreveu nenhum prato ainda.';
  end if;

  update matches
    set chosen_food_id = f.id, status = 'cooking'
    where id = p_match_id and chosen_food_id is null
    returning * into m;

  return m;
end;
$$;

-- Anexa a foto do prato pronto e fecha a rodada.
create or replace function attach_photo(p_match_id uuid, p_url text)
returns matches
language plpgsql
security definer
set search_path = public
as $$
declare
  m matches;
begin
  update matches set photo_url = p_url, status = 'done'
    where id = p_match_id
    returning * into m;
  return m;
end;
$$;

-- Salva (ou atualiza) a avaliação de um prato pronto: estrelas (1–5) + comentário.
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
  insert into reviews (match_id, user_id, author_name, rating, comment)
    values (p_match_id, auth.uid(), p_author, p_rating, nullif(btrim(p_comment), ''))
  on conflict (match_id, user_id)
    do update set rating = excluded.rating,
                  comment = excluded.comment,
                  author_name = excluded.author_name,
                  created_at = now();
end;
$$;

-- ---------- Realtime ----------
-- Publica matches, foods e reviews para a sincronização ao vivo.
alter publication supabase_realtime add table matches;
alter publication supabase_realtime add table foods;
alter publication supabase_realtime add table reviews;

-- ---------- Storage (fotos dos pratos) ----------
insert into storage.buckets (id, name, public)
  values ('fotos', 'fotos', true)
  on conflict (id) do nothing;

drop policy if exists "fotos read" on storage.objects;
create policy "fotos read" on storage.objects
  for select using (bucket_id = 'fotos');

drop policy if exists "fotos upload" on storage.objects;
create policy "fotos upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'fotos');

-- ---------- Seed: 48 seleções da Copa 2026 ----------
insert into countries (name_pt, flag, confederation) values
  ('Argentina', '🇦🇷', 'CONMEBOL'),
  ('Brasil', '🇧🇷', 'CONMEBOL'),
  ('Colômbia', '🇨🇴', 'CONMEBOL'),
  ('Equador', '🇪🇨', 'CONMEBOL'),
  ('Paraguai', '🇵🇾', 'CONMEBOL'),
  ('Uruguai', '🇺🇾', 'CONMEBOL'),
  ('Inglaterra', '🇬🇧', 'UEFA'),
  ('França', '🇫🇷', 'UEFA'),
  ('Croácia', '🇭🇷', 'UEFA'),
  ('Noruega', '🇳🇴', 'UEFA'),
  ('Portugal', '🇵🇹', 'UEFA'),
  ('Alemanha', '🇩🇪', 'UEFA'),
  ('Holanda', '🇳🇱', 'UEFA'),
  ('Áustria', '🇦🇹', 'UEFA'),
  ('Bélgica', '🇧🇪', 'UEFA'),
  ('Escócia', '🇬🇧', 'UEFA'),
  ('Espanha', '🇪🇸', 'UEFA'),
  ('Suíça', '🇨🇭', 'UEFA'),
  ('Suécia', '🇸🇪', 'UEFA'),
  ('Turquia', '🇹🇷', 'UEFA'),
  ('Bósnia e Herzegovina', '🇧🇦', 'UEFA'),
  ('Tchéquia', '🇨🇿', 'UEFA'),
  ('Argélia', '🇩🇿', 'CAF'),
  ('Cabo Verde', '🇨🇻', 'CAF'),
  ('Costa do Marfim', '🇨🇮', 'CAF'),
  ('Egito', '🇪🇬', 'CAF'),
  ('Gana', '🇬🇭', 'CAF'),
  ('Marrocos', '🇲🇦', 'CAF'),
  ('Senegal', '🇸🇳', 'CAF'),
  ('África do Sul', '🇿🇦', 'CAF'),
  ('Tunísia', '🇹🇳', 'CAF'),
  ('RD Congo', '🇨🇩', 'CAF'),
  ('Austrália', '🇦🇺', 'AFC'),
  ('Irã', '🇮🇷', 'AFC'),
  ('Japão', '🇯🇵', 'AFC'),
  ('Jordânia', '🇯🇴', 'AFC'),
  ('Coreia do Sul', '🇰🇷', 'AFC'),
  ('Catar', '🇶🇦', 'AFC'),
  ('Arábia Saudita', '🇸🇦', 'AFC'),
  ('Uzbequistão', '🇺🇿', 'AFC'),
  ('Iraque', '🇮🇶', 'AFC'),
  ('Estados Unidos', '🇺🇸', 'CONCACAF'),
  ('Canadá', '🇨🇦', 'CONCACAF'),
  ('México', '🇲🇽', 'CONCACAF'),
  ('Curaçao', '🇨🇼', 'CONCACAF'),
  ('Haiti', '🇭🇹', 'CONCACAF'),
  ('Panamá', '🇵🇦', 'CONCACAF'),
  ('Nova Zelândia', '🇳🇿', 'OFC')
on conflict do nothing;
