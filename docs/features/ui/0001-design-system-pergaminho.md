# Design system Pergaminho

**Status:** entregue
**Responsabilidade:** ui
**Branch:** feature/ui-UI01/design-system-pergaminho
**Autor:** ZCode · **Data:** 2026-10-18

> Esta spec é também o **estado** da feature. O que o git sabe (commits, arquivos,
> camadas tocadas) é calculado pelo hook e não se escreve aqui. O que mora aqui é
> o que nenhum commit guarda: intenção, próximo passo e dívida.

## Estado

<!-- kit:camadas -->
- [x] prisma — não se aplica nesta feature: nenhum dado novo
- [x] service — não se aplica nesta feature: sem regra de negócio
- [x] controller — não se aplica nesta feature: sem orquestração
- [x] route — não se aplica nesta feature: nenhuma rota nova
- [x] ui — tokens Pergaminho em `@theme`, fontes (Cinzel/Lora + Geist), 10 átomos + OrnamentDivider, landing re-tematizada
- [x] teste — 39 testes verdes (6 arquivos novos de átomo + landing); ratchet subiu
- [x] doc — `docs/design/design-system.md` + ADR-0022
<!-- /kit:camadas -->

**Próximo passo:** merge para `main` e abrir a P2 (Better Auth).

## Problema / motivação

O produto não tem identidade visual: a landing usa classes neutras do template e
`shared/components` está vazio. Toda a UI das fases seguintes (auth, wizard, salas,
tracker) precisa de uma base visual consistente. O usuário definiu a direção: design
criado do zero **com base no site Os Últimos Dias de Glória** — papel-pergaminho, tinta
escura, vinho profundo, ouro velho, painéis de couro escuro, serifadas de livro.

## Escopo

**Entra:**
- Tokens em `@theme` (Tailwind 4) no `globals.css`: paleta papel/tinta/vinho/ouro/couro
  + apoio (moss, fogo, cinza-quente), textura de pergaminho em CSS puro (gradientes +
  ruído SVG inline), keyframes de movimento (pulso da vez, slide de toast).
- Fontes via `next/font`: **Cinzel** (display), **Lora** (corpo) — Geist Sans (controles)
  e Geist Mono (números) já presentes.
- Átomos em `shared/components/atoms/` com teste: `Button` (variantes primary/secondary/
  ghost/danger, tamanhos, `href` vira link), `Input`, `Select`, `Textarea`, `Checkbox`,
  `Badge`, `Card`, `Avatar` (iniciais como fallback), `StatPill`, `DiceIcon` (d4–d20),
  `CountdownText` (mm:ss tabular, estado de alerta ≤30s).
- Molécula `OrnamentDivider` (divisor ornamental da linguagem do site de referência).
- Landing re-tematizada consumindo o design system: painel de couro com logotipo Cinzel
  em dourado, corpo em pergaminho, cards com moldura dourada, títulos em vinho.
- `docs/design/design-system.md` — referência viva (tokens, when-to-use, catálogo).

**Não entra (fora de escopo):**
- Moléculas/organismos de domínio (QueueItem, CharacterCard etc.) — nascem nas fases
  consumidoras (P5/P7/P9), evitando componente sem consumidor.
- Estados visuais de turno (sua-vez/próximo) aplicados — chegam com o QueueItem (P9);
  aqui ficam só os tokens e keyframes.
- Tema claro/escuro alternativo, i18n.

## Comportamento / fluxos

1. `/` renderiza com fundo pergaminho texturizado, painel de couro escuro no topo com
   "Throw Iniciative" em Cinzel dourado, destaques em cards com moldura dourada.
2. Átomos importáveis por `@/shared/components/atoms/*` em qualquer página/client island.
3. `prefers-reduced-motion` desativa o pulso.

## Impacto técnico

- **Banco:** nenhum. **API:** nenhuma. **UI:** `globals.css`, `layout.tsx` (fontes),
  `(app)/page.tsx` reescrita no tema, `shared/components/atoms/` (+ `molecules/OrnamentDivider`).

## Regras de negócio relacionadas

Nenhuma — linguagem visual.

## Critérios de aceite

<!-- kit:criterios -->
- [x] Paleta do `@theme` reflete os hex extraídos do site de referência (vinho #990033, ouro #CC9900/#C9A227, couro #2A1F14–#5C4322, papel #F7F5EA–#E8E6E0).
- [x] Landing usa o design system (Cinzel/Lora, painel de couro, molduras douradas) — verificada visualmente em navegador (screenshot full page analisado: banner, textura, cards e botões renderizando, sem classe quebrada).
- [x] Átomos cobertos por teste de comportamento (6 arquivos de teste: Button/Avatar/DiceIcon/CountdownText/formulários/exibição).
- [x] `yarn format:check && yarn typecheck && yarn lint && yarn test:cov` verdes — 39 testes, ratchet atualizado; `yarn build` verde.
- [x] `docs/design/design-system.md` documenta tokens e catálogo com quando usar.
<!-- /kit:criterios -->

## Dívida / não exercitado

- Átomos Select/Textarea/Checkbox/StatPill ainda sem consumidor real (formulários chegam na
  P2/P5) — cobertos por teste de renderização, não por uso em página.
- Estados de turno (keyframes prontos) só são exercitados na P9 (QueueItem).
- Contraste `fire-500` (#C8742E) sobre papel para texto pequeno é limítrofe — usar `fire-600`
  em texto (já adotado no Input/Badge) e reservar `fire-500` para fundo de botão; registrado
  também no design-system.md.

## Decisões em aberto

- Nenhuma — direção visual aprovada pelo usuário (site de referência + nome do produto) e registrada no ADR-0022.
