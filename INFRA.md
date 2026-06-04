# Infra & Contexto do Projeto

## O que é

**Comidas da Copa** é um jogo para casal: sorteia um país da Copa do Mundo 2026, cada um escreve um prato típico em 7 minutos, o app sorteia qual prato cozinhar, e vocês enviam a foto do prato pronto. Tem modo dupla (sincronizado ao vivo entre dois celulares) e modo solo.

---

## Servidor

Tudo roda numa única VM Oracle Cloud (Always Free):

| Dado | Valor |
|---|---|
| IP público | `147.15.7.227` |
| IP privado | `10.0.0.196` |
| OS | Ubuntu Linux |

---

## Frontend — Next.js

| Item | Detalhe |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| URL local | `http://147.15.7.227:3000` |
| Processo | `next-server` rodando direto na VM (não no Docker) |
| Porta | `3000` |
| Diretório | `/home/ubuntu/jogo-comidas-da-copa` |
| Start | `npm run dev` (dev) / `npm run build && npm start` (prod) |

O frontend consome o Supabase via variáveis de ambiente em `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://147.15.7.227:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key jwt>
```

---

## Backend — Supabase (self-hosted via Docker)

Supabase rodando localmente em Docker Compose, no diretório `/home/ubuntu/supabase-local`.

### Serviços e portas

| Container | Função | Porta externa |
|---|---|---|
| `supabase-kong` | API Gateway (entrada única para todos os serviços) | `8000` |
| `supabase-db` | PostgreSQL 15 | `5432` (só interno) |
| `supabase-auth` | Autenticação (GoTrue) | interno via Kong |
| `supabase-rest` | API REST automática (PostgREST) | interno via Kong |
| `supabase-realtime` | WebSockets / Realtime | interno via Kong |
| `supabase-storage` | Upload de arquivos (fotos dos pratos) | interno via Kong |
| `supabase-studio` | Painel de admin visual | interno (sem porta externa) |
| `supabase-meta` | Gerenciamento do schema | interno |
| `supabase-mail` | Servidor de email fake (Inbucket) para dev | `54324` |
| `supabase-pooler` | Connection pooler (Supavisor) | interno |
| `supabase-edge-functions` | Edge Functions | interno via Kong |
| `supabase-imgproxy` | Redimensionamento de imagens | interno |

### Acessos

| O quê | URL |
|---|---|
| API Supabase (Kong) | `http://147.15.7.227:8000` |
| Email fake (Inbucket) | `http://147.15.7.227:54324` |
| Studio (admin) | acessível apenas de dentro do servidor: `http://localhost:3000` (container) |

### Banco de dados

Para acessar o PostgreSQL direto:
```bash
sudo docker exec -it supabase-db psql -U postgres
```

Para rodar migrations:
```bash
sudo docker exec -i supabase-db psql -U postgres < supabase/schema_vX_nome.sql
```

---

## Schema (migrations)

As migrations ficam em `/home/ubuntu/jogo-comidas-da-copa/supabase/` e devem ser aplicadas **em ordem**:

| Arquivo | O que faz |
|---|---|
| `schema.sql` | Tabelas base, funções core, Realtime, Storage, seed dos 48 países |
| `schema_v2.sql` | Perfis de usuário, sistema de amigos, curtidas |
| `schema_v3_rooms.sql` | Salas (`COPA-XXXX`) para jogar em dupla |
| `schema_v4_gallery.sql` | Galeria editável: legenda, marcar dupla, exportar pro feed |
| `schema_v5_comments.sql` | Comentários no feed + avaliação por estrelas |
| `schema_v6_presentation.sql` | Nota de apresentação (0–10) aberta a qualquer usuário |
| `schema_v7_solo.sql` | Modo solo: coluna `solo_user_id` em matches + função `draw_country_solo` |

---

## Fluxo do jogo

```
Rooms (criar/entrar) → Lobby → Sortear país → Escrever prato (7 min)
→ Sorteio do prato → Cozinhar → Foto → Galeria
```

- **Modo Dupla**: dois jogadores na mesma sala; escrita sincronizada ao vivo via Supabase Realtime.
- **Modo Solo**: um jogador; cria um match isolado (`solo_user_id` vinculado ao usuário).

---

## Código-fonte

| Repositório | `github.com/MauriciostsDev/jogo-comidas-da-copa` |
|---|---|
| Branch principal | `master` |
| Deploy | Vercel (conectado ao repositório GitHub) |

> **Atenção:** o `.env.local` aponta para o Supabase local (`147.15.7.227:8000`).
> Para o deploy na Vercel funcionar em produção, as variáveis de ambiente da Vercel
> devem apontar para a URL pública correta do Supabase (ou para este mesmo IP, se a VM
> for acessível externamente).
