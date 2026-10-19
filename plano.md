# Plano de Implementação — Throw Iniciative

Aplicação web de rastreamento de iniciativa para mesas de D&D 5.5E, construída a partir do
`Next-Project-Boilerplate` e do documento técnico
`rpg-initiative-tracker-doc-tecnico.docx` (MVP 1, 12 fases F0–F12).

**Decisões do usuário (2026-10-18):** nome exato **"Throw Iniciative"** · design system
criado do zero **com base no site Os Últimos Dias de Glória** (pergaminho + vinho + ouro
velho) · auth com **Better Auth** · plano aprovado para execução fase a fase via `/feature` +
`/fechar` · push tentado pelo agente quando houver remote com credencial; sem credencial,
commits ficam locais e a ida pra prod acontece no fim, com o usuário.

**Princípio desta execução:** tudo sobe e valida **local primeiro** (Docker: app + Postgres +
SeaweedFS). Deploy/nuvem é adaptação posterior, não pré-requisito.

---

## 1. O que a varredura encontrou

| Fonte | Estado |
|---|---|
| **Repo raiz** (`throw_iniciative`) | Git inicializado, **sem nenhum commit**. Kit novo instalado: `.claude/` (comando `/feature`, hooks `estado.mjs`, skills `camada-ui`/`camada-db`/`next16`/`criar-testes`), `CLAUDE.md`, `PROGRESS.md`, `docs/features/TEMPLATE.md`, `docs/adr/0009–0018` (processo), `eslint.kit.mjs`, `scripts/kit.mjs`, `.github/workflows/pr.yml`. |
| **`Next-Project-Boilerplate/`** | Repo próprio (histórico + remote `fhdataanalysis-projects`), **é só template**. Next 16.2.4 + React 19 + Tailwind 4 + Prisma 6.19.2 modular + Postgres 17 + SeaweedFS (S3) no docker-compose de dev + Vitest com coverage ratchet + Sonar + Husky + OTel + CI (deploy K3s, Sonar, PR template). Zero produto: UI placeholder, domínio `example` 100% comentado, auth inexistente, **zod não instalado**, **nenhum mecanismo realtime**, kit de processo antigo (`.claude` próprio, com `iniciar-feature`, `finish-feature`, `continue`). |
| **Doc técnico** | MVP 1 completo em 12 fases com pseudo-código e critérios de aceite. Stack assumida: Next 15 + Better Auth + Drizzle + Supabase (Postgres/Realtime/Storage) + Upstash + Vercel Cron + shadcn/ui + TanStack Query + Zustand. |

### Lacunas a preencher (não existem em lugar nenhum)

1. **Tempo real** — sincronização da fila de iniciativa entre mestre e jogadores.
2. **Auth** — sessões, cadastro, verificação de e-mail, Discord OAuth.
3. **Design system** — boilerplate não tem um botão sequer; componentes vazios.
4. **Domínio RPG** — schema, regras (d20 server-side, tie-break, timer, rate limit), SRD 5.2.
5. **Merge kit↔boilerplate** — dois kits de processo, dois conjuntos de ADR com numeração
   conflitante, dois CI, dois CLAUDE.md.

---

## 2. Decisões de arquitetura (doc técnico → realidade do boilerplate)

O doc técnico descreve o **produto**; a stack dele é substituída pela do boilerplate, que é a
convenção deste repo. Cada divergência vira ADR na fase correspondente.

