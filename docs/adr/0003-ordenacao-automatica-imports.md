# ADR 0003 — Ordenação automática de imports via ESLint

**Status:** Aceito · 2026-09-28

## Contexto

O CLAUDE.md já manda usar sempre o alias `@/` em vez de caminhos relativos, mas
nada no repositório verificava isso de fato — era só revisão humana, o que falha
sob pressão de prazo ou revisor desatento. Além disso, sem uma ordem imposta, cada
arquivo agrupa imports (externos, alias, relativos) numa ordem diferente, o que
deixa o diff de imports ruidoso sempre que alguém adiciona ou remove uma linha no
meio do bloco.

As opções eram: (a) confiar só na convenção escrita — já demonstrou não bastar
noutras regras do projeto; (b) `eslint-plugin-import` com a regra `order` — mais
configurável, mas historicamente mais lento e com mais falsos positivos em
monorepos/alias; (c) `eslint-plugin-simple-import-sort` — regra única, rápida,
sem necessidade de declarar grupos manualmente (ordena por padrão: side-effects →
externos → aliases/absolutos → relativos, alfabético dentro de cada grupo).

## Decisão

Adotamos `eslint-plugin-simple-import-sort`, com as regras
`simple-import-sort/imports` e `simple-import-sort/exports` em nível `warn`
(correção automática via `--fix`, não bloqueia commit sozinha — quem bloqueia
imports fora do padrão `@/` continua sendo revisão humana; esta regra só organiza
a ordem, não proíbe caminho relativo).

Rodamos `yarn lint --fix` + `yarn format` uma vez no repo pra aplicar a nova ordem
ao código já existente.

## Consequências

- ➕ Diff de imports sempre no mesmo formato — adicionar uma linha no meio do bloco
  não reordena o resto por acidente.
- ➕ Corrige sozinha (`--fix`), sem trabalho manual continuado.
- ➖ Não impede import relativo (`../`) sozinha — só organiza a ordem quando ele
  existe. Proibir de fato exigiria uma regra à parte (`no-restricted-imports` ou
  `import/no-relative-parent-imports`), deixada como possível ADR futuro se a
  convenção `@/` continuar sendo violada na prática.
- ⚠️ Nível `warn`, não `error` — não quebra o build sozinho; o hook de pre-commit
  (ver [ADR-0004](./0004-husky-lint-staged.md)) é quem de fato aplica a correção
  antes do código virar commit.
