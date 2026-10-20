# Cálculos da ficha de personagem e privacidade

**Status:** vigente
**Domínio:** personagens

## Enunciado

Ao criar ou editar uma ficha, o servidor deriva sozinho — o usuário nunca digita:

- **Modificador de atributo:** `mod(p) = ⌊(p − 10) / 2⌋`.
- **HP máximo (nível 1):** `hit_die da classe + mod(CON)`.
- **HP máximo por nível acima de 1:** cada nível soma `⌊hit_die/2⌋ + 1 + mod(CON)`
  (progressão oficial por média — a edição de nível recalcula por ela).
- **CA:** `10 + mod(DEX)` (sem armadura no MVP).
- **Iniciativa:** `mod(DEX)`, somando o **bônus de proficiência** quando a ficha tem a feat
  **Alert** (SRD 5.2 "Initiative Proficiency").
- **Bônus de proficiência por nível:** 1–4 → 2 · 5–8 → 3 · 9–12 → 4 · 13–16 → 5 · 17–20 → 6.
- **Point buy (criação):** 27 pontos; cada atributo entre **8 e 15**; custo por valor:
  8→0 · 9→1 · 10→2 · 11→3 · 12→4 · 13→5 · 14→7 · 15→9.

**Privacidade:** `is_visible_to_master` (default `true`) controla se a ficha completa pode
ser lida por alguém que não o dono. Ficha fechada não retorna na leitura por id para não-
donos; a seleção de PJ em sala (P7) mostra apenas nome e stats mínimos de fila.

## Racional

Esses números são regra oficial do D&D 5.5E (SRD 5.2) — calcular no servidor impede ficha
inválida e divergência de mesa. O point buy 27 com teto 15 é o método padrão de criação
equilibrada; "rolar atributos" depende de confiança que o produto ainda não tem (dado do
servidor é para iniciativa). A privacidade existe porque ficha é do jogador: o mestre não
precisa ver itens/truques para rodar iniciativa.

## Casos de borda

- Atributo fora de 8–15 na criação → Zod rejeita no step e o service revalida (fonte única
  do cálculo: o service nunca confia em stats vindos do client).
- Custo total > 27 → rejeitado; custo < 27 é permitido (jogador pode não gastar tudo).
- Feat Alert em revisão de nível → iniciativa recalculada com o novo bônus de proficiência.
- Editar nível para baixo não reduz HP abaixo de `hp_current` (nunca matar por edição) —
  `hp_current = min(hp_current, hp_max novo)`.
- Ficha de NPC completo (`is_npc=true`) segue as mesmas fórmulas — o mestre cria pela mesma
  tela com dados livres de point buy (NPC de monstro tem stats de ficha, não de array).

## Onde é aplicada

- [`src/server/personagens/personagens.service.ts`](../../src/server/personagens/personagens.service.ts) — fórmulas e validação autoritativa.
- [`src/server/personagens/personagens.schema.ts`](../../src/server/personagens/personagens.schema.ts) — validação por step no client.
- [`docs/features/ui/0002-crud-personagem.md`](../features/ui/0002-crud-personagem.md) — spec consumidora.

## Decisões em aberto

- Armadura/equipamento alterando CA (acima de 10 + DEX): quando o MVP ganhar gestão de
  equipamento equipado, a fórmula estende aqui.
