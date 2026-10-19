# Contribuindo

Guia para contribuir com projetos baseados no boilerplate FH. Antes de começar, leia as
[convenções de código](./AGENTS.md) e as [convenções de documentação](./docs/README.md).

## Fluxo de trabalho

1. **Branch a partir de `main`.** Padrão de nome: `<tipo>/<escopo>-<ID>/<slug>` — tipos,
   escopos disponíveis e exemplos estão documentados em [`CLAUDE.md`](./CLAUDE.md#branches).
2. **Faça commits pequenos** seguindo Conventional Commits (abaixo).
3. **Abra um Pull Request** para `main` usando o template. Descreva o *quê* e o *porquê*,
   linke a issue/spec, e marque os revisores (ver [`.github/CODEOWNERS`](./.github/CODEOWNERS)).
4. **CI verde + 1 aprovação** antes do merge. `main` é protegida.

## Conventional Commits

O histórico e o [`CHANGELOG.md`](./CHANGELOG.md) dependem disso. Formato:

```
<tipo>(<escopo opcional>): <descrição no imperativo>
```

Tipos: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `perf`, `build`, `ci`.
Exemplos:
```
feat(auth): login via SSO
fix(seed): torna o seeder de usuários idempotente
docs(negocio): adiciona regra de cobrança
```

## Definition of Done

Uma entrega só está "pronta" quando:

- [ ] Comportamento atende à spec (`docs/features/...`) e às regras (`docs/negocio/...`).
- [ ] `yarn build` e `yarn lint` passam sem erro.
- [ ] Testes relevantes adicionados/atualizados (`yarn test`).
- [ ] **Documentação atualizada no mesmo PR** (regra/spec/CHANGELOG conforme o caso).
- [ ] Sem segredo commitado (ver [`SECURITY.md`](./SECURITY.md)).

## Padrões de código

Resumo — o detalhe está no [`AGENTS.md`](./AGENTS.md):

- **Uma responsabilidade por camada:** `app/api` (HTTP) → `controller` (orquestra) →
  `service` (regra de negócio). Não misture.
- **Atomic Design** para UI: classifique em atom/molecule/organism e reutilize antes de criar.
- **Prisma modular:** um `*.prisma` por domínio em `prisma/schema/`; seed idempotente.
- **Next.js 16:** convenções mudaram (ex.: `middleware` → `proxy`). Na dúvida, consulte
  `node_modules/next/dist/docs/`.
- **Nunca** commite secrets — use variáveis de ambiente.

## Documentação

Regra de ouro: **muda com o código → vive no repo**, e **uma fonte da verdade por fato**
(linke, não copie). Onde cada coisa mora está em [`docs/README.md`](./docs/README.md).
