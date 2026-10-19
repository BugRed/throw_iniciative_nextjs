# ADR 0002 — Prettier como formatador único de código

**Status:** Aceito · 2026-09-28

## Contexto

O repositório não tinha formatador automático — só ESLint, que valida qualidade e
corretude, não estilo de forma consistente. Na prática o código já estava
inconsistente: arquivos gerados pelo Next (`layout.tsx`, `robots.ts`, `sitemap.ts`)
usavam aspas duplas e `;`, enquanto o código escrito à mão no projeto (`metrics.ts`,
`errors.ts`, `example/*`) usava aspas simples sem `;`. Sem uma ferramenta que decida
por todos, cada editor/desenvolvedor reformata do seu jeito ao salvar, e PRs ficam
sujos de diff de estilo misturado com a mudança real.

As opções eram: (a) só documentar a convenção no CLAUDE.md e confiar em revisão
humana — já provou não bastar, o próprio repo estava inconsistente; (b) configurar
regras de estilo no próprio ESLint (`indent`, `quotes`, `semi`, …) — funciona mas é
lento (ESLint analisa AST completo) e o conjunto de regras de estilo do ESLint é
historicamente incompleto perto de um formatador dedicado; (c) adotar Prettier,
formatador padrão de mercado para o ecossistema JS/TS.

## Decisão

Adotamos Prettier (`.prettierrc.json`) como único formatador de código
(TS/TSX/JS/JSON/CSS), com a convenção que já predominava no código escrito à mão do
projeto: sem `;`, aspas simples, vírgula final sempre, 100 colunas.

`eslint-config-prettier` foi somado ao `eslint.config.mjs` para desligar as regras
de estilo do ESLint que conflitariam com o Prettier — ESLint cuida só de
correção/qualidade a partir de agora, formatação é 100% do Prettier.

Markdown e YAML ficam fora do escopo (`.prettierignore`) — documentação
(`docs/**`, `*.md`) e infraestrutura (`*.yml`/`*.yaml` de CI e docker-compose) têm
convenção própria de docs-as-code/infra, sem relação com "padrão de código".

Scripts: `yarn format` (aplica) e `yarn format:check` (só valida — usado no CI, ver
[ADR-0005](./0005-typecheck-formatcheck-ci.md), e no hook de pre-commit, ver
[ADR-0004](./0004-husky-lint-staged.md)).

## Consequências

- ➕ Ninguém mais discute estilo em code review — é automático e não-negociável.
- ➕ Diff de PR fica só com a mudança real, sem ruído de estilo.
- ➕ `eslint-config-prettier` evita as duas ferramentas brigarem pela mesma linha.
- ➖ Reformatou o código existente numa única leva (baixo risco — só formatação,
  validado com `yarn lint` + `yarn test` + `yarn build` antes de aceitar).
- ⚠️ Se o time preferir aspas duplas ou `;` no futuro, é só mudar o `.prettierrc.json`
  e rodar `yarn format` de novo — a convenção vive num arquivo, não em memória
  coletiva.
