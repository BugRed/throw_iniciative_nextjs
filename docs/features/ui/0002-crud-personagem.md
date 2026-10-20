# CRUD de personagem — wizard de 10 steps

**Status:** entregue
**Responsabilidade:** ui
**Branch:** feature/ui-UI02/crud-personagem
**Autor:** ZCode · **Data:** 2026-10-19

> Esta spec é também o **estado** da feature. O que o git sabe (commits, arquivos,
> camadas tocadas) é calculado pelo hook e não se escreve aqui. O que mora aqui é
> o que nenhum commit guarda: intenção, próximo passo e dívida.

## Estado

<!-- kit:camadas -->
- [x] prisma — não se aplica nesta feature: schema de `characters` entregue em P3
- [x] service — cálculos (HP/CA/iniciativa/proficiência, point buy) + CRUD + privacidade em `src/server/personagens/`
- [x] controller — sessão + orquestração + erros (`http/errors.ts`) + `controlarDadosWizard` compondo as consultas do SRD
- [x] route — não se aplica nesta feature: mutação por Server Action, leitura por RSC (sem route handler novo)
- [x] ui — wizard 10 steps em `/characters/new`, lista em `/characters`, ficha em `/characters/[id]` com toggle de privacidade
- [x] teste — cálculos puros, service com Prisma mockado, controller com dublê, componentes e páginas por comportamento
- [x] doc — regra de negócio dos cálculos em `docs/negocio/` antes do service (plano §3)
<!-- /kit:camadas -->

**Próximo passo:** nenhum — feature entregue (gate verde: format/typecheck/lint/test:cov
204 testes, 9/9 critérios); falta push e PR (do usuário). Próxima fase é P6 (NPCs:
templates leves + NPC completo), branch nova a partir desta.

## Problema / motivação

Sem ficha de personagem não existe PJ para selecionar em sala (P7) nem iniciativa para
rolar (P8). O jogador precisa montar a ficha com os dados do SRD 5.2 (P4) sem conhecer
as regras de cálculo — o produto calcula HP/CA/iniciativa/proficiência sozinho — e decidir
se o mestre pode ver a ficha (privacidade).

## Escopo

**Entra:**
- `/characters/new` — wizard 10 steps (espécie → classe → subclasse → background →
  atributos point buy → perícias → magias → equipamento → feats → revisão), Zod por step,
  um único `<form>` acumulado (estado em React, não localStorage), submit via Server Action.
- Server Action `criarPersonagem` → controller → service, com cálculo automático:
  `hp_max = hit_die + mod(CON)`, `ca = 10 + mod(DEX)`, `initiative_mod = mod(DEX) +
  (feat Alert ? bônus de proficiência : 0)`, `proficiency_bonus` por nível.
- `/characters` — lista das fichas do usuário (badge NPC a partir da P6).
- `/characters/[id]` — ficha completa, edição (nome, nível, perícias, equipamento, feats) e
  toggle de privacidade (`is_visible_to_master`).
- Subclasse no nível 1 é informativa (5.2: escolha no nível 3) — step mostra as opções
  futuras da classe, sem seleção. Perícias/magias filtradas pelo que a classe permite no
  payload do SRD, com fallback tolerante.

**Não entra (fora de escopo):**
- Upload de avatar (doc marcava opcional; S3 chega na P11 junto com o som custom).
- Rolagem de atributos (só point buy 27; "rolled" do doc fica como dívida).
- Magias preparadas além do nível 1 e gestão de spell slots (combate de magia é fora do MVP).
- HP/atualização em combate (tracker de HP é da sala, P7+).

## Comportamento / fluxos

Jogador logado → `/characters` → "Nova ficha" → wizard: escolhe espécie, classe (com
hit_die visível), vê subclasses futuras, escolhe background (com feat de origem), distribui
27 pontos (8–15 cada atributo), marca perícias permitidas, (se caster) escolhe truques/
magias de nível 1, marca equipamento, vê feats (nenhuma no nível 1 — feat de origem vem do
background), nomeia e decide privacidade → ficha criada com stats calculados e audit
`character_created`. Ficha fechada não é visível a outros usuários (nem ao mestre) na
leitura por id — a lista de sala (P7) mostra só o nome.

## Impacto técnico

- **Banco:** nenhuma tabela nova; escrita em `characters` + `audit_logs`.
- **API:** Server Actions em `src/app/(app)/characters/actions.ts` → controller; leitura RSC direto do service via página.
- **UI:** rotas `/characters`, `/characters/new`, `/characters/[id]`; moléculas `StepIndicator`, `CharacterCard`; organismos `CharacterWizard`, `CharacterSheet`.

## Regras de negócio relacionadas

- [`negocio/personagens-calculos.md`](../../negocio/personagens-calculos.md) — fórmulas de
  HP/CA/iniciativa/proficiência, point buy e privacidade da ficha.

## Critérios de aceite

<!-- kit:criterios -->
- [x] Fighter Human nível 1 (CON 12) cria com HP 11 (d10 + 1) — caso do doc técnico.
- [x] Wizard navega os 10 steps sem perder estado (um form acumulado).
- [x] Zod rejeita atributo < 8 ou > 15 no point buy e custo total > 27.
- [x] `initiative_mod` = mod(DEX); com feat Alert soma o bônus de proficiência (SRD 5.2, não o +5 de 2014 do doc).
- [x] Toggle de privacidade persiste; ficha com `is_visible_to_master=false` não é retornada na leitura para não-donos.
- [x] `/characters` lista só fichas do usuário; `/characters/[id]` mostra ficha completa com stats calculados.
- [x] Edição recalcula stats (nível muda proficiência e HP).
- [x] Audit `character_created`/`character_updated` gravado.
- [x] `yarn format:check && yarn typecheck && yarn lint && yarn test:cov` verdes.
<!-- /kit:criterios -->

## Dívida / não exercitado

- Ramo `notFound()` da página `/characters/[id]` sem teste direto (exige dublê do
  `next/navigation`; o 404 em si é coberto no service).
- `alternarVisibilidade` não grada audit (só create/update gravam, como os critérios
  pedem); se a sala (P7) precisar rastrear abertura/fechamento, nasce audit próprio.

## Decisões em aberto

- Nenhuma — fórmulas seguem SRD 5.2; divergência do doc técnico (Alert +5 → +proficiência)
  registrada na regra de negócio.
