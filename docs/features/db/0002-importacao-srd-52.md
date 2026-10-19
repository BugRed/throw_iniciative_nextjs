# Importação do SRD 5.2

**Status:** entregue
**Responsabilidade:** db
**Branch:** feature/db-DB02/importacao-srd-52
**Autor:** ZCode · **Data:** 2026-10-19

> Esta spec é também o **estado** da feature. O que o git sabe (commits, arquivos,
> camadas tocadas) é calculado pelo hook e não se escreve aqui. O que mora aqui é
> o que nenhum commit guarda: intenção, próximo passo e dívida.

## Estado

<!-- kit:camadas -->
- [x] prisma — seeder do SRD 5.2 nas 9 tabelas `srd_*` (upsert tolerante, item a item)
- [x] service — não se aplica nesta feature: helpers de leitura em `src/server/srd/srd.service.ts` são consulta pura de referência, sem regra de negócio (a entrevista do `grill-regra-negocio` não se aplica — decisões de mapeamento estão aqui e no plano)
- [x] controller — não se aplica nesta feature: sem orquestração de mutação
- [x] route — não se aplica nesta feature: sem endpoint (consumo via RSC a partir da P5)
- [x] ui — não se aplica esta feature de wizard/tela: apenas a linha de atribuição CC-BY no rodapé da landing (molécula `AtribuicaoSrd` + organismo `DestaquesLanding` extraído p/ respeitar o limite de linhas)
- [x] teste — serviço de busca com Prisma mockado; seeder exercitado por `db:seed` 2× idempotente + contagens no container
- [x] doc — atribuição CC-BY 4.0 em `docs/contexto.md` + rodapé da landing; contagens reais registradas aqui
<!-- /kit:camadas -->

**Próximo passo:** nenhum — feature entregue; próxima fase é P5 (CRUD de personagem), branch `feature/ui-UI02/crud-personagem` sobre esta.

## Problema / motivação

O wizard de personagem (P5) e os templates de NPC (P6) escolhem espécie, classe, magia,
monstro — tudo vem do SRD 5.2 (CC-BY 4.0). Sem esses dados de referência populados e
buscáveis, as fases seguintes não saem. As tabelas `srd_*` já existem (P3); falta a fonte
de dados e o caminho até elas.

## Escopo

**Entra:**
- `scripts/fetch-srd.mjs` + `yarn srd:fetch` — download dos 9 JSON do repo
  `5e-bits/5e-database` (pasta `src/2024/en`, **pinado por commit**) para
  `prisma/seed/srd-data/` (gitignore — o repo não versiona 2,5 MB de dados CC-BY que uma
  URL devolve).
- `prisma/seed/seeders/srd.seeder.ts` — mapeia cada arquivo para as tabelas `srd_*`,
  upsert por `slug`, tolerante a falha item a item com relatório final; substitui o stub
  `example.seeder.ts`.
- `src/server/srd/srd.service.ts` — helpers de leitura para o wizard (listas e filtros).
- Atribuição CC-BY 4.0: `docs/contexto.md` + rodapé da landing.

**Não entra (fora de escopo):**
- Tradução PT-BR dos dados (SRD 5.2 oficial é EN; a UI de seleção mostra o nome EN).
- Consumo por tela (P5 em diante).
- Itens mágicos, proficiências e níveis por classe (payload carrega o essencial;
  tabelas extras não existem no schema de P3).

## Comportamento / fluxos

`yarn srd:fetch` baixa os 9 JSON (falha clara se offline, com URL e como tentar de novo).
`yarn db:seed` lê o que existe em `srd-data/`, faz upsert de cada item por `slug` e
imprime relatório por tabela: inseridos/atualizados/falhos com motivo. Rodar duas vezes
não duplica nada nem falha. Sem os arquivos, o seed do SRD pula com aviso apontando o
`yarn srd:fetch` (o seed das outras tabelas continua).

## Impacto técnico

- **Banco:** população das 9 tabelas `srd_*` (contagens reais do SRD 5.2: 9 espécies,
  12 classes, 12 subclasses, 232 features, 4 backgrounds, 17 feats, 339 magias,
  182 equipamentos, 341 monstros — menor que as estimativas do doc técnico, que
  misturavam 2014/2024).
- **API:** nenhum endpoint novo; helpers consumidos por RSC a partir da P5.
- **UI:** linha de atribuição no rodapé da landing.

## Regras de negócio relacionadas

Nenhuma — dado de referência somente leitura, sem decisão de negócio.

## Critérios de aceite

<!-- kit:criterios -->
- [x] `yarn srd:fetch` baixa os 9 JSON pinados por commit SHA (reprodutível).
- [x] `yarn db:seed` popula as 9 tabelas `srd_*`; contagens batem com os arquivos-fonte (9/12/12/232/4/17/339/182/341).
- [x] `yarn db:seed` duas vezes seguidas sem falhar e sem duplicar (upsert por slug).
- [x] Seeder tolerante: item com campo inesperado/ausente é reportado e não derruba os demais.
- [x] Helpers de busca retornam o que o wizard precisa (espécies, classes com hit_die, subclasses por classe, magias por nível/escola, monstros por CR) — testes unitários com Prisma mockado.
- [x] Atribuição CC-BY 4.0 visível no rodapé da landing e em `docs/contexto.md`.
- [x] `yarn format:check && yarn typecheck && yarn lint && yarn test:cov` verdes (ratchet não desce — pisos subiram).
<!-- /kit:criterios -->

## Dívida / não exercitado

- O caminho tolerante do seeder (item ruim reportado sem derrubar os demais) foi exercitado
  em código, mas não contra um arquivo real corrompido — a fonte pinada não tem item ruim hoje.
- `srd_subclasses.level_gained` ficou sempre NULL: a fonte 2024 não traz o nível de
  aquisição (no 5.2 é nível 3 para todas); P5 assume isso ao filtrar.

## Decisões em aberto

- Nenhuma — mapeamento segue o formato real do 5e-bits 2024 (inspect feito): `school`/`class`/`subclass` são objetos (`.index` extrai a FK), `feature.level` é objeto (`barbarian-1` → nível 1), `equipment_categories` vira lista de nomes, `challenge_rating` pode ser fração.
