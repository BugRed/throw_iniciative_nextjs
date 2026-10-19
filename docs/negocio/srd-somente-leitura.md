# SRD é somente leitura por construção

**Status:** vigente
**Domínio:** srd

## Enunciado

As tabelas `srd_*` (espécies, classes, subclasses, features, backgrounds, feats, magias,
equipamentos, monstros) são **somente leitura** para o produto: nenhum fluxo de usuário
cria, altera ou apaga registro delas. A única escrita é o seeder (`yarn db:seed`), que
upserta por `slug` a partir do JSON do 5e-bits/5e-database (commit pinado).

## Racional

O SRD 5.2 é conteúdo de referência licenciado (CC-BY 4.0), não dado do usuário. Manter a
fonte imutável garante que fichas e seleções derivadas sejam reproduzíveis (mesmo commit =
mesmos slugs), simplifica o cache das listas do wizard e evita que mutação descuidada
"corrija" regra oficial. A integridade vem por construção — nenhuma rota/service fora do
seeder sequer expõe escrita — em vez de policy no banco.

## Casos de borda

- Item novo na fonte (upstream atualiza): re-upsert após trocar o SHA pinado em
  `scripts/fetch-srd.mjs`; slugs existentes são atualizados, nada é apagado.
- Item da fonte some na atualização: a linha antiga permanece (o seeder não deleta);
  fichas que a referenciam seguem válidas.
- Ficha referencia uma linha de SRD (FK `SetNull`): se a linha fosse apagada manualmente,
  a ficha sobrevive com os stats congelados e a referência nula.

## Onde é aplicada

- [`prisma/seed/seeders/srd.seeder.ts`](../../prisma/seed/seeders/srd.seeder.ts) — única escrita.
- [`src/server/srd/srd.service.ts`](../../src/server/srd/srd.service.ts) — leitura: expõe
  apenas `findMany`/`findUnique`, sem método de mutação.
- [`docs/contexto.md`](../contexto.md#atribuição-de-conteúdo) — atribuição da licença.

## Decisões em aberto

- Nenhuma.