| Doc técnico assume | Decisão aqui | Por quê |
|---|---|---|
| Next.js 15 | **Next 16.2.4** do boilerplate | Next 16 tem breaking changes (ex.: `middleware`→`proxy`); ficamos na versão suportada pelas skills `next16`/`camada-*` |
| Better Auth | **Better Auth mantido** (decisão do usuário), com **adapter Prisma** e sessões no Postgres. Discord OAuth como provider opcional por env (local degrada para e-mail/senha sem erro). Verificação de e-mail por token; em dev o "e-mail" é logado no servidor + página de dev para resgatar o link. | Framework-agnético (não depende das APIs de middleware do Next), adapter Prisma oficial — risco controlado no Next 16; se morder, o fallback desenhado é auth próprio com sessão em tabela |
| Drizzle ORM | **Prisma 6.19.2 modular** (um `*.prisma` por domínio em `prisma/schema/`, seeder por domínio) | Convenção do boilerplate e da skill `camada-db`; trocar ORM aqui é custo sem ganho local |
| Supabase Postgres + RLS | **Postgres 17 no Docker** (`dev:up`). **RLS cai**: nenhum client acessa o banco — toda leitura/escrita passa por service, autorização em `assertMember`/`assertMaster` + testes | O próprio doc chama RLS de "defense-in-depth" redundante; sem `auth.uid()` do Supabase ela perde o sentido |
| Supabase Realtime (broadcast) | **SSE (Server-Sent Events)** + broker em processo: `GET /api/rooms/[id]/events` com `text/event-stream`; broker singleton (padrão do `db/prisma.ts`) com canais `room:{id}`; Server Action faz commit → broadcast; client refaz fetch otimista ao receber evento (mitigação do próprio doc). Client: hook `useRoomEvents` com `EventSource`. Interface `EventBus` isolada para trocar por Redis pub/sub em produção multi-instância sem tocar call sites | Única peça de realtime que funciona em processo único sem serviço externo; SSE atravessa proxies, reconecta sozinho |
| Vercel Cron (auto-pass 1min) | Mesmo desenho, dois disparadores: **route handler `/api/cron/auto-pass`** (Bearer `CRON_SECRET`) + **scheduler em processo** (`instrumentation.node.ts`, tick de 30s) chamando o mesmo service `autoPassTurn` | Local não tem Vercel; produção aponta um cron qualquer para o endpoint. Client continua só mostrando countdown derivado de `turn_started_at` |
| Upstash rate limit | **Rate limit em memória** (sliding window, `Map`) atrás de interface `RateLimiter`; mesmos limites (30 rolls/60s, 10 salas/60s por user); troca por Upstash em prod | Sem Redis local; interface permite adaptar depois |
| Supabase Storage | **SeaweedFS (S3) já no compose de dev** + `@aws-sdk/client-s3`; bucket para som customizado e avatares | Infra já entregue pelo boilerplate |
| shadcn/ui + TanStack Query + Zustand | **Design system próprio** sobre Tailwind 4 (`@theme` em `globals.css`), Atomic Design do kit (átomos→moléculas→organismos). Leituras por RSC; mutações por **Server Actions** que delegam ao controller; estado efêmero da sala vira estado React alimentado pelo hook SSE (`useSyncExternalStore`) | O kit proíbe organismo buscar dado; shadcn/Query/Zustand seriam três dependências para papéis que RSC + Actions + SSE já cobrem |
| DOMPurify | **Cai** — React já escapa texto; validação é Zod (trim, min/max) em todos os inputs | Só faria sentido renderizando HTML de usuário, o que não acontece |
| Sons mp3 baixados | **3 sons sintetizados por script** (WAV <50KB, gerados em `scripts/` e versionados em `public/sounds/`) | Sem licença envolvida; especificação acústica no design system |
| Playwright só no fim | Mantido (fase final), **Vitest continua como gate** de cada fase (ratchet de cobertura no CI) | Convenção do boilerplate |

### Decisões de estrutura do repo (bootstrap)

- **O app mora na raiz do repo** `throw_iniciative`: conteúdo do boilerplate é copiado para a
  raiz (sem o `.git` dele), e o kit da raiz (novo) **prevalece** sobre o kit antigo do
  boilerplate. Um repo, um kit, um histórico.
- `Next-Project-Boilerplate/` e `fh-kit-estado/` ficam onde estão como referência, e entram
  no `.gitignore` (não são versionados no repo do app).
- **`.claude/` antigo do boilerplate cai inteiro** (`iniciar-feature`, `finish-feature`,
  `continue`, `grill-me`) — substituído pelo kit novo (`/feature`, `/fechar`,
  `/quality-check`, `/revisar`, hooks de estado). `CLAUDE.md`, `AGENTS.md` e `PROGRESS.md` da
  raiz vencem; `docs/PROGRESS.md` do boilerplate cai (estado mora na spec + hook).
- **ADRs renumerados sem colisão**: ADRs 0001–0010 do boilerplate (ferramentas) ficam; ADRs
  0009–0018 do kit viram **0011–0020** (links internos corrigidos). ADRs novos do app começam
  em 0021 (um por divergência da tabela acima).
- **CI mesclado**: `pr.yml` do kit (pull_request) + `deploy.yml`/`sonar.yml` do boilerplate.
- `eslint.config.mjs` importa `regrasDoKit` do `eslint.kit.mjs` (uso já documentado no
  próprio fragmento).
