# ADR 0006 — Piso de cobertura com ratchet automático no Vitest

**Status:** Aceito · 2026-09-28

## Contexto

`yarn test:cov` gerava relatório de cobertura, mas nada falhava se a cobertura
caísse — não havia piso mínimo configurado. Medimos a cobertura real do repo
antes desta decisão: **9,8% de statements, 0% de branches, 16,66% de funções,
10% de linhas**. Esse número baixo é esperado e intencional: o boilerplate nasce
esqueleto — `src/server/example/` é a única pasta de domínio e está toda
comentada de propósito (ver `example.service.ts`), pra ninguém herdar lógica de
negócio fake ao copiar a pasta.

As opções eram: (a) não travar nada — o status quo, cobertura pode cair sem
ninguém perceber até um code review notar; (b) travar um alvo fixo alto (ex.:
80%) — quebraria o CI de todo projeto recém-clonado do boilerplate, porque o
esqueleto começa em ~10%; (c) travar um piso "ratchet": o Vitest falha se a
cobertura cair abaixo do piso atual, e sobe o próprio piso sozinho sempre que a
cobertura sobe.

## Decisão

Configuramos `coverage.thresholds` no `vitest.config.ts` com `autoUpdate: true` e
os valores medidos como piso inicial (`statements: 9.8, branches: 0, functions:
16.66, lines: 10`). Cobertura só pode subir — se cair, `test:cov` falha (e falha
o CI, que já roda `yarn test`); se subir, o próprio Vitest reescreve o
`vitest.config.ts` com o novo piso na próxima execução, e esse arquivo entra no
commit normalmente.

## Consequências

- ➕ Regressão de cobertura vira falha de CI automaticamente, sem ninguém precisar
  lembrar de ajustar um número fixo.
- ➕ Não quebra o boilerplate no dia 1 de um projeto novo — o piso nasce onde a
  cobertura real está.
- ➕ Cresce organicamente: quando o time implementar um domínio de verdade
  (copiando `server/example/`) e escrever os testes dele (ver `/criar-testes`),
  a régua sobe sozinha no próximo `test:cov`.
- ➖ Quem rodar `test:cov` localmente depois de subir cobertura precisa commitar
  o `vitest.config.ts` atualizado — é um passo a mais que rodar só os testes.
- ⚠️ O ratchet não substitui uma meta de qualidade — ele só impede regressão. Se
  o time quiser garantir um piso mínimo de verdade para código novo de domínio
  (não só "não regredir"), vale revisitar com thresholds por pasta
  (`coverage.thresholds['src/server/**/*.service.ts']`) quando houver domínios
  reais o suficiente pra isso fazer sentido.
