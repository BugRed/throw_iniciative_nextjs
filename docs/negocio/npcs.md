# NPCs — Aventureiro e Respawn

**Status:** vigente
**Domínio:** personagens

## Enunciado

Há dois tipos de NPC, com ciclos de vida diferentes:

- **NPC Aventureiro** — ficha completa, igual à de um PJ (mesmo wizard e mesmos cálculos de
  [`personagens-calculos.md`](./personagens-calculos.md)), com `characters.is_npc = true`.
  Vive **fora da sala** e pode ser reutilizado em várias salas. Os atributos são livres
  (point buy do wizard). **Sempre visível ao mestre dono**: `is_visible_to_master` é forçado
  a `true` e o toggle de privacidade não se aplica.
- **NPC Respawn** — monstro de encontro (orc, goblin…). O catálogo é o `srd_monsters`,
  somente leitura ([`srd-somente-leitura.md`](./srd-somente-leitura.md)). O stat block parte
  **idêntico ao SRD** (PV, CA, iniciativa = mod(DES)); o mestre pode editá-lo **antes de
  adicionar**. A edição gera um **molde próprio** (`npc_templates`, dono = quem editou) — o SRD
  nunca muda. Instanciar o molde na sala (`room_temp_npcs`) é da P7.

**Quem cria:** qualquer usuário logado. "Mestre" é só quem cria sala; não há papel global.

## Racional

O mestre prepara os NPCs principais antes de abrir a mesa e precisa de encontros aleatórios
rápidos durante o jogo. Separar os dois evita forçar uma ficha completa em um goblin e evita
reduzir um NPC recorrente a um stat block.

## Casos de borda

- Template editado depois não altera instâncias já criadas na sala (cópia na instanciação).
- Monstro do SRD sem `hit_points`/`armor_class` legível no payload: usa o mínimo 1 PV e CA 10
  e o mestre corrige na edição.
- Só o dono lê, edita ou exclui o próprio molde; qualquer outro recebe 404.
- Tentar alternar privacidade de NPC Aventureiro é rejeitado (validação), não ignorado em silêncio.
- `is_public` (molde visível a outros mestres) **fica fora** desta fase: o molde é pessoal.

## Onde é aplicada

- [`src/server/npcs/npcs.service.ts`](../../src/server/npcs/npcs.service.ts) — moldes e catálogo.
- [`src/server/personagens/personagens.service.ts`](../../src/server/personagens/personagens.service.ts) — NPC Aventureiro (`is_npc`).

## Decisões em aberto

- Compartilhar moldes entre mestres (`is_public`) — dívida, fora da P6.
