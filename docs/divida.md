# Dívida

O que nenhum commit registra: o que ficou duplicado, o que **não foi exercitado** contra o
sistema real, o que foi decidido na hora sem estar na spec. Não é backlog de produto (isso é
o `ROADMAP.md`) nem bug reportado — é o que a própria sessão sabe que deixou mal resolvido.

> Por que existe um arquivo só para isso: o histórico narrativo de sessão duplica o
> `git log` e envelhece. Dívida, não. Dívida que fica só na cabeça de quem escreveu — ou na
> spec de uma feature já fechada — some de vista.

Formato: uma linha por item, mais novo embaixo. Ao resolver, **apague a linha** e deixe o
commit contar a história.

Duas seções, porque são coisas diferentes: **Dívida** é o que ficou incompleto; **Becos sem
saída** é o que foi tentado e não funcionou. Decisão que constrange o código futuro não é nem
uma nem outra — é ADR.

| Data | Feature / spec | Dívida | Como se resolve |
|---|---|---|---|
| 2026-10-08 | kit de estado | `.github/workflows/pr.yml` **não exercitado** — nunca rodou num PR real; ADR-0012 está `Proposto` por isso | Abrir o primeiro PR e conferir; aceitar o ADR |
| 2026-10-08 | kit de estado | `eslint.kit.mjs` **não exercitado** — `node_modules` não estava instalado, então as quatro regras novas (`prefer-const`, `no-explicit-any`, `no-console`, `no-restricted-imports`) nunca rodaram contra código real | `yarn install && yarn lint` depois de somar o fragmento ao `eslint.config.mjs`; ver se há falso positivo em teste co-localizado |
| 2026-10-08 | kit de estado | A lista das sete camadas vive em **dois lugares**: `docs/features/TEMPLATE.md` e `estado.mjs` (const `CAMADAS`). Projeto que mude a arquitetura precisa lembrar dos dois | Derivar o template da constante, ou um teste que compare os dois |
| 2026-10-08 | kit de estado | O checkpoint (`Stop`/`PreCompact`) lê a última mensagem do assistente da transcrição. Formato interno do Claude Code — pode mudar sem aviso | O código já degrada em silêncio; se parar de funcionar, o relatório dirá "sem resumo da transcrição" |
| 2026-10-08 | kit de estado | `estado.mjs` e `contrato.mjs` não têm **suíte automatizada** — foram exercitados à mão em repositório sintético (branch com e sem spec, spec entregue sem teste, arquivo novo não rastreado, fora de repo git), e nada impede uma regressão silenciosa | Teste Vitest montando um repo git temporário por caso, como o teste manual fez |
| 2026-10-08 | kit de estado | `pr.yml` não foi validado por parser de YAML (pyyaml ausente na máquina) | O GitHub valida no primeiro push; ou `yamllint` local |
| 2026-10-18 | P0 · `docs/features/infra/0001-fundacao-throw-iniciative.md` | `CODEOWNERS` com placeholders (`@org-owner`) e `deploy.yml` apontando `DEPLOY_PATH`/K3s do template | Ajustar no push para GitHub real (P13, junto com `docs/ops/`) |
| 2026-10-18 | P1 · `docs/features/ui/0001-design-system-pergaminho.md` | Átomos Select/Textarea/Checkbox/StatPil sem consumidor real ainda (formulários chegam na P2/P5) — cobertos só por teste de renderização | Exercitar em página real quando as fases consumidoras chegarem |
| 2026-10-19 | P2 · `docs/features/auth/0001-better-auth-email-discord.md` | OAuth do Discord **não exercitado** contra o Discord real (exige app OAuth registrado lá); coberto só por teste de config e render condicional do botão | Registrar o app no Discord, setar `DISCORD_*` no env e correr o fluxo uma vez |
| 2026-10-19 | P2 · `docs/features/auth/0001-better-auth-email-discord.md` | Reenvio de e-mail de verificação sem UI/endpoint — a tela de link inválido sugere "pedir o reenvio", que não existe | P12: expor `resend-verification-email` do Better Auth num fluxo de reenvio |
| 2026-10-19 | P3 · `docs/features/db/0001-modelo-de-dados.md` | `updated_at` sem default no banco (é `@updatedAt` client-side): insert cru em SQL falha com not-null — surpreende debug/tooling | Adicionar `DEFAULT now()` nas migrations novas, ou aceitar e documentar no seeder |
| 2026-10-19 | P3 · `docs/features/db/0001-modelo-de-dados.md` | `example.seeder.ts` segue stub no orquestrador do seed (P2 deixou, P3 manteve) | P4: substituir pelo seeder do SRD e apagar o stub |


## Becos sem saída

O caminho que se tentou e não deu certo, com o motivo. Não é dívida (não ficou nada pela
metade) nem ADR (nada foi decidido) — e é o que mais se repete quando não está escrito: o
`git log` só guarda o que entrou, nunca o que foi tentado e descartado. Sem isto, a próxima
sessão refaz o mesmo caminho até bater no mesmo muro.

Ao contrário da dívida, **não se apaga ao resolver**: um beco continua sendo beco. Apaga-se
quando deixa de ser verdade — e aí o motivo vira ADR.

| Data | O que se tentou | Por que não funcionou | O que mudaria isso |
|---|---|---|---|
| 2026-10-08 | Prever o tamanho da saída de um comando `Bash` no `PreToolUse` para exigir corte (`\| tail`) | Não é previsível antes de rodar: `yarn test` pode devolver 20 linhas ou 20 mil, e recusar por heurística erraria contra comando legítimo com frequência alta demais | Um modo "dry-run" que devolvesse o tamanho esperado, ou um `PostToolUse` que truncasse a saída antes de ela entrar no contexto |
