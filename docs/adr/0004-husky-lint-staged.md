# ADR 0004 — Husky + lint-staged no pre-commit

**Status:** Aceito · 2026-09-28

## Contexto

O lint só rodava no CI (`deploy.yml`, job `quality`), disparado só após o push
pra `main`. Isso significa que um erro de lint ou de formatação só é descoberto
depois que o código já saiu da máquina do desenvolvedor, já ocupou a fila do CI, e
já exige um novo commit + push pra corrigir. Nada local impedia um commit com
código fora do padrão.

As opções eram: (a) manter só o CI como guarda — simples, mas o feedback chega
tarde; (b) confiar em cada desenvolvedor rodar `yarn lint`/`yarn format` manualmente
antes de commitar — depende de disciplina individual, sempre esquece sob prazo;
(c) um hook de git (`pre-commit`) que roda automaticamente e só valida/corrige os
arquivos que estão de fato sendo commitados (não o repo inteiro, o que seria lento).

## Decisão

Adotamos Husky (hooks de git versionados em `.husky/`, instalados via script
`prepare` no `package.json`) + lint-staged (roda comandos só nos arquivos
staged). O hook `.husky/pre-commit` roda `npx lint-staged`, configurado em
`package.json` (`"lint-staged"`):

- `*.{ts,tsx,js,jsx,mjs,cjs}` → `eslint --fix` seguido de `prettier --write`
- `*.{json,css}` → `prettier --write`

`lint-staged` foi fixado em `^15` (não a última major, `17.x`) por incompatibilidade
de engine: a v17 exige Node `>=22.22.1`, e o ambiente local de desenvolvimento
usa Node 20 fora do container Docker. Reavaliar essa fixação quando o time migrar
para Node 22 em todo lugar (ver `AGENTS.md`, fluxo de dev).

## Consequências

- ➕ Commit com código fora do padrão é corrigido automaticamente ou bloqueado —
  nunca mais chega a existir.
- ➕ Só analisa o que mudou (staged), não o repo inteiro — rápido mesmo em
  repositórios grandes.
- ➕ CI (ver [ADR-0005](./0005-typecheck-formatcheck-ci.md)) continua sendo a
  segunda barreira, pro caso de alguém commitar com `--no-verify`.
- ➖ Todo `git commit` fica alguns segundos mais lento (proporcional ao que foi
  staged, não ao tamanho do repo).
- ⚠️ Depende de `yarn install` ter rodado (o hook é instalado pelo script
  `prepare`) — quem clonar o repo e pular o install não tem o hook ativo
  localmente, mas o CI ainda pega o problema.
