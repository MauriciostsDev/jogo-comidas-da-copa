# Handoff: Comidas da Copa 2026 — redesign retrô-arcade

## Overview
Jogo web em dupla com tema da Copa 2026: a dupla sorteia uma seleção, inventa um prato típico daquele país, cozinha de verdade, envia a foto e todos avaliam as fotos com estrelas (estilo iFood). Este pacote contém o **novo layout** (visual + fluxo) das 7 telas do jogo.

> O jogo **já existe e funciona** (auth + realtime via Supabase). A tarefa aqui é **trocar o layout/visual** pelo desta referência, mantendo o backend que já está pronto.

## About the Design Files
Os arquivos deste bundle (`Comidas da Copa.html`, `styles.css`, `app.js`, `data.js`) são **referências de design feitas em HTML/CSS/JS puro** — um protótipo que mostra o visual e o comportamento pretendidos, **não** código de produção pra copiar direto.

A tarefa é **recriar este design no ambiente já existente do projeto** (React/Next, Vue, etc., com Supabase), usando os padrões e bibliotecas que o codebase já adota. Todo o "multiplayer/realtime" do protótipo está **simulado** com `setTimeout`/mock — deve ser substituído pelas chamadas reais de Supabase que o projeto já tem.

## Fidelity
**Alta fidelidade (hifi).** Cores, tipografia, espaçamentos, sombras e interações são finais. Recrie a UI pixel-perfect usando os tokens listados abaixo. O `styles.css` é a fonte da verdade do visual.

---

## Design Tokens

### Fontes (Google Fonts)
- **Display / títulos / botões:** `'Press Start 2P'` (pixel). Usar com moderação; `line-height` ~1.55–1.6; `letter-spacing` 0.
- **Corpo / inputs:** `'VT323'` (monospace pixel, muito legível). Tamanho base do body: **22px** (20px em ≤560px), `letter-spacing` 0.3px, `line-height` 1.25.
- Import: `https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap`

### Escala tipográfica
- `h1`: `clamp(18px, 4.6vw, 30px)` — Press Start 2P
- `h2`: `clamp(14px, 3.2vw, 20px)` — Press Start 2P
- `h3`: `clamp(11px, 2.4vw, 14px)` — Press Start 2P
- `.lead`: `clamp(20px, 4vw, 26px)`, cor muted — VT323
- `.tiny`: 10px, Press Start 2P
- Labels de form: 10px, Press Start 2P
- Botões: 13px (lg 15px, sm 10px), Press Start 2P, UPPERCASE

### Paleta neon (compartilhada entre temas)
| token | hex |
|---|---|
| `--pink` | `#ff2d95` |
| `--cyan` | `#19e3ff` |
| `--yellow` | `#ffd23f` |
| `--green` | `#34e89e` |
| `--orange` | `#ff7a35` |
| `--purple` | `#b06bff` |

### Tema ESCURO (default) — `:root`
| token | valor |
|---|---|
| `--bg` | `#150a2e` |
| `--bg-grad` | `radial-gradient(circle at 50% -10%, #2a1257 0%, #150a2e 55%, #0c0620 100%)` |
| `--surface` | `#20123f` |
| `--surface-2` | `#2a1850` |
| `--line` (bordas) | `#4a2d8a` |
| `--ink` (texto) | `#f5f0ff` |
| `--muted` | `#b69fe6` |
| `--accent` | `#19e3ff` (cyan) |
| `--accent-2` | `#ff2d95` (pink) |
| `--shadow` | `#07030f` |
| `--grid` | `rgba(176,107,255,.10)` |
| `--scan` | `rgba(0,0,0,.16)` |
| `--glow` | `0 0 12px` |

### Tema CLARO — `[data-theme="light"]`
| token | valor |
|---|---|
| `--bg` | `#f3e7c9` |
| `--bg-grad` | `radial-gradient(circle at 50% -10%, #fff6dd 0%, #f3e7c9 55%, #e7d2a6 100%)` |
| `--surface` | `#fffaf0` |
| `--surface-2` | `#fff3d6` |
| `--line` | `#2a1b3d` |
| `--ink` | `#241634` |
| `--muted` | `#7c5e8f` |
| `--accent` | `#d4188f` |
| `--accent-2` | `#0091a8` |
| `--shadow` | `#2a1b3d` |
| `--grid` | `rgba(42,27,61,.07)` |
| `--scan` | `rgba(42,27,61,.05)` |
| `--glow` | `0 0` (sem brilho no claro) |

