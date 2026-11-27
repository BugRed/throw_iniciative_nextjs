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
| Salas, membership e SSE (P7) — falta exercitar o fluxo com dois usuários | [api/0001](docs/features/api/0001-salas-membership.md) | — |
| Núcleo de iniciativa (P8) — falta exercitar contra o banco e o navegador | [api/0002](docs/features/api/0002-initiative-core.md) | — |
| Combate na tela (P9) — entregue; falta exercitar no navegador com mestre e dois jogadores | [ui/0004](docs/features/ui/0004-initiative-ux.md) | — |

## Fila (ordem de prioridade)

1. P9–P13 — ver [`plano.md`](plano.md) §6 e [`ROADMAP.md`](ROADMAP.md)

## Bloqueado por decisão do usuário

| # | Decisão que falta | O que ela destrava |
|---|---|---|
| _(nenhuma)_ | | |

## Decisões tomadas sem diretriz

Escolhas que uma sessão tomou sozinha por não haver regra, e que valem para as próximas.
Quando uma vira regra de verdade, ela sai daqui e entra no `CLAUDE.md`, num ADR ou no lint.

- _(nenhuma ainda)_
