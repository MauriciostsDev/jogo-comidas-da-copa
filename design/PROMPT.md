# PROMPT — Reconstruir "Comidas da Copa 2026" (idêntico)

Use este prompt para recriar o app do zero, **pixel a pixel e interação por interação**. É um protótipo web mobile-first, single-page, em HTML/CSS/JS puro (sem frameworks), com estética **retrô-arcade / CRT anos 80**. Tema: Copa do Mundo 2026 — duplas sorteiam uma seleção, escolhem um prato típico daquele país, cozinham, fotografam e a comunidade avalia. É uma **rede social de culinária**.

> Construa exatamente 4 arquivos: `Comidas da Copa.html`, `styles.css`, `app.js`, `data.js`. Tudo em **português do Brasil**.

---

## 1. DESIGN SYSTEM (obrigatório, não inventar)

### Fontes (Google Fonts)
- **Display / títulos / botões / labels:** `'Press Start 2P'` (pixel). Variável `--display`.
- **Corpo / textos:** `'VT323'` (mono retrô). Variável `--body`. Base `font-size: 22px`, `line-height: 1.25`.
- Import: `@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');`

### Paleta neon (tokens compartilhados)
```
--pink:#ff2d95; --cyan:#19e3ff; --yellow:#ffd23f;
--green:#34e89e; --orange:#ff7a35; --purple:#b06bff;
```

### Tema ESCURO (padrão — CRT roxo)
```
--bg:#150a2e; --bg-grad:radial-gradient(circle at 50% -10%, #2a1257 0%, #150a2e 55%, #0c0620 100%);
--surface:#20123f; --surface-2:#2a1850; --line:#4a2d8a;
--ink:#f5f0ff; --muted:#b69fe6; --accent:var(--cyan); --accent-2:var(--pink);
--shadow:#07030f; --grid:rgba(176,107,255,.10); --scan:rgba(0,0,0,.16); --glow:0 0 12px;
```

### Tema CLARO (sépia arcade) — `[data-theme="light"]`
```
--bg:#f3e7c9; --bg-grad:radial-gradient(circle at 50% -10%, #fff6dd 0%, #f3e7c9 55%, #e7d2a6 100%);
--surface:#fffaf0; --surface-2:#fff3d6; --line:#2a1b3d;
--ink:#241634; --muted:#7c5e8f; --accent:#d4188f; --accent-2:#0091a8;
--shadow:#2a1b3d; --grid:rgba(42,27,61,.07); --scan:rgba(42,27,61,.05); --glow:0 0 0;
```
Toggle no topbar persiste em `localStorage('cc-theme')`. Botão mostra ☀️ CLARO / 🌙 ESCURO.

### Regras visuais
- `--radius: 0px` — **cantos sempre duros** (sem border-radius nos componentes).
- `--pix: 4px` (unidade base). Bordas tipicamente 3–4px sólidas em `--line`.
- **Sombras 8-bit:** sólidas e deslocadas, ex. `box-shadow: 5px 5px 0 var(--shadow)` (não usar blur, exceto o glow neon).
- **Bolts (parafusos):** classe `.bolts` desenha 4 quadradinhos nos cantos dos cards (via `::before/::after` ou pseudo). Cor pink.
- **Overlay CRT global:** `body::before` = scanlines `repeating-linear-gradient(0deg, transparent 0 2px, var(--scan) 2px 4px)` com `mix-blend-mode:multiply; opacity:.55; z-index:9999; pointer-events:none`. `body::after` = grid 32×32px em `--grid` com máscara de fade vertical, `z-index:-1`.
- `-webkit-font-smoothing:none` no body (pixelado).
- Texto neon: `.neon`/`.neon-pink`/`.neon-yellow`/`.neon-green` = cor + `text-shadow: var(--glow) <cor>`.
- **Sem gradientes "AI-slop", sem cantos arredondados.** Emojis SÃO parte da linguagem visual (bandeiras, comida, ícones).