Toggle de tema: persistir em `localStorage` chave `cc-theme` (`"dark"` | `"light"`); aplicar via atributo `data-theme` no `<html>`.

### Outros tokens
- **Cantos:** `--radius: 0px` (tudo reto, estética pixel — **sem border-radius**).
- **Unidade pixel base:** `--pix: 4px` (espessura padrão das bordas).
- **Hit target mínimo:** `--tap: 48px`.
- **Espaçamentos comuns:** gaps de 6/8/12/18/20px; padding de card 22px (16px tight / mobile).

### Componentes-chave (estilo pixel)
- **Card** (`.card`): `background: var(--surface)`; borda `4px solid var(--line)`; **sombra dura sem blur** `box-shadow: 8px 8px 0 var(--shadow)`; padding 22px. Variante `.accent` troca a borda por `--accent`. "Bolts" = quadradinhos 6×6px nos cantos superiores.
- **Botão** (`.btn`): Press Start 2P 13px UPPERCASE; fundo `--accent`, texto escuro; borda `4px solid var(--line)`; sombra `5px 5px 0 var(--shadow)`. **Active:** `transform: translate(5px,5px)` + sombra zerada (efeito "afundar"). Variantes: `.pink .yellow .green .ghost`; tamanhos `.lg .sm`; `.block` (100%).
- **Input** (`.input`): fundo `--surface-2`; borda `4px solid var(--line)`; sombra interna `inset 3px 3px 0 rgba(0,0,0,.18)`; foco adiciona `0 0 0 2px var(--accent)` + borda accent.
- **Badge/chip** (`.badge`): 9px Press Start 2P, borda 2px. `.dot` = ponto verde pulsante (status "ao vivo").
- **Texto neon** (`.neon`, `.neon-pink`, etc.): cor + `text-shadow: var(--glow) <cor>`.

### Atmosfera / overlays (fixos, `pointer-events:none`)
- **Scanlines CRT:** `body::before` — `repeating-linear-gradient(0deg, transparent 0 2px, var(--scan) 2px 4px)`, `mix-blend-mode: multiply`, `opacity:.55`, `z-index:9999`.
- **Grid de fundo:** `body::after` — duas `linear-gradient` de `--grid` em `background-size:32px 32px`, com `mask-image` que esmaece topo/base, `z-index:-1`.

---

## Layout global
- Container central `.stage`: `max-width: 760px`, centralizado, `padding: 90px 18px 120px` (espaço pra topbar fixa em cima e nav fixa embaixo). É um flex column de altura mínima 100dvh.
- **Topbar fixa** (topo): logo "⚽ COMIDAS **DA COPA**" + toggle de tema (☀️/🌙). Borda inferior 4px, leve `backdrop-filter: blur(4px)`.
- **Nav inferior fixa** (`.nav`): 7 botões (um por tela) com emoji + label, scroll horizontal no mobile. Serve como navegador do protótipo; no app real pode virar o controlador de etapas do jogo. Botão ativo ganha `.on` (cor accent + borda).
- **Stepper** (`.steps`): 5 bolinhas numeradas ligadas por barras, mostrando a etapa atual (`.cur` = accent com glow, `.done` = verde). Mapa tela→etapa: login/lobby=0, draw=1, write/pick=2, cook=3, gallery=4.
- Cada tela é uma `<section class="screen">`; só a ativa recebe `.active` (`display:flex`). Entrada anima só `transform: translateY(8px)→0` em 0.35s (**sem fade de opacidade** — importante pra não "sumir" em primeiro paint/export/reduced-motion).
- `@media (prefers-reduced-motion: reduce)` zera as animações.
- Breakpoint principal: **560px** (reduz fontes, sombras e tamanhos).

---

## Screens / Views

### 1. Login / Cadastro (`#sc-login`)
- **Propósito:** entrar com e-mail + senha (Supabase Auth). Alterna login ↔ cadastro.
- **Layout:** centralizado. Marquee de bandeiras rolando no topo → `h1` neon "COMIDAS DA COPA" (com leve `float`) → `.lead` "Sorteie · Cozinhe · Avalie 🏆" → card de auth (`max-width:420px`, `.accent .bolts`).
- **Card auth:** título "INSERT COIN" (login) / "NEW PLAYER" (cadastro); campos: **Nome de jogador** (só no cadastro), **E-mail**, **Senha**. Botão block lg "ENTRAR ▸" / "CRIAR CONTA ▸". Divider "OU". Link de troca "Não tem conta? CADASTRE-SE" ↔ "Já tem conta? ENTRAR".
- **Comportamento:** ao submeter, salva o nome (uppercase, 14 chars) e vai pro Lobby.

