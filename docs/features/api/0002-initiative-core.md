# Núcleo de iniciativa (state machine e dado no servidor)

**Status:** em-desenvolvimento
**Responsabilidade:** api
**Branch:** feature/api-API02/initiative-core
**Autor:** ZCode · **Data:** 2026-11-24

> Esta spec é também o **estado** da feature. O que o git sabe (commits, arquivos,
> camadas tocadas) é calculado pelo hook e não se escreve aqui. O que mora aqui é o
> que nenhum commit guarda: intenção, próximo passo e dívida.

## Estado

<!-- kit:camadas -->
- [ ] prisma — migration: `cancelled`, modo de rolagem, Inspiração, remoção, desempate e tipo de auditoria
- [ ] service — `src/server/iniciativa/`: dado, desempate, state machine, rolagens e transições da sala
- [ ] controller — orquestração e eventos SSE
- [ ] route — a definir (Server Actions como na P7, ou route handler)
- [ ] ui — não se aplica a princípio: a UX da fila é a P9
- [ ] teste — dado, desempate e state machine por comportamento
- [ ] doc — `docs/negocio/iniciativa.md`
<!-- /kit:camadas -->

**Próximo passo:** entrevista concluída e regra em [`iniciativa.md`](../../negocio/iniciativa.md).
Implementar: migration → dado e desempate (funções puras) → services → controller + eventos →
testes → `/quality-check` e `/fechar`.

## Problema / motivação
A sala já reúne mestre, jogadores, PJs e NPCs (P7), mas não há combate: ninguém rola
iniciativa, não existe ordem, e a sala nunca sai do `lobby`. O produto existe para isso: a
rolagem acontece no servidor (auditável, sem dado viciado) e a ordem sai do desempate oficial.

Esta fase entrega o núcleo autoritativo: o dado, o desempate, a máquina de estados da
iniciativa e a transição da própria sala (`lobby` → `active` ⇄ `paused` → `finished`).

## Escopo
**Entra:**
- `rollDie` com rejection sampling (sem viés de módulo) e o desempate oficial
  (total → modificador → re-rolagem).
- Máquina de estados da iniciativa (`draft → rolling → ordered → active → finished`) e as
  operações de iniciar, rolar (jogador e NPCs em lote) e ordenar/ativar.
- Auditoria de cada rolagem em `audit_rolls`; rate limit na rolagem.
- Transição da sala para `active`, o pause/retomada e a regra de uma sala `active` por usuário
  já documentada em [`docs/negocio/salas.md`](../../negocio/salas.md).
- Marcar a morte de um PJ na sala (`room_characters.died_at`), que a P7 deixou para aqui.

**Não entra (fora de escopo):**
- Fila na tela, "é a sua vez", passar a vez, adicionar participante no meio e finalizar com
  confirmação (P9).
- Timer e passe automático (P10); som e aviso visual (P11).
- Auditoria de rejeição e hardening completo de rate limit (P12).

## Comportamento / fluxos
Mestre abre a iniciativa (escolhe quem entra; sala vai a `active` e a exclusividade é checada)
→ jogadores rolam o próprio d20 e o mestre rola os NPCs → mestre ordena com quem rolou →
desempate → mestre ativa. Detalhe completo, incluindo Inspiração, vantagem, remoção, cancelar,
pausa e morte, em [`iniciativa.md`](../../negocio/iniciativa.md).

## Impacto técnico
- **Banco:** ver [`prisma/schema/initiative.prisma`](../../../prisma/schema/initiative.prisma) e
  `audit_rolls` em `platform.prisma`.
- **API:** `src/server/iniciativa/` (service, controller, schema) e eventos SSE novos.
- **UI:** nenhuma a princípio.

## Regras de negócio relacionadas
[`../../negocio/iniciativa.md`](../../negocio/iniciativa.md) (entrevista concluída). Relacionadas:
[`../../negocio/salas.md`](../../negocio/salas.md) (uma sala `active` por usuário, `paused`,
morte por sala) e [`../../negocio/npcs.md`](../../negocio/npcs.md).

## Critérios de aceite

<!-- kit:criterios -->
- [ ] O dado é rolado no servidor sem viés de módulo; toda rolagem grava `audit_rolls`.
- [ ] Jogador rola o próprio d20 uma vez; mestre rola cada NPC com d20 independente e não rola por jogador.
- [ ] Vantagem/desvantagem do mestre e Inspiração (re-rolagem depois de rolar) funcionam; a rolagem original fica auditada.
- [ ] Ordem por total, modificador e re-rolagem entre empatados, repetida até desempatar.
- [ ] Estados avançam só pelo mestre; ordenar exige ao menos um que rolou; cancelar antes de `active` volta a sala a `lobby`.
- [ ] Remover participante e marcar morte tiram da ordem e passam a vez quando for o caso.
- [ ] Abrir ou retomar recusa quem está `active` em outra sala e mostra a mesa só ao ocupado; "Solicitar pause" notifica o outro mestre.
- [ ] Rate limit de 30 ações por 60 s responde 429 sem gravar.
- [ ] Regras em `docs/negocio/iniciativa.md`; gate verde.
<!-- /kit:criterios -->

## Dívida / não exercitado
_(nada ainda)_

## Decisões em aberto
- Nenhuma de negócio: a entrevista fechou tudo (ver `iniciativa.md`). Em aberto só o que ela
  lista como fase futura: reviver, doação de Inspiração, talento que re-rola e prazo
  automático.
