# Combate na tela: fila, vez, passar e finalizar

**Status:** em-desenvolvimento
**Responsabilidade:** ui
**Branch:** feature/ui-UI04/initiative-ux
**Autor:** BugRed · **Data:** 2026-11-27

> Esta spec é também o **estado** da feature. O que o git sabe (commits, arquivos,
> camadas tocadas) é calculado pelo hook e não se escreve aqui. O que mora aqui é o
> que nenhum commit guarda: intenção, próximo passo e dívida.

## Estado

<!-- kit:camadas -->
- [x] prisma — coluna `round` em `initiatives` (contador de rodada)
- [x] service — `passarVez`, `adicionarParticipante`, `finalizarIniciativa` em `iniciativa.combate.service.ts`; remoção do último vira a rodada; anexados ficam no fim ao reposicionar
- [x] controller — `controlarPasseDeVez`, `controlarEntradaNoMeio`, `controlarFinalizacao` (evento `initiative:changed`)
- [ ] route — Server Actions de todas as operações da mesa (as da P8 que esperavam tela e as novas)
- [ ] ui — `QueueView`, "É a sua vez", badge "Prepare-se", painel do mestre, confirmação de finalizar
- [ ] teste — services e controller feitos; faltam os componentes
- [x] doc — `docs/negocio/iniciativa.md` (passar a vez, entrada no meio, finalizar)
<!-- /kit:camadas -->

**Próximo passo:** Server Actions de todas as operações da mesa e a UI (`QueueView`, painel do
mestre, "É a sua vez"/"Prepare-se", confirmar finalizar) — carregar `camada-ui` e `next16`.

## Problema / motivação
A P8 entregou o núcleo autoritativo (dado, desempate, estados, pausa, morte), mas o combate
não existe na tela: só "Iniciar iniciativa" e "Solicitar pause". Ninguém vê a ordem, não há
"é a sua vez", e a iniciativa nunca chega a `finished`.

Esta fase põe o combate na tela de ponta a ponta — da rolagem à fila e ao fim — e fecha a
state machine com passar a vez, entrada no meio e finalizar.

## Escopo
**Entra:**
- `QueueView` com a ordem, quem joga agora e quem vem a seguir ("Prepare-se").
- "É a sua vez" para o jogador da vez; passar a vez (rotação transacional).
- Telas das operações da P8 que só tinham service: abrir rolagens, rolar, modo de rolagem,
  Inspiração, desempate, ordenar, ativar, remover, morte, pausar e retomar, cancelar.
- Adicionar participante no meio do combate.
- Finalizar com confirmação: iniciativa `finished`, sala de volta a `lobby`.
- Atualização por SSE para todos da sala.

**Não entra (fora de escopo):**
- Timer e passe automático (P10); som e aviso visual pulsante (P11).
- Auditoria de rejeição e hardening de rate limit (P12); E2E Playwright (P13).

## Comportamento / fluxos
Mestre abre → todos veem a lista e rolam → mestre ordena e ativa → a `QueueView` mostra a
ordem, a rodada, quem joga ("É a sua vez") e quem vem ("Prepare-se") → quem tem a vez (ou o
mestre) passa → no fim da fila a rodada avança → mestre finaliza com confirmação e a sala
volta a `lobby`. Regras (quem passa, entrada no meio, finalizar, pausa) em
[`iniciativa.md`](../../negocio/iniciativa.md).

## Impacto técnico
- **Banco:** `initiatives.round` (int, começa em 1 ao ativar).
- **API:** `src/server/iniciativa/` (services novos, controller, Server Actions).
- **UI:** rota da sala (`src/app/rooms/...`) e componentes da fila em `src/shared/components/`.

## Regras de negócio relacionadas
[`../../negocio/iniciativa.md`](../../negocio/iniciativa.md) ·
[`../../negocio/salas.md`](../../negocio/salas.md)

## Critérios de aceite

<!-- kit:criterios -->
- [ ] Todos da sala veem a mesma fila, a vez atual e o próximo, atualizados por SSE.
- [x] Só quem tem a vez (ou o mestre) passa; a rotação é transacional e não pula nem repete.
- [x] O mestre adiciona participante: em `draft`/`rolling` ele rola; em `ordered`/`active` entra no fim sem rolar; removido e PJ morto não voltam.
- [ ] Rodada avança ao passar do último e aparece na tela; em `paused` não se passa nem adiciona.
- [ ] Finalizar pede confirmação, marca `finished` e devolve a sala a `lobby`.
- [ ] Toda operação da P8 tem tela e Server Action.
- [x] Regras em `docs/negocio/iniciativa.md`; gate verde.
<!-- /kit:criterios -->

## Dívida / não exercitado
- Gate de 2026-11-27: `format:check`, `typecheck`, `lint` e `test:cov` (573 testes, `--testTimeout=30000`) verdes; Sonar **não** rodado.
- Services só com Prisma mockado: a trava otimista de `passarVez` (`updateMany` com posição e rodada) não foi exercitada contra o Postgres real nem com cliques concorrentes.
- Entrada no meio calcula a posição pelo tamanho da fila lida antes de gravar: duas inclusões
  simultâneas pelo mesmo mestre podem empatar a posição (sem lock, como a abertura da P8).
- Migration `iniciativa_rodada` aplicada só no Postgres de dev local; nada exercitado no navegador.

## Decisões em aberto
- Nenhuma de negócio: entrevista de 2026-11-27 fechou passar a vez, rodadas, entrada no meio
  e finalizar (ver `iniciativa.md`).