- `/admin` e o domínio `example` caem; landing do boilerplate é substituída; teste da landing
  antiga é descartado. `vitest.config.ts` atualizado (exclusão de `middleware.ts` → `proxy.ts`).
- Nome: package `throw-iniciative`, produto exibido **"Throw Iniciative"**; metadata,
  robots/sitemap e `NEXT_PUBLIC_BASE_URL` ajustados. Containers/banco mantêm os nomes do
  boilerplate (`app_dev` etc.) — renomear banco é atrito sem ganho.

---

## 3. Modelo de dados (Prisma modular)

Convenções do boilerplate: UUID PK (`gen_random_uuid()`), `@map` snake_case, `@@map` plural,
`Timestamptz`. Fonte da verdade: `docs/db/modelo-de-dados.md` (muda no mesmo commit do schema).

| Arquivo | Models | Constraints críticas |
|---|---|---|
| `auth.prisma` | `users`, `sessions`, `verification_tokens`, `oauth_accounts` | e-mail único; soft delete `deleted_at` (webhook de exclusão de conta) |
| `srd.prisma` | `srd_species`, `srd_classes`, `srd_subclasses`, `srd_class_features`, `srd_backgrounds`, `srd_feats`, `srd_spells`, `srd_equipment`, `srd_monsters` | somente leitura por construção (nenhum service escreve fora do seeder) |
| `characters.prisma` | `characters`, `npc_templates` | `characters.is_visible_to_master` (privacidade); template `is_public` |
| `rooms.prisma` | `rooms`, `room_members`, `room_characters`, `room_temp_npcs` | `rooms.code` único; `@@unique([room_id, active_for_user_id])` = 1 PJ ativo por sala por jogador; `room_members` PK composta |
| `initiative.prisma` | `initiatives`, `initiative_participants` | `participant_type` XOR (`character_id`/`temp_npc_id` — CHECK adicionado à mão na migration SQL, Prisma não tem CHECK nativo); status enum da state machine |
| `platform.prisma` | `notifications`, `audit_rolls`, `audit_logs` | índices por `(room_id, created_at)` para a timeline de auditoria |

Enums: `room_status`, `member_role`, `initiative_status` (draft→rolling→ordered→active→finished),
`participant_type`, `added_mode`, `notification_type`.

A state machine da iniciativa (transições autoritativas no server) é regra de negócio e nasce
documentada em `docs/negocio/` **antes** do service (a skill `grill-regra-negocio` dispara ao
tocar `*.service.ts`).

---

## 4. Design system — "Pergaminho" (baseado em Os Últimos Dias de Glória)

Criado do zero, com a linguagem visual extraída do site de referência
(`ultimosdiasdegloria.sitepessoal.com` — campanha de Forgotten Realms, Salvador-BA):
papel-pergaminho claro com tinta escura, **vinho profundo como cor-assinatura**, ouro velho
nos realces, menu/painéis escuros de couro com texto dourado (como o menu lateral do site),
tipografia serifada de livro. Nenhuma imagem é copiada do site — só a linguagem: texturas
são recriadas em CSS (gradientes + ruído SVG inline).

Tema **claro** (papel) com superfícies de destaque escuras. Tokens em CSS custom properties
dentro de `@theme` no `globals.css` (Tailwind 4) — sem `tailwind.config`.

### Tokens (hex extraídos do CSS e das texturas do site)

- **Papel** (fundo geral): base `#F7F5EA` · claro `#FBFAF0` · manchas `#EDEBE5`/`#E8E6E0` ·
  borda de página envelhecida `#D8C48A`→`#E8D9A8` (vinheta lateral) · granulação fina
  (ruído SVG, opacidade ~4%)
- **Tinta**: texto `#1A1611` (preto quente) · secundário `#6B5D4F` · links `#333333`
- **Vinho** (assinatura, do site): `--color-wine-700` `#990033` (subtítulos, destaques,
  links "deuses") · escuro para títulos de seção `#990000` · hover vivo `#B3123F`
- **Ouro velho**: `#CC9900` (hover de links) · `#C9A227` (ornamentos/bordas) · `#8B6914`
  (ouro queimado, texto sobre escuro) · `#6C4900` (ativo)
- **Couro escuro** (painéis de destaque: header, menu, tracker): fundo `#2A1F14`→`#3E2A10`
  (gradiente) · texto/ícones `#E5C96B` (dourado; no site era `#FFFF00` sobre menu escuro —
  ajustado para dourado legível) · borda `#5C4322`