### 2. Sala de espera (`#sc-lobby`)
- **Propósito:** ver a dupla entrar ao vivo; ambos marcam "Pronto"; só então libera o sorteio.
- **Layout:** título "🚪 SALA DE ESPERA" + badge "SALA #2026" (dot pulsante). Texto de dica dinâmico. Dois `.player` slots empilhados.
- **Player slot:** avatar (emoji 54×54 com borda), nome (Press Start 2P 12px) + meta, e `ready-tag` à direita ("AGUARDANDO" / "✓ PRONTO" verde). Slot do "eu" tem borda accent (`.me`).
- **Slot da dupla:** enquanto não entrou, mostra "PROCURANDO…" com os três pontinhos `.typing` animados. Quando entra → renderiza o jogador 2.
- **Ações:** botão verde "ESTOU PRONTO" (vira "CANCELAR" quando pronto) + botão amarelo "LIBERAR SORTEIO 🎲" (**disabled** até os dois prontos).
- **Realtime real:** trocar o `setTimeout` que faz a dupla "entrar" e "ficar pronta" por presença/estado do Supabase Realtime. Disparar pequeno confete quando o parceiro fica pronto.

### 3. Sorteio da seleção (`#sc-draw`)
- **Propósito:** sortear 1 das 48 seleções com cronômetro de 7 min.
- **Layout:** título "🎲 SORTEIO DA SELEÇÃO" → **roleta** (`.reel`, altura 120px, mostra 1 item por vez: bandeira 64px + nome) → botão pink lg "GIRAR A ROLETA 🎰".
- **Animação da roleta:** `reel-track` é uma coluna de ~26 itens; `transform: translateY(-(idx*120)px)` com `transition: 3.1s cubic-bezier(.12,.78,.18,1)`. O item de pouso recebe a seleção sorteada.
- **Resultado:** card `.accent .bolts` "SUA SELEÇÃO" com bandeira gigante (84px), nome (`h2`) e confederação (badge roxo). Confete (~80 partículas).
- **Cronômetro:** "07:00" em Press Start 2P amarelo + barra `.timerbar` que decai de verde→amarelo→laranja; `<60s` fica laranja piscando (`.warn`). Atualiza a cada 1s.
- **48 seleções:** ver `data.js` — array `TEAMS` de `{f: bandeira(emoji), n: nome, c: confederação}`. Confederações: CONCACAF, CONMEBOL, UEFA, CAF, AFC, OFC.

### 4. Escrever o prato (`#sc-write`)
- **Propósito:** cada jogador escreve um prato típico do país; dá pra ver a dupla "digitando ao vivo".
- **Layout:** título "✍️ ESCREVA O PRATO" + badge com bandeira/país sorteado. Input "SEU PRATO TÍPICO" (placeholder "ex: Feijoada, Paella, Ramen…", max 40). Card "👩‍🍳 SUA DUPLA" mostrando indicador `.typing` "digitando…" e o texto da dupla aparecendo caractere a caractere (`.live-text` cyan com cursor `.caret` piscando); ao terminar, vira badge "✓ dupla finalizou".
- **Ação:** botão verde "CONFIRMAR PRATO ▸" (disabled enquanto o input estiver vazio).
- **Realtime real:** o "digitando ao vivo" (hoje `simulateMateTyping`) deve vir de broadcast do parceiro.

### 5. Sorteio do prato (`#sc-pick`)
- **Propósito:** o sistema sorteia um dos dois pratos; o jogador pode trocar pela outra opção com confirmação.
- **Layout:** título "🍴 PRATO SORTEADO" + dois `.dish`: o escolhido (`.win`, borda verde + tag "🎲 SORTEADO") e a outra opção (tag "OUTRA OPÇÃO"). Cada dish tem emoji, nome (Press Start 2P 13px) e "por <jogador>".
- **Ações:** botão ghost "TROCAR PELA OUTRA ⇄" → abre **modal de confirmação** ("Trocar para "X"?" com NÃO / SIM, TROCAR). Botão amarelo lg "BORA COZINHAR 🔥".

