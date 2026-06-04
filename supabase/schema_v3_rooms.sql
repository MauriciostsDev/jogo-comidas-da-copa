-- =============================================================
--  Jogo Comidas da Copa — Schema v3: Salas (criar / entrar com código)
--  Execute este arquivo no SQL Editor do Supabase
--  (É SEGURO rodar mesmo com dados existentes — só additive)
-- =============================================================

-- ---------- Salas ----------
-- code  : COPA-XXXX (4 chars, charset sem 0/O/1/I)
-- host  : quem criou; guest : quem entrou com o código
-- status: waiting (criada, sem dupla) | active (dupla entrou) | closed
create table if not exists rooms (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,
  host_id    uuid not null references auth.users(id) on delete cascade,
  guest_id   uuid references auth.users(id) on delete set null,
  status     text not null default 'waiting',
  created_at timestamptz not null default now()
);

alter table rooms enable row level security;

-- Leitura liberada para logados (o Realtime depende do SELECT).
-- Escrita só pelas funções security definer abaixo.
drop policy if exists "read rooms" on rooms;
create policy "read rooms" on rooms
  for select to authenticated using (true);

-- ---------- Publica no Realtime ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rooms'
  ) then
    execute 'alter publication supabase_realtime add table rooms';
  end if;
end;
$$;

-- ---------- Funções ----------

-- Cria uma sala nova com código COPA-XXXX único e retorna a sala.
-- Limpa salas anteriores deste host que ainda estavam "waiting"
-- (evita acumular salas órfãs quando se clica "gerar outro").
create or replace function create_room()
returns rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sem 0/O/1/I
  c     text;
  i     int;
  r     rooms;
begin
  if auth.uid() is null then
    raise exception 'Precisa estar logado.';
  end if;

  delete from rooms where host_id = auth.uid() and status = 'waiting';

  loop
    c := 'COPA-';
    for i in 1..4 loop
      c := c || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from rooms where code = c);
  end loop;

  insert into rooms (code, host_id) values (c, auth.uid()) returning * into r;
  return r;
end;
$$;

-- Entra numa sala pelo código. Normaliza/valida o formato COPA-XXXX,
-- impede sala cheia e registra o guest. Retorna a sala.
create or replace function join_room_by_code(p_code text)
returns rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v text;
  r rooms;
begin
  if auth.uid() is null then
    raise exception 'Precisa estar logado.';
  end if;

  v := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
  if position('COPA-' in v) <> 1 then
    v := 'COPA-' || regexp_replace(v, '^COPA-?', '');
  end if;
  if v !~ '^COPA-[A-Z0-9]{4}$' then
    raise exception 'Código inválido — ex: COPA-7X2K';
  end if;

  select * into r from rooms where code = v;
  if not found then
    raise exception 'Sala não encontrada. Confira o código.';
  end if;

  -- Entrar na própria sala: apenas retorna (host reabrindo).
  if r.host_id = auth.uid() then
    return r;
  end if;

  if r.guest_id is not null and r.guest_id <> auth.uid() then
    raise exception 'Essa sala já está cheia.';
  end if;

  update rooms
     set guest_id = auth.uid(), status = 'active'
   where id = r.id
  returning * into r;

  return r;
end;
$$;

-- Sai da sala / fecha. Host fecha a sala; guest só se desvincula.
create or replace function leave_room(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Precisa estar logado.';
  end if;

  update rooms set guest_id = null, status = 'waiting'
    where id = p_room_id and guest_id = auth.uid();

  update rooms set status = 'closed'
    where id = p_room_id and host_id = auth.uid();
end;
$$;