- **Apoio**: verde-erva `#006600` (sucesso; link "geo" do site) · fogo `#C8742E` (alerta/
  timer; derivado do hover `#fe4930` dessaturado) · cinza-crédito `#895E36` (marrom couro)
- **Estados semânticos de turno**: sua-vez = vinho com pulso dourado · próximo = ouro velho ·
  fim-de-timer = fogo · finalizado = cinza-quente `#9C948A`

### Tipografia (via `next/font`)

- **Cinzel** — display (logo, títulos de página): serifada romana estilo Trajan, o mesmo
  espírito do banner do site ("Os Últimos Dias de Glória" + emblema FORGOTTEN REALMS).
- **Lora** — corpo (o papel de Georgia/"Book Antiqua" no site): narrativa, fichas, descrições.
- **Geist Sans** — controles densos de UI (o papel de Verdana no site): formulários, menu,
  botões.
- **Geist Mono** — números de dados, modificadores, código de sala, countdown (tabular).

### Forma e movimento

- Cards com moldura fina `#C9A227` e canto `rounded-md` (o site é reto/em tabela; suavizamos
  só um degrau para não virar skeuomorfismo pesado); divisores ornamentais simples (linha
  dupla com losango central, em CSS).
- Banner/header escuro de couro com o logo em Cinzel dourado (eco do `titulopagina.jpg`).
- Movimento: pulso `box-shadow` dourado 1,5s no avatar da vez (respeita
  `prefers-reduced-motion`); toast slide-in 200ms; countdown muda para fogo nos 30s finais;
  transições de fila 150ms.

### Catálogo de componentes (Atomic Design do kit)

- **Átomos**: `Button` (primary/secondary/ghost/danger × sm/md/lg), `Input`, `Select`,
  `Textarea`, `Checkbox`, `Badge`, `Avatar` (iniciais/imagem), `StatPill`, `Card`,
  `DiceIcon` (SVG d4–d20), `CountdownText` (mono).
- **Moléculas**: `QueueItem` (avatar+label+total+estado), `CharacterCard`,
  `NpcTemplateCard`, `MemberRow`, `StepIndicator` (wizard), `RoomCodeField` (código 6 chars
  com copiar), `AbilityScoreInput` (point buy), `Toast`.
- **Organismos**: `QueueView` (fila reativa), `TurnControls` (rolar/passar sua vez),
  `LobbyPanel` (membros, NPCs, seleção de PJ), `CharacterWizard` (10 steps),
  `CharacterSheet` (ficha), `AuditTimeline`, `RoomSettings` (timer, som custom),
  `NotificationLayer` (som + toast + badge).
- **Rotas**: `/` (landing) · `(auth)`: `/login`, `/register`, `/forgot-password`,
  `/verify-email` · `(app)`: `/dashboard`, `/characters`, `/characters/new`,
  `/characters/[id]`, `/npc-templates`, `/rooms/new`, `/rooms/join`, `/rooms/[id]` (lobby +
  tracker), `/rooms/[id]/settings`, `/rooms/[id]/audit`, `/settings`.

### Som (especificação acústica, gerada por script)

| Evento | Especificação | Fonte |
|---|---|---|
| `your_turn` | Dois dings sine ascendentes C5→G5, ~300ms, triunfante | `public/sounds/your-turn.wav` |
| `prepare` | Um ding suave E5, ~200ms | `public/sounds/prepare.wav` |
| `timer_warning` | Três bips square A4 de 80ms, urgente | `public/sounds/timer-warning.wav` |

Tocados por Web Audio API com cache de `AudioBuffer`, `AudioContext` lazy (criado só após
gesto do usuário), toggle global em `/settings` (localStorage) e override por sala via som
custom no S3.

---

## 5. Tempo real e tempo do turno (miolo do produto)

1. **Broker em processo** (`src/server/realtime/`): `EventBus` com publish/subscribe por
   `room:{id}`; eventos: `initiative:started|rolled|ordered|finalized`,
   `participant_added`, `turn:passed`, `your_turn`, `you_are_next`, `timer:warning|paused`,
   `member:joined|character_changed`, `room:destroyed`.
2. **Endpoint SSE** `GET /api/rooms/[id]/events`: valida sessão + membership, inscreve no
   canal, heartbeat de 25s, cleanup no abort.
3. **Hook client** `useRoomEvents(roomId)`: `EventSource` + `useSyncExternalStore`; ao
   receber evento → refetch otimista do estado da sala (RSC revalidate) + efeitos locais
   (som/toast/badge).
