# Prompt — Comidas da Copa 2026 (versão rede social)

## Visão geral
App/protótipo web mobile-first com estética **retrô-arcade / CRT anos 80** (fontes pixel "Press Start 2P" + "VT323", paleta neon, cantos duros, sombras 8-bit, scanlines e grid de fundo). Tema da **Copa do Mundo 2026**: duplas sorteiam uma seleção, escolhem um prato típico daquele país, cozinham, fotografam e a comunidade avalia.

## Fluxo do jogo (telas)
1. **Login / Cadastro** — autenticação estilo "INSERT COIN".
2. **Sala de espera** — host + parceiro entram, marcam "PRONTO", liberam o sorteio.
3. **Sorteio da seleção** — roleta (slot machine) sorteia 1 das 48 seleções + timer de 7 min.
4. **Escrever o prato** — cada um digita um prato típico do país (parceiro "digitando ao vivo").
5. **Sorteio do prato** — sistema escolhe entre os dois pratos; dá pra trocar.
6. **Cozinhar + foto** — upload/drag da foto do prato pronto.
7. **Minha Galeria** — vitrine **só da dupla**: pratos cozinhados + notas recebidas + stats.
8. **Social** — feed das **outras duplas**: curtir, avaliar e comentar.

## Atualização desta versão — REDE SOCIAL
A galeria foi dividida em duas abas para o app virar uma rede social:

### 🏆 Minha Galeria (individual, da dupla)
- Mostra **apenas os pratos da própria dupla** (`mine:true`).
- Painel de **stats** no topo: nº de pratos · média geral (★) · total de ❤️ curtidas.
- Cartões somente-leitura com as avaliações que receberam (não se avalia o próprio prato).
- Estado vazio convidando a cozinhar quando ainda não há pratos.
- Pratos cozinhados no fluxo entram automaticamente aqui.

### 🌐 Social (feed das outras duplas)
- **Pódio da semana** 🥇🥈🥉 — top 3 por nota média (desempate por curtidas).
- **Filtros**: 🔥 Em alta (curtidas) · 🆕 Recentes · 🏅 + votados (nota).
- **Posts estilo feed** (Instagram-like): avatar da dupla, bandeira + país + tempo, foto quadrada, legenda.
- Ações sociais: **curtir ❤️** (toggle + confete), **ver/ocultar comentários**, **avaliar** com estrelas + comentário (atualiza nota e pódio em tempo real).
- Avaliações dadas usam o nome do jogador logado.

## Diretrizes de estilo (manter)
- Paleta neon: pink `#ff2d95`, cyan `#19e3ff`, yellow `#ffd23f`, green `#34e89e`, orange `#ff7a35`, purple `#b06bff`.
- Tema **escuro** (CRT roxo) padrão + tema **claro** (sépia arcade) via toggle.
- Cantos duros (radius 0), bordas de 4px, sombras sólidas deslocadas (8-bit), bolts nos cantos dos cards.
- Microinterações: confete contido, toasts, blink/typing/pop, hover com deslocamento.
- Sem gradientes "AI-slop"; emojis fazem parte da linguagem do app (bandeiras, comida).

## Arquitetura
- `Comidas da Copa.html` — estrutura das telas + nav inferior + modal/toast/confete.
- `styles.css` — design system retrô-arcade (tokens, componentes, feed, pódio, chips, stats).
- `data.js` — `TEAMS` (48 seleções), `DISH_HINT`, `SOCIAL_FEED` (pratos das outras duplas).
- `app.js` — roteamento de telas, lógica de cada etapa, galeria da dupla, feed social.

## Ideias de evolução
- Seguir duplas / aba "Seguindo".
- Notificações ("alguém avaliou seu prato").
- Stories de duplas online; busca por país; ranking geral do campeonato.