### 6. Cozinhar + foto (`#sc-cook`)
- **Propósito:** cozinhar de verdade e enviar a foto do prato pronto.
- **Layout:** título "📸 COZINHE & FOTOGRAFE" + badge bandeira. Texto "Quando o prato **<nome>** estiver pronto, mande a foto." → **dropzone** (`.dropzone`, borda tracejada 4px, min-height 220px) com 🍳 "TOQUE PARA ENVIAR / ou arraste a foto aqui".
- **Comportamento:** clicar abre file input (`accept="image/*" capture="environment"`); aceita drag-and-drop (`.drag` realça); preview da imagem em `.preview-wrap` (borda accent + sombra). Botão "TIRAR OUTRA ↺" reseta; botão verde lg "ENVIAR PRA GALERIA ▸" (disabled sem foto). Ao enviar: confete grande (~100) + adiciona à galeria.
- **Real:** `readPhoto`/`sendPhoto` → upload no Supabase Storage e insert na tabela de fotos.

### 7. Galeria + avaliações (`#sc-gallery`)
- **Propósito:** quadro de fotos onde qualquer um avalia com estrelas (1–5) + comentário, estilo iFood.
- **Layout:** título "⭐ QUADRO DE FOTOS" + badge "estilo iFood". Grid responsivo `repeat(auto-fill, minmax(230px,1fr))`, gap 18px.
- **Card de foto** (`.gcard`, hover levanta 2px): foto 4:3 com bandeira no canto sup-esq e nota "★ X.X" no canto inf-dir; corpo com nome do prato (Press Start 2P 12px), autores (com "· VOCÊS" em accent se for da dupla), **estrelas de input** (1–5, hover escala, clique preenche com `pop`), textarea de comentário, botão pink sm "AVALIAR ★", e lista de avaliações existentes (quem + estrelas + texto).
- **Comportamento:** sem estrela selecionada → toast "Escolha as estrelas ⭐"; ao enviar → confete pequeno + recalcula média.
- **Real:** `gallery` (hoje seed em `seedGallery`) vem da tabela de fotos; cada avaliação é um insert; média calculada das reviews.

---

## Interactions & Behavior (resumo técnico)
- **Navegação:** `go(id)` alterna `.active` entre as 7 sections, atualiza nav + stepper, scroll ao topo, e chama `onEnter[id]()` (hook por tela).
- **Animações leves (não travam):**
  - Entrada de tela: slide 8px (sem fade).
  - `blink` (cursores/dot ao vivo), `spin` (bola da logo), `bounce` (pontos digitando), `pop` (estrela), `marquee` (bandeiras), `float` (título).
  - **Confete:** canvas leve (`#confetti`), capado em 400 partículas, auto-para quando esvazia (sem loop permanente). Usado em: dupla pronta, seleção sorteada, prato sorteado, foto enviada, avaliação.
- **Modal:** overlay com blur; callback de confirmação.
- **Toast:** mensagem efêmera (2.4s) no rodapé.
- **Estados:** disabled em botões (auth incompleto, dupla não pronta, prato vazio, sem foto, sem estrela).

## State Management (variáveis do fluxo)
Objeto `state` no `app.js`:
- `me {name, emoji, ready}`, `mate {name, emoji, ready, joined}`
- `team` (seleção sorteada), `myDish`, `mateDish`, `chosen`, `_other`, `photo`
No app real, esse estado deve refletir a sessão/sala do Supabase (jogadores, prontidão, seleção, pratos, foto, avaliações) em tempo real.

## Assets
- **Sem imagens externas.** Bandeiras e ícones são **emojis** (bandeiras regionais + emojis de comida). Em capturas/export podem aparecer como sigla (ex.: "BR") em ambientes sem glifos de bandeira, mas renderizam normal em navegadores/dispositivos reais. Se quiser robustez total cross-platform, considere trocar por sprites/SVG de bandeiras no codebase.
- Fontes: Google Fonts (Press Start 2P, VT323).

## Files
- `Comidas da Copa.html` — estrutura das 7 telas, topbar, nav, stepper, modal, toast.
- `styles.css` — design system completo (tokens + componentes + animações). **Fonte da verdade do visual.**
- `app.js` — roteamento de telas, toggle de tema, e toda a lógica do fluxo (com multiplayer **simulado** a ser substituído por Supabase).
- `data.js` — as 48 seleções (`TEAMS`) + dicas de prato (`DISH_HINT`).

## Screenshots (referência visual)
Pasta `screenshots/` — as 7 telas nos dois temas:
- `01-dark.png` … `07-dark.png` — tema escuro (login, sala, sorteio, prato, escolha, cozinhar, galeria)
- `01-light.png` … `07-light.png` — tema claro (mesma ordem)

> Nota: nas capturas as bandeiras aparecem como sigla (ex.: "NZ", "BR") porque o renderizador de screenshot não tem glifos de bandeira-emoji; em navegadores/dispositivos reais saem as bandeiras coloridas. Use os screenshots como referência de **layout, cor e tipografia**.