4. **Ordem não negociável**: Server Action → commit → publish (broadcast só depois do
   commit, como pede o doc).
5. **Timer server-authoritative**: `rooms.turn_seconds` (default 120, slider 30–300s em
   settings) + `initiatives.turn_started_at`; `autoPassTurn` roda no tick/scheduler e no
   endpoint de cron; pausa do mestre congela (`is_paused`/`paused_at`, retomada reajusta
   `turn_started_at`); cliente apenas **deriva** o countdown, nunca decide.

---

## 6. Fases de execução

Cada fase = **uma branch** `<tipo>/<escopo>-<ID>/<slug>` + **uma spec** em `docs/features/`
(abertas com `/feature`, fechadas com `/fechar`; nunca push). Branches saem de `main` após o
commit inicial do bootstrap. Ordem e dependências:

| # | Branch (sugestão) | Entrega | Equivale a | Depende de |
|---|---|---|---|---|
| **P0** | `feature/infra-INFRA01/fundacao-throw-initiative` | Copiar boilerplate→raiz, merge kit (ADRs renumerados, CI, eslint), rename, deps novas (`zod`), limpeza (`/admin`, `example`, teste antigo), landing "Throw Initiative", env.ts validado no boot, `dev:up` + `lint/typecheck/test` verdes. Commit inicial no `main` vazio antes da branch. | F0 | — |
| **P1** | `feature/ui-UI01/design-system-pergaminho` | Tokens `@theme`, fontes (Cinzel/Lora), átomos e moléculas do catálogo + testes de componente. Sem página de showcase: os componentes são validados por teste e consumidos pelas páginas reais a partir de P2 | (novo; doc previa shadcn em F0) | P0 |
| **P2** | `feature/auth-AUTH01/better-auth-discord` | Better Auth + adapter Prisma (`auth.prisma` gerado pelo CLI), sessões cookie httpOnly, `/login` `/register` `/verify-email` `/forgot-password`, verificação por token (dev: link logado + página dev), Discord OAuth opcional por env, `proxy.ts` protegendo `(app)`, `getSession()` | F1 | P0 |
| **P3** | `feature/db-DB01/modelo-de-dados` | Todas as tabelas dos 6 arquivos `.prisma`, enums, constraints (UNIQUE + CHECK XOR via migration editada), `docs/db/modelo-de-dados.md`, migration aplicada no container | F2 | P0 |
| **P4** | `feature/db-DB02/importacao-srd-52` | Seeder SRD 5.2 (JSON 5e-bits, CC-BY 4.0, atribuição no rodapé/`docs/contexto.md`), ~12 espécies/12 classes/40 subclasses/400 spells/200 equip/400 monstros, helpers de busca | F3 | P3 |
| **P5** | `feature/ui-UI02/crud-personagem` | Wizard 10 steps, Zod por step, cálculo automático (HP/AC/initiative_mod/proficiência), lista e ficha, toggle de privacidade, actions → controller → service | F4 | P2, P4, P1 |
| **P6** | `feature/api-API01/npc-templates` | CRUD `npc-templates`, NPC complexo (`character.is_npc`), `instantiateTempNpc(roomId, templateId, quantity)` com numeração incremental, templates públicos entre mestres | F5 | P3, P2 |
| **P7** | `feature/api-API02/salas-membership` | Criar/entrar por código 6 chars (retry até único), lobby (membros, NPCs persistentes/temporários, seleção de PJ com upsert na UNIQUE), UI mestre≠jogador **+ infra realtime (EventBus, endpoint SSE, `useRoomEvents`)** | F6 (+infra realtime) | P5, P6 |
| **P8** | `feature/api-API03/initiative-core` | `dice.ts` (`rollDie` com rejection sampling), tie-break D&D (total→mod→reroll), `startInitiative`/`rollInitiative`/`masterRollAllNpcs`/`orderAndActivate`, audit em `audit_rolls`, rate limit em roll, state machine documentada em `docs/negocio/` | F7 | P7 |
| **P9** | `feature/ui-UI03/initiative-ux` | `QueueView`, "É a sua vez", badge "Prepare-se", `passTurn` (rotação transacional), `addParticipant` (append/reroll), `finalizar` com confirm; autorização: só o atual (ou mestre) passa | F8 | P8 |
| **P10** | `feature/jobs-JOBS01/timer-server-authoritative` | `/api/cron/auto-pass` (Bearer) + scheduler em `instrumentation.node.ts`, countdown derivado, `timer:warning` aos 30s, pausar/retomar, settings do timer | F9 | P9 |
| **P11** | `feature/ui-UI04/som-e-visual` | 3 WAVs sintetizados, `playNotification` (Web Audio, lazy ctx, cache), toggle `/settings`, upload de som custom via S3, badge pulsante, toast 5s | F10 | P9 (consome P10) |
| **P12** | `feature/api-API04/hardening-seguranca` | Rate limit (30/60s roll, 10/60s sala) + audit de rejeição, `/rooms/[id]/audit`, exclusão de conta → salas órfãs `destroyed` + notificações, e-mail verificado obrigatório p/ criar sala, revisão Zod de todas as actions | F11 | P2–P11 |
| **P13** | `chore/infra-INFRA02/e2e-fluxo-critico` (tipo/escopo finais confirmados ao abrir a feature) | Playwright + E2E do fluxo crítico (mestre + jogador em 2 contextos), `vercel.json` do cron documentado, `.env.production` modelado, smoke do cron, revisão visual final | F12 | P12 |

