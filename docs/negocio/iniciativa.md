# Iniciativa — dado no servidor, ordem e estados

**Status:** vigente
**Domínio:** iniciativa

## Enunciado

### Abrir a iniciativa

- Só o **mestre** abre. Ele vê a lista pré-marcada (PJs ativos, NPCs persistentes e
  temporários) e **desmarca** quem fica de fora.
- Quem está **sem PJ ativo**, ou cujo PJ morreu naquela sala, **não entra**.
- O `initiative_mod` é **congelado** na abertura (ficha do PJ ou molde do NPC) e não muda se a
  ficha mudar depois.
- Abrir leva a sala a `active` e **exige** que nenhum participante (nem o mestre) esteja
  `active` em outra sala. Se alguém estiver, a abertura é recusada: o mestre vê **quem** está
  ocupado, e só essa pessoa vê **qual** mesa e o botão "Solicitar pause" (ver
  [`salas.md`](./salas.md)).

### Dado e rolagem

- O dado é rolado **no servidor** com rejection sampling (sem viés de módulo). Cliente nenhum
  envia resultado.
- Resultado = d20 + `initiative_mod` congelado. `rollResult` guarda o **total**.
- Cada **jogador** rola o próprio d20, **uma vez**. O **mestre** rola os NPCs num botão, mas
  cada NPC recebe um d20 **independente** (divergência consciente do SRD, que faz uma rolagem
  por grupo idêntico). O mestre **não** rola por jogador.
- **Vantagem e desvantagem** são marcadas pelo mestre **antes** da rolagem, por participante;
  o servidor rola dois d20 e fica com o maior (ou o menor). Ambos vão para a auditoria.
- **Inspiração** (SRD 5.2.1, "Heroic Inspiration"): o mestre concede a um participante; é
  **binária** (conceder a quem já tem não soma) e vale só na iniciativa em curso. O jogador a
  gasta **depois** de rolar para re-rolar o d20, e o **novo resultado vale**. A rolagem
  original continua na auditoria. Doar a outro jogador não existe nesta fase.
- Fora a Inspiração e o desempate, **não há** re-rolagem nem desfazer rolagem de jogador.
- Toda rolagem (inclusive a descartada por Inspiração e as de desempate) grava `audit_rolls`.
- **Rate limit:** 30 ações por 60 s por usuário; o lote de NPCs conta **uma por NPC**. Ao
  estourar: 429 "Muitas rolagens, aguarde alguns segundos", sem gravar nada.

### Estados

`draft → rolling → ordered → active → finished`

- Só o **mestre** avança. Abre as rolagens (`draft → rolling`), ordena (`rolling → ordered`)
  e ativa o combate (`ordered → active`) e o finaliza (`active`/`paused → finished`, ver
  abaixo).
- O mestre **ordena só com quem já rolou**. Quem não rolou **fica de fora deste combate**, sem
  rolar depois: se estava online e saiu, perdeu a partida.
- O mestre pode **remover** qualquer participante da fila antes ou durante o combate (kick).
  Isso **não** tira o jogador da sala nem conta como morte. Se era a vez dele, a vez passa ao
  próximo. As rolagens dele continuam na auditoria.
- **Cancelar** vale em `draft`, `rolling` e `ordered`: descarta o combate (a auditoria fica) e
  a sala volta a `lobby`. Depois de `active`, só finalizar (P9).

### Ordem e desempate

- Ordem por total decrescente. Empate: maior `initiative_mod`. Persistindo, **re-rolagem só
  entre os empatados**: cada um rola o próprio d20 (jogador pelo PJ, mestre pelos NPCs), sem
  vantagem. Se empatar de novo, repete entre os que seguem empatados, até desempatar. Cada
  tentativa é auditada como "desempate".
- A regra do SRD (o mestre decide entre monstros, os jogadores entre PJs) **não** é a adotada;
  vale a do produto.

### Combate: vez e rodadas

- Passa a vez de um **PJ** o jogador dono dele **ou** o mestre; a de um **NPC**, só o mestre.
  O mestre pode passar qualquer vez (destrava jogador ausente).
- A rotação é **transacional**: quem passa marca que jogou e a vez vai ao próximo da fila, sem
  pular nem repetir, mesmo com dois cliques simultâneos.
- Passar do **último** volta ao topo e começa a **rodada seguinte** (contador visível,
  "Rodada N", começando em 1 ao ativar). A marca "já jogou" zera a cada rodada.
- O próximo da fila vê "Prepare-se"; quem está na vez vê "É a sua vez".

### Entrada no meio

- Só o **mestre** adiciona. Pode entrar PJ ativo que não esteja na fila (inclusive de quem
  chegou à sala depois) ou NPC (persistente ou temporário). **Não** volta quem foi removido
  (kick é definitivo naquele combate) nem PJ morto naquela sala.
- Em `draft` e `rolling`, entra como os demais e **rola normalmente** (jogador pelo próprio
  PJ, mestre pelos NPCs).
