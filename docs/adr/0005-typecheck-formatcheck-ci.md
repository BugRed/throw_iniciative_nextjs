# ADR 0005 — Type-check e format-check dedicados no CI

**Status:** Aceito · 2026-09-28

## Contexto

O job `quality` do `deploy.yml` rodava só `yarn lint` e `yarn test`. Erro de tipo
não tinha verificação própria — só aparecia (mais tarde, mais lento) durante
`next build`, no job seguinte (`build-app`), misturando "erro de tipo" com
"erro de build" no mesmo log e atrasando a descoberta do problema. Formatação
(ver [ADR-0002](./0002-prettier-formatador-unico.md)) também não tinha checagem
no CI — só o hook de pre-commit local (ver
[ADR-0004](./0004-husky-lint-staged.md)) garantia isso, e hook local pode ser
pulado com `--no-verify` ou simplesmente não estar instalado.

## Decisão

Somamos dois steps ao job `quality`, antes do lint e dos testes (do mais rápido
e barato pro mais caro):

1. **Format check** — `yarn format:check` (`prettier --check .`)
2. **Type check** — `yarn typecheck` (novo script, `tsc --noEmit`)

## Consequências

- ➕ Falha mais rápido e com mensagem específica de qual das quatro verificações
  quebrou (formatação, tipo, lint ou teste) — não depende mais do `next build`
  pra pegar erro de tipo.
- ➕ Fecha a lacuna de quem commitou sem o hook de pre-commit instalado ou usou
  `--no-verify`.
- ➖ Mais alguns segundos no tempo total de CI — aceitável frente ao ganho de
  sinal mais cedo e mais claro.