P2+P3 podem rodar em paralelo (como o doc prevê para F1+F2); P5+P6 idem. P7 em diante é
estritamente sequencial.

**Estimativa do doc:** 30 dias-humano; execução por agente ~2–3h por "dia". Sem prazo
prometido — o gate é o critério de aceite de cada fase, não o calendário.

---

## 7. Testes e validação local (como "tudo pronto" é definido)

Por fase, nesta ordem (o `/quality-check` do kit empacota):

1. `yarn format:check && yarn typecheck && yarn lint` — zero erro.
2. `yarn test` (Vitest, coverage ratchet sobe, nunca desce). Estratégia por camada:
   - **service puro** (dado, tie-break, matemática do timer, rate limit, código de sala):
     teste unitário direto, casos-limite;
   - **controller**: dublê de service, asserção de orquestração/erros (`http/errors.ts`);
   - **componente**: Testing Library por papel/comportamento;
   - **service com Prisma**: `vi.mock` do client no CI; integração real no container local;
   - **fluxo crítico**: Playwright no fim (P13).
3. Migrations e seeds idempotentes no container (`db:migrate`, `db:seed` duas vezes seguidas
   sem falhar).
4. Fase com UI: verificação funcional em `localhost:3000` com o navegador (skill de
   browser), sem screenshot desnecessário.
5. Ao final de P13: **demo local completa para o usuário** — fluxo mestre+jogador em duas
   janelas, com som, timer e auditoria — e revisão do `docs/` vivo. Push/PR ficam a cargo do
   usuário (regra do kit).

Nota de CI: `pr.yml` roda `test:cov` sem Postgres — enquanto não houver teste de integração
no CI isso segue válido (Prisma mockado); quando houver, adiciona serviço `postgres` ao job.

---

## 8. Fora de escopo deste MVP (adaptar depois, interfaces já preparadas)

- Deploy real (K3s do boilerplate ou Vercel), domínio, Sentry.
- Upstash/Redis no rate limit e no EventBus (multi-instância).
- Provedor de e-mail real (transport de dev é log; interface única para trocar).
- i18n, PWA/offline, tema claro.

## 9. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| SSE + dev hot-reload (Next/Turbopack derruba conexões) | heartbeat 25s + reconexão automática do `EventSource` + refetch ao reconectar |
| CHECK XOR fora do Prisma | migration editada à mão é testada por teste de integração que tenta insert inválido |
| Wizard 10 steps perde estado | estado por step persistido em formulário progressive enhancement (action revalida) — sem localStorage como fonte |
| d20 com bias | `rollDie` com rejection sampling desde o P8 (doc já aponta o `% 20` como débito) |
| Fonte do SRD muda formato | seeder tolerante: falha item a item com relatório, `onConflictDoNothing`/upsert |
| Escopo do doc maior que o boilerplate previa | fases pequenas com spec + gate por fase; nada avança com lint/teste vermelho |

## 10. Próximo passo imediato

1. ~~Usuário revisa este plano~~ — **aprovado em 2026-10-18** com as decisões registradas no
   topo (nome "Throw Iniciative", design Pergaminho, Better Auth, push sob credencial).
2. Commit inicial no `main` (kit + plano + docx) → abrir P0 com `/feature` e seguir fase a
   fase até a demo local.