### Componentes-base a criar no CSS
- `.btn` (+ variantes `green pink yellow ghost`, tamanhos `sm lg`, `block`, `grow`): fundo da cor, borda, sombra sólida 8-bit, no `:active` desloca `translate(3px,3px)` e zera a sombra (efeito de tecla pressionada).
- `.card` (+ `.bolts`, `.accent` = borda em destaque, `.tight`): superfície com borda 4px + sombra. `.card-title` em display, pequeno, cor accent.
- `.field` + `.label` (display, 10px, muted) + `.input` / `textarea.input` (fundo surface-2, borda, fonte body grande).
- `.badge` (+ `.dot` = bolinha pulsante antes do texto, `.confed`): pílula pequena display.
- `.divider` (linha com texto "OU" centralizado).
- `.toast` (notificação flutuante embaixo) + função `toast(msg)`.
- `.modal-overlay` + `.modal-box` (confirmar/cancelar) + funções `openModal(htmlMsg, onYes)`.
- `<canvas id="confetti">` fullscreen + função `confetti(n)` que dispara n partículas nas cores neon.
- `.steps` — stepper de progresso no topo (5 passos: dots 1–5 ligados por barras; estados `.cur` e `.done`).
- `.topbar` (marca "⚽ COMIDAS **DA COPA**" + toggle de tema) e `.nav` (navegador inferior do protótipo).
- Animações: `screen-in` (entrada de tela), `floaty` (flutuar título), `typing` (3 bolinhas "digitando"), `caret` (cursor piscando), blink/pop.

---

## 2. ESTRUTURA / LAYOUT
- `<html lang="pt-BR" data-theme="dark">`. Favicons linkados (16/32/180).
- `.topbar` fixa no topo; `.nav` fixa embaixo (navegador de protótipo com botões para cada tela).
- `<main class="stage">` central, `max-width:760px`, `padding:90px 18px 120px`, flex coluna.
- Cada tela é `<section id="sc-XXX" class="screen">`; a ativa recebe `.active` (só ela aparece, `display:flex` coluna, gap 20).
- **Roteamento (app.js):** array `SCREENS = ["login","rooms","lobby","draw","write","pick","cook","gallery","social"]`. Função `go(id)` ativa a section, marca o `.nav-btn` correspondente, atualiza o stepper via `STEP_OF = {login:0,rooms:0,lobby:0,draw:1,write:2,pick:2,cook:3,gallery:4,social:4}`, faz scroll ao topo e chama `onEnter[id]()` se existir.
- `.nav` tem botões: 🎮 Login · 🚪 Sala · 🎲 Sorteio · ✍️ Prato · 🍴 Escolha · 📸 Cozinhar · 🏆 Galeria · 🌐 Social.

### Objeto `state` (em app.js)
```js
const state = {
  me:{name:"VOCÊ",emoji:"🧑‍🍳",ready:false},
  mate:{name:"PARCEIRO",emoji:"👩‍🍳",ready:false,joined:false},
  team:null, myDish:"", mateDish:"", chosen:null, photo:null,
  room:{code:"", isHost:true}
};
```

---

## 3. TELAS (fluxo completo)

### 1) LOGIN (`sc-login`, ativa por padrão)
- Marquee de bandeiras rolando no topo (`.flags-marquee`).
- Título `COMIDAS DA COPA` (neon, floaty) + lead "Sorteie · Cozinhe · Avalie 🏆".
- Card "INSERT COIN" com form: campo NOME (oculto no modo login), E-MAIL, SENHA, botão "ENTRAR ▸".
- Link `authSwitch` alterna login ⇄ cadastro ("NEW PLAYER" / "CRIAR CONTA ▸" / mostra campo nome).
- Submit: pega o nome (uppercase, máx 14 chars) → `state.me.name` → `go("rooms")`.

