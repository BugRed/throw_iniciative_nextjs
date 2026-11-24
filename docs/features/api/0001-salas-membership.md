# Salas, membership e tempo real (SSE)

**Status:** em-desenvolvimento
**Responsabilidade:** api
**Branch:** feature/api-API01/salas-membership
**Autor:** ZCode · **Data:** 2026-11-24

> Esta spec é também o **estado** da feature. O que o git sabe (commits, arquivos,
> camadas tocadas) é calculado pelo hook e não se escreve aqui. O que mora aqui é o
> que nenhum commit guarda: intenção, próximo passo e dívida.

## Estado

<!-- kit:camadas -->
- [x] prisma — migration `salas_membership`: `paused`, `room_members.status`, `died_at`, tipos de notificação
- [x] service — `src/server/salas/`: sala, membros, elenco e leitura do lobby (EventBus fica com o SSE)
- [x] controller — `salas.controller.ts`: sessão → id → service → evento
- [x] route — `GET /api/rooms/[id]/events` (SSE) + `src/server/realtime/` (EventBus e fluxo)
- [x] ui — `/rooms`, `/rooms/new`, `/rooms/join`, `/rooms/[id]` (lobby mestre ≠ jogador) e `useRoomEvents`
- [x] teste — service, controller, EventBus, SSE, rota, actions, componentes e páginas (427 testes; `test:cov` verde com `--testTimeout=30000`, ver dívida)
- [x] doc — `docs/negocio/salas.md` e `docs/db/modelo-de-dados.md`
<!-- /kit:camadas -->

**Próximo passo:** exercitar no navegador o fluxo de ponta a ponta (dois usuários: pedido →
aceite → lobby atualizando sozinho) e então `/fechar`.

## Problema / motivação
A iniciativa (P8+) precisa de uma mesa: um mestre, jogadores presentes e cada PJ escolhido.
Hoje existem personagens e NPCs, mas nada os reúne em uma sala nem avisa os participantes
quando algo muda.

Esta fase entrega o ciclo de vida da sala até o lobby e a infra de tempo real que as fases
seguintes consomem.

## Escopo
**Entra:**
- Criar sala (mestre) com código de 6 caracteres, gerado com retry até ser único.
- Entrar na sala pelo código (vira `player`; papel fixo no ingresso).
- Lobby: membros, NPCs persistentes e temporários (instanciar de template), seleção de PJ
  ativo (um por jogador por sala, troca por upsert na UNIQUE).
- UI distinta para mestre e jogador.
- Infra realtime: `EventBus` em memória, endpoint SSE e hook `useRoomEvents`.

**Não entra (fora de escopo):**
- Iniciativa, rolagem, fila e timer (P8–P10).
- Rate limit, auditoria e exclusão de conta com salas órfãs (P12).
- EventBus multi-instância / Redis (pós-MVP).

## Comportamento / fluxos
Mestre cria a sala → recebe o código → jogadores entram pelo código → cada jogador escolhe
um PJ → mestre adiciona NPCs → todos veem o lobby atualizar via SSE.

## Impacto técnico
- **Banco:** sem tabela nova prevista; ver [`prisma/schema/rooms.prisma`](../../../prisma/schema/rooms.prisma).
- **API:** controller + service de salas, route handler SSE.
- **UI:** rotas de sala em `(app)`, componentes de lobby.

## Regras de negócio relacionadas
[`../../negocio/salas.md`](../../negocio/salas.md) (entrevista concluída). Relacionada:
[`../../negocio/npcs.md`](../../negocio/npcs.md).

## Critérios de aceite

<!-- kit:criterios -->
- [x] Mestre cria sala e recebe código de 6 caracteres único, mesmo com colisão.
- [x] Jogador pede entrada pelo código e só vira `player` quando o mestre aceita; pedido repetido não duplica.
- [x] Jogador escolhe PJ ativo; trocar de PJ substitui o anterior, sem duplicar.
- [x] Mestre adiciona NPC persistente e instancia NPC temporário de template no lobby.
- [x] Só membro vê a sala; só o mestre altera NPCs e configuração.
- [ ] Mudança no lobby chega aos demais membros por SSE, sem recarregar.
- [x] Regras documentadas em `docs/negocio/salas.md`; gate verde.
<!-- /kit:criterios -->

## Dívida / não exercitado
- `sairDaSala` e `expulsarMembro` não checam o status da sala: sair e expulsar valem também em `active` (decisão minha, `salas.md` não diz). Um PJ que sai no meio do combate fica para a P8 tratar na fila.
- `pedirEntrada` aceita sala `paused` além de `lobby`/`active` (a regra só cita as duas primeiras).
- Ao marcar morte, a P8 precisa zerar `active_for_user_id`, senão a UNIQUE bloqueia o próximo PJ do jogador.
- `test:cov` estoura o timeout de 5 s em testes do `CharacterWizard` quando roda a suíte inteira (5 falhas no commit-base, sem esta feature; passa isolado e com `--testTimeout=30000`). Fragilidade anterior, sem relação com salas.
- O stream SSE é em memória, por instância: com mais de um processo o evento só chega a quem está conectado no mesmo (pós-MVP, Redis atrás de `EventBus`).
- Entrega de evento ponta a ponta (action → bus → stream → `router.refresh`) **não foi exercitada no navegador**. Verificado no app rodando: o stream abre autenticado e emite `: conectado` sem buffer, o lobby do mestre renderiza com código, e rotas sem sessão dão 401/redirect. A entrega do evento está coberta só por teste unitário. Por isso o critério de SSE segue aberto.
- O lobby só oferece NPCs e moldes **próprios** do mestre; molde público de outro mestre é aceito pelo service, mas a UI não o lista.
- Purga dos soft deletes e dos pedidos expirados: sem job ainda.

## Decisões em aberto
- Nenhuma de negócio: a entrevista fechou tudo (ver `salas.md`). Em aberto só a purga dos
  soft deletes (job, P10/P12).