- Em `ordered` e `active`, entra **no fim da fila, sem rolar**. Com o combate em curso, joga
  ainda nesta rodada se a vez não tiver chegado ao fim.

### Finalizar

- Só o **mestre**, com **confirmação**, em `active` ou `paused`. A iniciativa vai a
  `finished` e a sala volta a `lobby` (o que libera a exclusividade).
- A Inspiração não gasta se perde: vale só naquele combate.
- Antes de `active` não se finaliza: cancela-se.

### O que cada um vê

- **Mesa aberta:** todos da sala veem a mesma fila — a ordem, o **total** de cada um (PJ e
  NPC), quem está na vez, o próximo, a rodada e as marcas (já jogou, Inspiração, modo de
  rolagem, desempate pendente).
- Durante `rolling` a lista já mostra quem rolou e o total, antes de o mestre ordenar.
- Quem saiu da fila (kick, morte, não rolou a tempo) **some** da tela; a linha e a auditoria
  continuam no banco.
- Só o **mestre** vê os candidatos a entrar (na abertura e no meio) e os controles de cada
  participante. Os stats de NPC continuam só dele (ver [`salas.md`](./salas.md)).
- Decidido em 2026-11-27.

### Sala: `active`, pausa e exclusividade

- A sala fica `active` apenas durante o que **não pode ser parado**: a iniciativa e o combate.
  `paused` congela a iniciativa exatamente como está (posição e estado) e retoma de onde parou.
  Em `lobby` ou `paused` não se abre uma iniciativa nova.
- Ao abrir e ao retomar vale a exclusividade: um usuário, como mestre ou jogador, em **uma**
  sala `active`.
- **Solicitar pause:** o jogador ocupado em outra mesa gera a notificação `pause_requested` ao
  mestre dessa mesa, **sem efeito automático**. Um pedido pendente por jogador por sala. O
  mestre vê o jogador, não a mesa de destino.
- Em `paused`, **ninguém passa a vez nem adiciona participante**: o mestre retoma antes.

### Morte do PJ

- **Só o mestre** marca, e vale **só naquela sala**. Grava `died_at`, zera
  `active_for_user_id` e tira o PJ da ordem na hora (se era a vez dele, passa ao próximo).
- O jogador fica na sala sem PJ e precisa anexar outro que não esteja morto **ali**.
- **Reviver não existe agora**, mas vai existir: `died_at` segue anulável e a marcação mora
  num único ponto do service.

## Racional

O produto existe para que a ordem de combate saia de um dado auditável e sem refazer até
gostar. Por isso a rolagem é do servidor, definitiva, sem desfazer, e a única exceção é um
recurso que o próprio jogo concede (Inspiração), que o mestre controla. O mestre manda na mesa
(abre, ordena, remove, cancela), mas não rola pelo jogador: a rolagem de cada PJ é do jogador.
A sala só fica `active` quando há algo que não pode parar, para que campanhas simultâneas
convivam em `lobby` e `paused`.

## Casos de borda

- Todos removidos ou ninguém rolou: o mestre não consegue ordenar (precisa de ao menos um
  participante com rolagem).
- Quem entrou no fim da fila sem rolar continua depois de todos os que rolaram, na ordem em
  que entrou, mesmo que a fila se reordene por uma remoção.
- Remover o último da fila quando era a vez dele: a vez volta ao topo **e** a rodada avança.
- O único participante restante passa a vez: volta a ele mesmo, na rodada seguinte.
- O removido era o único que faltava rolar: o mestre já pode ordenar.
- Lote com mais NPCs que o limite de ações: recusado por inteiro, sem gravar parte.
- Inspiração concedida a quem já tem: continua uma só.
- Mestre cancela com jogadores já rolados: tudo é descartado; as rolagens permanecem só na
  auditoria.
- PJ morre durante `ordered` ou `rolling`: sai da lista; o mestre pode ordenar se for o único
  que faltava.

## Onde é aplicada

[`src/server/iniciativa/`](../../src/server/iniciativa/) (abertura, rolagem, mesa, pausa,
combate e leitura — `iniciativa.leitura.service.ts`). Schema em [`prisma/schema/initiative.prisma`](../../prisma/schema/initiative.prisma).
Specs: [`api/0002`](../features/api/0002-initiative-core.md) (núcleo, P8) e
[`ui/0004`](../features/ui/0004-initiative-ux.md) (combate na tela, P9).

## Decisões em aberto

- **Reviver** o PJ morto (fase futura).
- **Doação** de Inspiração a outro jogador.
- **Talento** da ficha que re-rola (ex.: Halfling Lucky): depende de a ficha guardar talentos
  de forma estruturada.
- **Prazo automático** para quem não rola: entra com o timer (P10).
- Rolagem **única por grupo** de NPCs idênticos (como no SRD): hoje cada NPC rola o seu.