### 1b) SALAS — criar / entrar (`sc-rooms`) ⭐ TELA-CHAVE
Tela centralizada. Título "🎮 SALA DE JOGO". Duas abas (`.chips`, id `roomTabs`): **➕ CRIAR SALA** e **🔑 ENTRAR COM CÓDIGO** — clicar alterna qual painel aparece.
- **Painel CRIAR** (`#roomCreate`, card bolts accent):
  - `.room-code` (#roomCode) mostra o código grande em fonte display, amarelo neon, `letter-spacing:4px`, fundo surface-2, `user-select:all`. Inicial: "————".
  - Botão **GERAR CÓDIGO 🎲**: gera código `COPA-XXXX` (4 chars do charset `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` — sem 0/O/1/I pra evitar confusão), grava `state.room={code, isHost:true}`, dispara `confetti(16)`, revela os botões COPIAR / ENVIAR / ABRIR SALA e troca o próprio texto pra "GERAR OUTRO 🎲".
  - **📋 COPIAR**: `navigator.clipboard.writeText(code)` + toast "📋 Código copiado!" (fallback toast manual).
  - **📤 ENVIAR**: `navigator.share({text:"Bora jogar Comidas da Copa! 🍴⚽ Entra na minha sala com o código "+code})` se disponível; senão copia o convite + toast.
  - **ABRIR SALA ▸** (green, block, lg): `state.room.isHost=true` → `go("lobby")`.
- **Painel ENTRAR** (`#roomJoin`, card bolts, oculto por padrão):
  - Form com input `.code-input` (#joinCode, uppercase, centralizado, `letter-spacing:3px`, placeholder "COPA-7X2K", maxlength 9, autocapitalize characters) + botão **ENTRAR NA SALA ▸**.
  - Submit: normaliza (uppercase, remove espaços, garante prefixo `COPA-`), valida com `/^COPA-[A-Z0-9]{4}$/` (toast de erro "Código inválido — ex: COPA-7X2K" se falhar), grava `state.room={code, isHost:false}`, `state.mate.joined=false`, `go("lobby")`.

### 2) SALA DE ESPERA / LOBBY (`sc-lobby`)
- Header "🚪 SALA DE ESPERA" + badge `#lobbyRoom` que mostra `SALA <código>` (ou "SALA #2026" se sem código).
- Card jogador "me" (avatar 🧑‍🍳, nome `#meName`, papel `#meRole`, tag PRONTO/AGUARDANDO) e slot da dupla `#mateSlot`.
- `onEnter.lobby`: seta nome, código e papel (`isHost ? "jogador 1 · host" : "jogador 2"`). Simula a dupla entrando via `setTimeout` (host: 2600ms, convidado: 1100ms — o host "já está" na sala) → `state.mate.joined=true` + toast.
- `renderLobby`: o papel da dupla é o complementar (`isHost ? "jogador 2" : "jogador 1 · host"`). Enquanto não entra, mostra "PROCURANDO…" com bolinhas typing.
- Botão "ESTOU PRONTO" (toggle, exige dupla presente; ao marcar, a dupla marca pronto sozinha após 1.5s + confetti). Botão "LIBERAR SORTEIO 🎲" fica habilitado só quando os dois estão prontos → `go("draw")`. Hint dinâmico embaixo.

### 3) SORTEIO DA SELEÇÃO (`sc-draw`, centralizada)
- Roleta vertical tipo slot machine (`.reel` com `.reel-track`, item alt 120px, linha central). `buildReel()` preenche ~26 itens aleatórios de `TEAMS`.
- Botão "GIRAR A ROLETA 🎰": injeta a seleção sorteada na penúltima posição, anima `translateY` com `cubic-bezier(.12,.78,.18,1)` por ~3.1s. Ao parar: grava `state.team`, mostra card-resultado (bandeira grande, nome, badge confederação), `confetti(80)`, inicia **contagem regressiva de 7:00** (`startCountdown`) com barra que muda de cor (verde→amarelo→laranja) e fica `.warn` no último minuto, e revela "ESCREVER O PRATO ▸".

### 4) ESCREVER O PRATO (`sc-write`)
- Header com bandeira+país do `state.team`. Input "SEU PRATO TÍPICO" (máx 40) → habilita "CONFIRMAR PRATO ▸".
- Card "SUA DUPLA": simula a dupla **digitando ao vivo** (`simulateMateTyping`) o prato sugerido por `DISH_HINT[país]` (fallback genérico), com bolinhas typing → ao terminar mostra "✓ dupla finalizou".
- Confirmar → `go("pick")`.

### 5) SORTEIO DO PRATO (`sc-pick`, centralizada)
- `onEnter.pick`: monta `mine` (seu prato) e `theirs` (prato da dupla), escolhe um por `Math.random()<0.5` → `state.chosen`, o outro vira `state._other`. `confetti(30)`.
- Mostra card vencedor `.dish.win` ("🎲 SORTEADO", 🍽️, nome, "por X") e o outro `.dish` ("OUTRA OPÇÃO", 🍳).
- Botão "TROCAR PELA OUTRA ⇄" abre modal de confirmação → troca chosen/other. Botão "BORA COZINHAR 🔥" → `go("cook")`.

### 6) COZINHAR + FOTO (`sc-cook`)
- Header com bandeira; texto "Quando o prato **<nome>** estiver pronto, mande a foto."
- `.dropzone` (🍳 "TOQUE PARA ENVIAR / ou arraste a foto aqui") — clique abre file input; suporta drag&drop (classe `.drag` no hover). `readPhoto` usa FileReader → mostra preview `.preview-wrap` com a imagem, botão "REFAZER" e habilita "ENVIAR".
- Enviar: `confetti(100)`, `addToGallery({...})` (entra na galeria da dupla com `mine:true`), toast "📸 Foto enviada pra galeria!", `go("gallery")`.

### 7) MINHA GALERIA — só a dupla (`sc-gallery`)
- Header "🏆 MINHA GALERIA" + badge `#galleryDuo` (nomes da dupla). Subtítulo: "A vitrine de vocês dois…".
- **Stats** (`#myStats`, `.stats-row` com cards `.stat`): nº de PRATOS · MÉDIA GERAL (★) · ❤️ CURTIDAS (soma).
- Grid de cards `.gcard` (`.gphoto` com foto/emoji, bandeira, `.score` ★média; `.gbody` com nome do prato, "por VOCÊS · ❤️ N", e lista de `.review` recebidas). **Somente leitura** — não se avalia o próprio prato.
- Estado vazio `#galleryEmpty` (🍽️ "AINDA SEM PRATOS" + botão "IR COZINHAR 🔥").
- Seed inicial: 1 prato da dupla (Feijoada Completa) com 2 reviews e 54 likes.

### 8) SOCIAL — feed das outras duplas (`sc-social`)
- Header "🌐 SOCIAL" + badge "SALA #2026 · AO VIVO". Subtítulo: "O feed da galera. Curta, avalie e comente…".
- **Pódio da semana** (`#podium`, `.podium` grid 3 col): top 3 por nota média (desempate por likes), dispostos prata·ouro·bronze (🥈🥇🥉), o 1º (`.p1`) maior e com borda amarela. Mostra bandeira, medalha, emoji do prato, nome da dupla, ★nota.
- **Filtros** (`.chips` #feedChips): 🔥 EM ALTA (likes) · 🆕 RECENTES (ordem original) · 🏅 + VOTADOS (nota). Chip ativo `.on` em pink. Reordena o feed.
- **Feed** de posts estilo Instagram (`.post`, max-width 560): cabeçalho (avatar gerado por hash do id, nome da dupla, "bandeira país · tempo"), foto quadrada (emoji grande ou img) com bandeira e ★nota sobrepostos, barra de ações (**❤️/🤍 curtir** com contador + confete ao curtir; **💬 ver/ocultar comentários**; **⭐ AVALIAR** abre caixa de estrelas + textarea), legenda com nome do prato em destaque, lista de reviews colapsável, e caixa de avaliação (selecionar 1–5 estrelas + comentar → push em `reviews`, `confetti(24)`, toast, re-render que atualiza nota e pódio).
- Avaliações usam `state.me.name` como autor.

---

## 4. DADOS (`data.js`, tudo em `window.*`)
- `window.TEAMS` — **48 seleções** da Copa 2026: `{f:"🇧🇷",n:"Brasil",c:"CONMEBOL"}` (bandeira emoji, nome PT-BR, confederação: CONCACAF, CONMEBOL, UEFA, CAF, AFC, OFC). Cobrir as 48 vagas.
- `window.DISH_HINT` — mapa país→prato sugerido (ex: Brasil→Feijoada, Itália→Lasanha, Japão→Ramen, México→Tacos al Pastor, etc.).
- `window.SOCIAL_FEED` — ~8 posts de **outras duplas** (não a sua). Cada um:
  ```js
  {id:"s1", flag:"🇮🇹", country:"Itália", duo:"DUDA & LARA", emoji:"🍝",
   time:"há 12 min", caption:"...", likes:42, liked:false,
   reviews:[{who:"BIA", s:5, t:"..."}, ...]}
  ```
  Variar países, duplas, emojis, likes (20–73) e número de reviews (1–3) para o pódio ficar interessante.

---

## 5. ARQUITETURA DE ARQUIVOS
- `Comidas da Copa.html` — markup de todas as telas + topbar + stepper + nav + modal + toast + canvas. Carrega `styles.css`, depois `data.js`, depois `app.js`.
- `styles.css` — todo o design system + componentes + telas (feed, pódio, chips, stats, room-code).
- `data.js` — `TEAMS`, `DISH_HINT`, `SOCIAL_FEED`.
- `app.js` — IIFE `(function(){ "use strict"; ... })()`: helpers (`$`, `$$`, `rnd`, `esc`), tema, roteamento, e a lógica de cada tela (login, salas, lobby, sorteio, escrever, pick, cozinhar, galeria, social) + `toast`, `openModal`, `confetti`.

## 6. FAVICON
Tile arredondado com gradiente roxo CRT + grid sutil; ao centro, **garfo · bola de futebol · faca** lado a lado (prata bem definida, a bola no lugar do prato), borda neon cyan e 4 bolts pink nos cantos. Gerar em 512/180/32/16px.

## 7. DETALHES QUE NÃO PODEM FALTAR
- Tudo em **PT-BR**, tom divertido e jovem (emojis, "Bora!", "🔥").
- Mobile-first, mas responsivo até desktop (stage centralizado).
- Microinterações em tudo: confete contido, toasts, botões com efeito de tecla, typing/caret/blink, hover deslocado.
- Persistência só do tema (localStorage). Multiplayer é **mock** (timeouts simulam a dupla).
- Nada de bibliotecas externas além das Google Fonts.
