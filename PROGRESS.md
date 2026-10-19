# PROGRESS

O que a **próxima** feature precisa saber e o git não tem como dizer. Mantenha curto: estado
de feature mora na spec (`docs/features/`), o que já foi entregue mora no `CHANGELOG.md` e no
`git log`, e a dívida mora em [`docs/divida.md`](docs/divida.md).

> Este arquivo não registra SHA, branch, baseline de teste nem cobertura — tudo isso o hook
> calcula a cada sessão (`node .claude/hooks/estado.mjs estado`). Repetir aqui só cria uma
> segunda versão da verdade, que envelhece.

## Em andamento

| Feature | Spec | Bloqueio |
|---|---|---|
| Design system Pergaminho (P1) — fechada, aguardando merge | [ui/0001](docs/features/ui/0001-design-system-pergaminho.md) | — |

## Fila (ordem de prioridade)

1. P2 — Better Auth + Discord opcional
2. P3 — Schema Prisma de domínio
3. P4 — Importação SRD 5.2
4. P5–P13 — ver [`plano.md`](plano.md) §6 e [`ROADMAP.md`](ROADMAP.md)

## Bloqueado por decisão do usuário

| # | Decisão que falta | O que ela destrava |
|---|---|---|
| _(nenhuma)_ | | |

## Decisões tomadas sem diretriz

Escolhas que uma sessão tomou sozinha por não haver regra, e que valem para as próximas.
Quando uma vira regra de verdade, ela sai daqui e entra no `CLAUDE.md`, num ADR ou no lint.

- _(nenhuma ainda)_
