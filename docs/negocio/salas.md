# Salas — entrada, membership e lobby

**Status:** vigente
**Domínio:** salas

## Enunciado

### Criar e abrir

- Qualquer usuário logado cria uma sala e vira o **mestre** (`rooms.master_user_id`). O mestre
  tem no máximo **5 salas abertas** (nem `finished` nem `destroyed`).
- O **código** tem 6 caracteres de um alfabeto de 31 símbolos (maiúsculas e dígitos, sem
  `0 O 1 I L`) e é único; na colisão, sorteia de novo. Na entrada o código passa por trim e
  uppercase.

### Entrada: toda sala é privada

- O código **só abre um pedido**; quem decide a entrada é sempre o mestre.
- O pedido vale com a sala em `lobby` ou `active`. Em `finished` ou `destroyed` a resposta é a
  mesma de um código inexistente ("código inválido"), para não confirmar que ele existiu.
- A membership guarda o estado em `room_members.status`: `pending` · `active` · `left` ·
  `banned` · `rejected`, com a data da última mudança. Um `pending` por usuário por sala.
- O mestre vê o **nome de exibição** de quem pede (não e-mail). Aceitar leva a `active`;
  recusar leva a `rejected`. Depois de **3 recusas** na mesma sala o usuário fica barrado.
- Pedido sem resposta **deixa de valer após 7 dias**.
- O limite de **10 jogadores** (sem contar o mestre) vale **só no aceite**; pendentes não
  ocupam vaga.

### Sair, voltar e expulsar

- Jogador pode sair (`left`). Para voltar, faz **novo pedido**, que passa pelo mesmo caminho.
- O mestre expulsa um jogador (`banned`): ele **não pode** voltar àquela sala.
- Sair e expulsar removem o PJ ativo do jogador; os NPCs ficam.
- Toda remoção é **soft delete**: a linha fica **30 dias** antes da exclusão definitiva. A
  data é guardada; a purga é um job futuro (ver "Decisões em aberto").
- O **mestre não sai nem é expulso**. Ele encerra a sala ou passa o cargo.

### Passar o cargo

- Instantâneo, para um membro `player` com status `active`, e **só com a sala em `lobby` ou
  `paused`** — nunca no meio de uma iniciativa em andamento.
- O novo mestre **perde o PJ ativo** (mestre só joga com NPCs); o antigo vira `player` sem PJ.
- Os NPCs persistentes do antigo mestre **saem da sala**, porque são fichas dele. O novo mestre
  anexa os dele.

### Encerrar a sala

- O mestre destrói a própria sala (`status = destroyed`, `destroyed_at` preenchido; soft) em
  qualquer status **exceto `active`**. Em `active` a UI oferece **pausar**.

### PJ ativo

- O jogador anexa só **PJ próprio e não NPC**. O mesmo PJ pode estar em várias salas
  (campanhas simultâneas). A troca de PJ é livre; um por jogador por sala (UNIQUE
  `(room_id, active_for_user_id)`, trocado por upsert).
- **Mestre não escolhe PJ** na própria sala: só tem NPCs.
- Jogador sem PJ pode ficar no lobby, mas é instruído a anexar um. **Sem PJ não há iniciativa.**
- **Morte é por sala**: `room_characters.died_at` impede anexar de novo o mesmo PJ **àquela
  sala**. Em outras salas ele segue vivo. Quem marca a morte é a iniciativa (P8/P9).

### NPCs e visibilidade

- NPC **persistente** na sala: só ficha do **próprio mestre** (por ora). NPC **temporário**:
  instanciado de template próprio ou público, copiando os stats
  ([`npcs.md`](./npcs.md)).
- O jogador vê dos NPCs **só o rótulo** (sem HP, CA nem stats). Dos PJs alheios vê nome,
  classe e nível; a ficha completa só se o dono a tornou pública.

### Uma sala `active` por usuário *(documentada; implementada com a iniciativa)*

- Um usuário, como mestre **ou** jogador, só pode estar em **uma** sala `active`. Em `lobby`
  pode estar em várias. Entrar numa segunda sala `active` é **recusado**, com link para a
  que está em andamento.
- O mestre pode **pausar** a sala (`active` → `paused`) quando não consegue terminar a
  batalha; `paused` **libera** mestre e jogadores para outras salas `active`. Retomar
  (`paused` → `active`) revalida a exclusividade.
- Ao ativar ou retomar com alguém ocupado em outra sala, o **mestre vê quem** está ocupado e
  **só essa pessoa vê qual mesa**. Ela tem o botão **"Solicitar pause"**, que gera uma
  notificação ao mestre da outra mesa, **sem efeito automático**. Um pedido pendente por
  jogador por sala; o mestre vê o jogador, **não** a mesa de destino.
- `paused` (estado da sala) **não é** a pausa do timer (`rooms.is_paused`); a do timer passa a
  `timer_paused` na P10.

### Tempo real

- Eventos: `member:requested|joined|rejected|left|kicked` · `character:changed` ·
  `npc:added|removed` · `master:transferred` · `room:destroyed`. Só avisam que algo mudou; o
  cliente refaz a leitura do estado.
- O mestre recebe `member:requested`; os demais vão a todos os membros `active`; o `pending`
  só recebe o resultado do próprio pedido. Sem replay: ao reconectar, o cliente busca o
  estado completo.

## Racional

Uma mesa real tem dono e convidados: o código circula em mensagens e não pode ser uma chave de
entrada por si só, então o mestre sempre aprova. Expulsão e soft delete dão ao mestre controle
sem perder rastro. A regra de uma sala `active` por vez, com o `paused` como válvula, reflete
que ninguém conduz ou joga duas batalhas simultâneas, mas campanhas se alternam entre sessões.

## Casos de borda

- Código com espaço ou minúsculas: normalizado antes da busca.
- Mestre aceita com a sala cheia: recusado com erro ao mestre; o pedido segue `pending`.
- Usuário `banned` pede de novo: recusado.
- Passar o cargo a quem tem PJ ativo: o vínculo é removido (o `room_characters` do PJ some).
- Destruir a sala `active`: recusado; a UI oferece pausar.

## Onde é aplicada

- Services em [`src/server/salas/`](../../src/server/salas/): `salas.service.ts` (criar, pedir
  entrada, destruir), `salas.membros.service.ts` (aceitar/recusar, sair, expulsar, cargo),
  `salas.elenco.service.ts` (PJ e NPCs), `salas.lobby.service.ts` (leitura por papel) e
  `salas.regras.ts` (limites e guardas).
- Eventos em tempo real: [`src/server/realtime/`](../../src/server/realtime/) e
  `GET /api/rooms/[id]/events`.
- Schema: [`prisma/schema/rooms.prisma`](../../prisma/schema/rooms.prisma).
- A regra "uma sala `active` por usuário" **ainda não é aplicada em código**: depende de a
  sala poder ficar `active`, o que nasce com a iniciativa (P8).

## Decisões em aberto

- **Purga** das linhas soft-deleted (30 dias) e dos pedidos expirados: depende de job
  agendado (P10/P12).
- NPC persistente de **outro** mestre (templates públicos viram ficha?): por ora só do próprio.
- Exclusividade de sala `active`, pausa e "Solicitar pause": regra fechada, implementação na
  feature de iniciativa.
