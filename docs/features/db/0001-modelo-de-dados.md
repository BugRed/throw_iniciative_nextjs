# Modelo de dados de domínio completo

**Status:** em-desenvolvimento
**Responsabilidade:** db
**Branch:** feature/db-DB01/modelo-de-dados
**Autor:** ZCode · **Data:** 2026-10-19

> Esta spec é também o **estado** da feature. O que o git sabe (commits, arquivos,
> camadas tocadas) é calculado pelo hook e não se escreve aqui. O que mora aqui é
> o que nenhum commit guarda: intenção, próximo passo e dívida.

## Estado

<!-- kit:camadas -->
- [ ] prisma — 5 domínios novos em `prisma/schema/` (`srd`, `characters`, `rooms`, `initiative`, `platform`) + `users.deleted_at` + migration com CHECK XOR editado à mão
- [x] service — não se aplica nesta feature: P3 não cria `*.service.ts`; privacidade, 1 PJ ativo e state machine viram **constraints** agora e **service** a partir de P5–P8
- [x] controller — não se aplica nesta feature: sem orquestração, só schema/migration/doc
- [x] route — não se aplica nesta feature: nenhum endpoint novo
- [x] ui — não se aplica nesta feature: nenhuma tela tocada
- [ ] teste — `db:migrate` + `db:seed` 2× seguidos sem falhar no container; constraints rejeitam dados inválidos (XOR, UNIQUEs) na validação local
- [ ] doc — `docs/db/modelo-de-dados.md` completo (20 tabelas novas, invariantes, diagrama) no mesmo commit do schema
<!-- /kit:camadas -->

**Próximo passo:** escrever os 5 arquivos de domínio conforme plano §3, gerar a migration, editar o CHECK XOR (`character_id`/`temp_npc_id`) no SQL e aplicar no container.

## Problema / motivação

Tudo que o produto faz a partir daqui depende de tabelas que ainda não existem: importar o
SRD 5.2 (P4), criar personagem (P5), salas e iniciativa (P7–P9). O doc técnico (F2) definiu
as entidades e o plano (§3) as mapeou para o Prisma modular do boilerplate; a fundação de
auth (P2) entregou apenas o domínio dela. Esta feature entrega o resto do modelo **de uma
vez**, para que as fases seguintes adicionem comportamento sem retrabalho de schema — e
materializa como constraints o que hoje são decisões soltas no plano (privacidade do PJ,
1 PJ ativo por sala, participante XOR personagem/NPC).

## Escopo

**Entra:**
- `srd.prisma` — 9 tabelas de referência (`srd_species`, `srd_classes`, `srd_subclasses`,
  `srd_class_features`, `srd_backgrounds`, `srd_feats`, `srd_spells`, `srd_equipment`,
  `srd_monsters`); somente leitura por construção.
- `characters.prisma` — `characters` (com `is_visible_to_master`) e `npc_templates`
  (com `is_public`).
- `rooms.prisma` — `rooms` (`code` único), `room_members` (PK composta), `room_characters`
  (`@@unique([room_id, active_for_user_id])` = 1 PJ ativo por sala por jogador),
  `room_temp_npcs`.
- `initiative.prisma` — `initiatives`, `initiative_participants` com `participant_type` XOR
  (`character_id`/`temp_npc_id`) via **CHECK adicionado à mão na migration SQL** (Prisma não
  tem CHECK nativo).
- `platform.prisma` — `notifications`, `audit_rolls`, `audit_logs` com índices
  `(room_id, created_at)` para a timeline de auditoria.
- Enums: `room_status`, `member_role`, `initiative_status`
  (draft→rolling→ordered→active→finished), `participant_type`, `added_mode`,
  `notification_type`.
- `users.deleted_at` (timestamptz nullable) — coluna do soft delete; o fluxo de exclusão
  de conta é P12.
- Migration única aplicada no container; `db:seed` segue idempotente.
- `docs/db/modelo-de-dados.md` completo: seções dos 5 domínios, invariantes, diagrama ER.
- Remover `prisma/schema/example.prisma` (o molde cumpre seu papel com domínios reais).

**Não entra (fora de escopo):**
- Seeder do SRD 5.2 e helpers de busca (P4).
- Qualquer service/controller/route/UI (P5 em diante) — o fluxo `app/api → controller →
  service` nasce com as features que o usam.
- State machine da iniciativa como regra documentada em `docs/negocio/` (P8 — aqui só o
  enum `initiative_status` existe).
- Fluxo de soft delete/exclusão de conta e salas órfãs (P12 — só a coluna).
- Realtime/EventBus/SSE (P7).

## Comportamento / fluxos

Sem mudança visível ao usuário — é fundação. O comportamento verificável é do banco:
a migration aplicada cria 20 tabelas novas; `db:seed` roda duas vezes seguidas sem falhar;
inserções que violem as constraints são rejeitadas (participante com dois donos ou nenhum,
segundo PJ ativo do mesmo jogador na mesma sala, código de sala duplicado).

## Impacto técnico

- **Banco:** 5 arquivos de domínio + 20 tabelas + 6 enums + CHECK XOR (migration editada) +
  índices de auditoria; detalhe e motivo de cada tabela em
  [`db/modelo-de-dados.md`](../../db/modelo-de-dados.md).
- **API:** nenhum route handler/controller/service novo.
- **UI:** nenhuma rota ou componente tocado.

## Regras de negócio relacionadas

`docs/negocio/` ainda não tem regras escritas. As que este schema **materializa** como
constraint (privacidade do PJ, 1 PJ ativo, XOR de participante) têm a decisão registrada no
plano §3; a state machine da iniciativa nasce em `docs/negocio/` em P8, antes do service.

## Critérios de aceite

<!-- kit:criterios -->
- [ ] Os 6 arquivos `.prisma` do plano §3 existem e cobrem todas as tabelas (auth entregue em P2; 5 novos).
- [ ] Enums criados: `room_status`, `member_role`, `initiative_status`, `participant_type`, `added_mode`, `notification_type`.
- [ ] CHECK XOR (`character_id`/`temp_npc_id`) editado à mão na migration SQL e rejeita inserção inválida na validação no container.
- [ ] UNIQUEs no lugar: `rooms.code`, `@@unique([room_id, active_for_user_id])`, PK composta de `room_members`; índices `(room_id, created_at)` em `audit_rolls`/`audit_logs`.
- [ ] `users.deleted_at` existe (nullable) sem quebrar o adapter do Better Auth (login/logout seguem funcionando).
- [ ] `yarn db:migrate` aplica limpo no container; `yarn db:seed` duas vezes seguidas sem falhar.
- [ ] `docs/db/modelo-de-dados.md` completo e no mesmo commit do schema.
- [ ] `example.prisma` removido; `yarn format:check && yarn typecheck && yarn lint && yarn test:cov` verdes (ratchet não desce).
<!-- /kit:criterios -->

## Dívida / não exercitado

Nenhuma até aqui — seção a preencher durante o trabalho e no fechamento.

## Decisões em aberto

- Nenhuma — a modelagem segue o plano §3 (decisões do usuário registradas lá); a exceção
  Better Auth (nomes dos models) já está registrada em `docs/db/modelo-de-dados.md`.
