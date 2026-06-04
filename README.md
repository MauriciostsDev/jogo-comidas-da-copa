# 🍽️⚽ Comidas da Copa

Joguinho para casal: sorteia um país da Copa do Mundo 2026, vocês têm **7 minutos**
para escrever cada um um prato típico, o app **sorteia um dos dois pratos**, e quando
ficar pronto vocês enviam a **foto**. Tudo **sincronizado ao vivo** entre os dois
celulares e com **login por email e senha**.

## Tecnologias

- **Next.js 16** (App Router) — deploy na Vercel
- **Supabase** — banco de dados (Postgres), login (Auth), tempo real (Realtime) e fotos (Storage)

---

## 🚀 Como colocar no ar (passo a passo)

### 1) Criar o projeto no Supabase

1. Acesse <https://supabase.com> e crie um projeto (free). Anote a senha do banco.
2. Quando o projeto subir, vá em **SQL Editor → New query** e rode, **nesta ordem**,
   colando cada arquivo inteiro e clicando em **Run** (todos são idempotentes/additive —
   pode rodar de novo sem medo):
   1. [`supabase/schema.sql`](supabase/schema.sql) — tabelas, funções, Realtime, bucket de fotos e as 48 seleções.
   2. [`supabase/schema_v2.sql`](supabase/schema_v2.sql) — perfis, sistema de amigos e curtidas do feed social.
   3. [`supabase/schema_v3_rooms.sql`](supabase/schema_v3_rooms.sql) — salas (criar/entrar com código `COPA-XXXX`).
3. Vá em **Project Settings → API** e copie:
   - **Project URL** → vira `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → vira `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. (Recomendado, por serem só vocês dois) Vá em **Authentication → Sign In / Providers → Email**
   e **desligue "Confirm email"**. Assim o cadastro já entra direto, sem precisar confirmar email.

### 2) Rodar localmente (opcional, para testar)

```bash
cp .env.example .env.local   # no Windows: copy .env.example .env.local
# preencha as duas variáveis no .env.local com os valores do passo 1
npm install
npm run dev
```

Abra <http://localhost:3000>, cadastre você e sua namorada (duas contas) e joguem.

### 3) Deploy na Vercel

1. Suba este código para o GitHub (já configurado: `MauriciostsDev/jogo-comidas-da-copa`).
2. Em <https://vercel.com> → **Add New → Project** → importe o repositório.
3. Em **Environment Variables**, adicione as duas variáveis:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Clique em **Deploy**.

### 4) Domínio `mauriciosts.com`

1. No projeto da Vercel → **Settings → Domains** → adicione `mauriciosts.com`
   (e/ou `jogo.mauriciosts.com` se quiser num subdomínio).
2. A Vercel mostra o registro de DNS (um `A` para o domínio raiz ou um `CNAME`
   para subdomínio). Configure no painel onde você comprou o domínio.
3. Em **Supabase → Authentication → URL Configuration**, coloque sua URL final
   (ex.: `https://mauriciosts.com`) em **Site URL**.

Pronto! 🎉

---

## 🎮 Como funciona o jogo

1. Os dois fazem login.
2. Alguém clica em **Sortear país** → sai um país ainda não sorteado e começa o cronômetro de 7 min.
3. Cada um escreve um prato típico (dá pra ver a dupla digitando ao vivo).
4. Quando os dois enviam (ou o tempo acaba), o app **sorteia um dos pratos**.
5. Vocês cozinham e enviam a **foto do prato pronto**.
6. Tudo fica salvo no banco. O botão **↺** recomeça e zera os sorteios.

## Estrutura

| Arquivo | O quê |
|---|---|
| [`supabase/schema.sql`](supabase/schema.sql) | Banco, funções, Realtime, Storage e seed dos países |
| [`supabase/schema_v2.sql`](supabase/schema_v2.sql) | Perfis, amigos e curtidas do feed social |
| [`supabase/schema_v3_rooms.sql`](supabase/schema_v3_rooms.sql) | Salas: criar/entrar com código `COPA-XXXX` |
| [`src/lib/supabase/`](src/lib/supabase/) | Clientes Supabase (navegador, servidor, middleware) |
| [`src/app/login/`](src/app/login/) | Tela e ações de login/cadastro |
| [`src/app/actions.ts`](src/app/actions.ts) | Ações do jogo (sortear, prato, foto, salas) |
| [`src/components/Rooms.tsx`](src/components/Rooms.tsx) | Tela "Sala de Jogo" (criar/entrar com código) |
| [`src/components/Game.tsx`](src/components/Game.tsx) | Tela do jogo com sincronização ao vivo |
