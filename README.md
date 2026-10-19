# Throw Iniciative

Rastreador de iniciativa para mesas de D&D 5.5E: fila em tempo real, d20 rolado no servidor
com auditoria, timer por turno com passe automático e avisos sonoros/visuais.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Prisma 6 + Postgres 17 ·
Better Auth · Vitest · Docker (dev: app + Postgres + SeaweedFS S3).

## Rodando em dev

```bash
yarn install
yarn dev:up        # app + postgres + storage (Docker) — primeira vez constrói as imagens
yarn dev:logs      # logs do app
```

Sem Docker, só o app (requer Postgres próprio em `DATABASE_URL`):

```bash
yarn dev           # localhost:3000
```

Banco: `yarn db:migrate` (migrations) · `yarn db:generate` (client) · `yarn db:seed`.

## Qualidade

```bash
yarn format:check  # prettier
yarn typecheck     # tsc --noEmit
yarn lint          # eslint (inclui boundaries app → controller → service)
yarn test:cov      # vitest com piso de cobertura (ratchet)
```

## Documentação

- **Produto e domínio:** [`docs/contexto.md`](./docs/contexto.md) · regras em
  [`docs/negocio/`](./docs/negocio/)
- **Decisões:** [`docs/adr/`](./docs/adr/) · **Dados:** [`docs/db/modelo-de-dados.md`](./docs/db/modelo-de-dados.md)
- **Plano mestre de implementação (P0–P13):** [`plano.md`](./plano.md)
- **Estado das features:** [`docs/features/`](./docs/features/) · **Dívida:** [`docs/divida.md`](./docs/divida.md)

## Fluxo de contribuição

Uma feature por branch `<tipo>/<escopo>-<ID>/<slug>`, spec em `docs/features/`, gate
`/quality-check` antes de fechar. Detalhes em [`CONTRIBUTING.md`](./CONTRIBUTING.md).
