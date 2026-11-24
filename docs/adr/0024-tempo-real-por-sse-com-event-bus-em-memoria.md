# ADR 0024 — Tempo real por SSE com EventBus em memória; o evento só avisa

**Status:** Proposto · 2026-11-24

## Contexto

A sala precisa mostrar ao mestre e aos jogadores, sem recarregar, quem entrou, quem trocou de
PJ e o que mudou nos NPCs; a iniciativa (P8+) e o timer (P10) vão pesar mais nesse canal. A
restrição é local-first: nada pode exigir serviço externo em dev, e não há Redis no ambiente.
O fluxo de autorização do produto já mora no servidor (controller → service), e o payload de
um evento não deve virar um segundo caminho de leitura que o contorne.

## Decisão

- Canal **SSE** (`GET /api/rooms/[id]/events`, `text/event-stream`), um stream por aba.
- **EventBus em memória** (`src/server/realtime/event-bus.ts`), singleton no `globalThis` pelo
  mesmo motivo do Prisma (o hot-reload reavalia o módulo e deixaria conexões órfãs).
- **O evento só avisa que algo mudou**: leva o tipo e o `roomId`, nunca dado da sala. O cliente
  refaz a leitura, que passa pela autorização do servidor (`router.refresh()`).
- O **controller publica depois do commit** do service, nunca antes e nunca em caso de erro.
- Entrega por audiência: evento geral vai aos membros `active`; evento com `alvo` vai só a
  ele, inclusive a quem ainda está `pending` (que só assim fica sabendo do resultado do
  próprio pedido). Sair ou ser expulso fecha as conexões do usuário.
- **Sem replay**: ao reconectar o cliente refaz a leitura completa. Batida de coração a cada
  25 s; a resposta leva `X-Accel-Buffering: no`.
- A lista de tipos de evento vive em `src/shared/lib/eventos-sala.ts`, usada pelos dois lados.

## Alternativas rejeitadas

- **WebSocket:** o tráfego é só servidor → cliente, e SSE reconecta sozinho no navegador; o
  upgrade de protocolo não traz nada para este caso e complica o Next.
- **Polling:** simples, mas atrasa a vez do jogador e multiplica leituras por aba; a
  notificação de "é a sua vez" (P11) pede push.
- **Evento carregando o estado novo:** poupa uma leitura, mas cria um segundo caminho de dado
  que precisaria repetir a autorização por papel (jogador não vê stats de NPC).
- **Redis pub/sub desde já:** resolveria várias instâncias, ao custo de um serviço novo em dev
  sem necessidade hoje; a interface do `EventBus` permite trocar depois.

## Consequências

- ➕ Zero dependência externa; o dado sensível nunca trafega pelo stream; a autorização é uma
  só.
- ➖ Cada evento custa uma leitura por cliente conectado (`router.refresh()`).
- ⚠️ **Uma instância só**: com mais de um processo o evento só chega a quem está conectado no
  mesmo. Sinal para revisar: o primeiro deploy com mais de uma réplica ou serverless — aí o
  broker passa para Redis atrás da mesma interface.
- ⚠️ Funções serverless que encerram a conexão curto derrubam o stream; hoje o alvo é Node
  longo (container).
