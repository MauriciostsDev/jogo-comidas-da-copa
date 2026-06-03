-- =============================================================
--  Jogo Comidas da Copa — Schema v2: sistema de amigos + social
--  Execute este arquivo no SQL Editor do Supabase
--  (É SEGURO rodar mesmo com dados existentes — só additive)
-- =============================================================

-- ---------- Profiles (código de convite de cada jogador) ----------
create table if not exists profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  invite_code  text unique not null,
  created_at   timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "read profiles" on profiles;
create policy "read profiles" on profiles
  for select to authenticated using (true);

drop policy if exists "manage own profile" on profiles;
create policy "manage own profile" on profiles
  for all to authenticated using (auth.uid() = user_id);

-- ---------- Amizades / Pares ----------
-- user1_id < user2_id sempre (ordem canônica) para evitar duplicata invertida
create table if not exists friendships (
  id         uuid primary key default gen_random_uuid(),
  user1_id   uuid not null references auth.users(id) on delete cascade,
  user2_id   uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user1_id, user2_id)
);

alter table friendships enable row level security;

drop policy if exists "read friendships" on friendships;
create policy "read friendships" on friendships
  for select to authenticated using (true);

drop policy if exists "manage friendships" on friendships;
create policy "manage friendships" on friendships
  for all to authenticated
  using (auth.uid() = user1_id or auth.uid() = user2_id);

-- ---------- Curtidas nos pratos do Social feed ----------
create table if not exists likes (
  match_id   uuid not null references matches(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

alter table likes enable row level security;

drop policy if exists "read likes" on likes;
create policy "read likes" on likes
  for select to authenticated using (true);

drop policy if exists "manage own likes" on likes;
create policy "manage own likes" on likes
  for all to authenticated using (auth.uid() = user_id);

-- ---------- Publica novas tabelas no Realtime ----------
do $$
declare
  t text;
begin
  foreach t in array array['likes', 'friendships', 'profiles'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end;
$$;

-- ---------- Funções ----------

-- Cria (ou retorna) perfil do usuário logado.
create or replace function get_or_create_profile()
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  p profiles;
  u auth.users;
  code text;
begin
  select * into p from profiles where user_id = auth.uid();
  if found then return p; end if;

  select * into u from auth.users where id = auth.uid();

  -- Gera código de 6 letras maiúsculas único
  loop
    code := upper(substring(md5(auth.uid()::text || clock_timestamp()::text) from 1 for 6));
    exit when not exists (select 1 from profiles where invite_code = code);
  end loop;

  insert into profiles (user_id, display_name, invite_code)
  values (
    auth.uid(),
    coalesce(
      (u.raw_user_meta_data->>'full_name'),
      split_part(u.email, '@', 1),
      'Jogador'
    ),
    code
  )
  on conflict (user_id) do update
    set display_name = excluded.display_name
  returning * into p;

  return p;
end;
$$;

-- Adiciona amigo pelo código de convite.
-- Retorna o perfil do amigo adicionado.
create or replace function add_friend_by_code(p_code text)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  target profiles;
  u1     uuid;
  u2     uuid;
begin
  if auth.uid() is null then
    raise exception 'Precisa estar logado.';
  end if;

  select * into target from profiles
    where upper(invite_code) = upper(trim(p_code));

  if not found then
    raise exception 'Código inválido. Verifique e tente de novo.';
  end if;

  if target.user_id = auth.uid() then
    raise exception 'Esse é o seu próprio código!';
  end if;

  -- Garante ordenação canônica
  u1 := least(auth.uid(), target.user_id);
  u2 := greatest(auth.uid(), target.user_id);

  insert into friendships (user1_id, user2_id)
  values (u1, u2)
  on conflict do nothing;

  return target;
end;
$$;

-- Toggle de curtida: curte se não curtiu, descurte se já curtiu.
-- Retorna true se agora está curtido, false se descurtido.
create or replace function toggle_like(p_match_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  already boolean;
begin
  if auth.uid() is null then
    raise exception 'Precisa estar logado.';
  end if;

  select exists(
    select 1 from likes where match_id = p_match_id and user_id = auth.uid()
  ) into already;

  if already then
    delete from likes where match_id = p_match_id and user_id = auth.uid();
    return false;
  else
    insert into likes (match_id, user_id) values (p_match_id, auth.uid());
    return true;
  end if;
end;
$$;

-- Trigger: auto-cria perfil quando novo usuário se registra
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  code text;
begin
  loop
    code := upper(substring(md5(new.id::text || clock_timestamp()::text) from 1 for 6));
    exit when not exists (select 1 from profiles where invite_code = code);
  end loop;

  insert into profiles (user_id, display_name, invite_code)
  values (
    new.id,
    coalesce(
      (new.raw_user_meta_data->>'full_name'),
      split_part(new.email, '@', 1),
      'Jogador'
    ),
    code
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
