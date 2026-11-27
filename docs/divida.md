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


| 2026-10-19 | P4 · `docs/features/db/0002-importacao-srd-52.md` | Caminho tolerante do seeder (item ruim não derruba os demais) nunca rodou contra arquivo real corrompido — a fonte pinada não tem item ruim | Corromper um JSON de propósito em dev e conferir o relatório |
| 2026-10-19 | P4 · `docs/features/db/0002-importacao-srd-52.md` | `srd_subclasses.level_gained` sempre NULL: fonte 2024 não traz o nível (regra 5.2 = nível 3 para todas) | P5 assume nível 3 ao filtrar subclasses; ou derivar do payload das features |
| 2026-10-20 | P5 · `docs/features/ui/0002-crud-personagem.md` | Ramo `notFound()` da página `/characters/[id]` sem teste direto (o 404 em si é coberto no service; a página só testa caminhos felizes) | Dublê de `next/navigation` com `notFound` jogando + teste do 404 renderizado |
| 2026-10-20 | P5 · `docs/features/ui/0002-crud-personagem.md` | `alternarVisibilidade` não grava audit (só `character_created`/`character_updated` existem, como os critérios pediam) | Se a sala (P7) precisar rastrear abertura/fechamento de ficha, nasce `character_visibility_changed` |
| 2026-10-20 | dev · infra local | Cache `.next` **compartilhado entre container e host** quebra o `yarn dev` local: o Turbopack reusa o cache dev gravado pelo container (caminhos absolutos `/app/...`) e entra em pânico (`failed to create directory /app/.next/...`) no meio das requisições — abortos de conexão intermitentes | `rm -rf .next` ao alternar entre os fluxos; ou dar `distDir` próprio ao container no compose |
| 2026-10-20 | P5 · `docs/features/ui/0002-crud-personagem.md` | Step de equipamento do wizard renderiza os 182 itens do SRD numa lista única, sem busca nem agrupamento — funciona, mas é o step mais pesado da UI | Campo de busca ou agrupar por `category` (o service já traz) quando a gestão de equipamento evoluir |
| 2026-11-24 | P6 · `docs/features/ui/0003-npcs.md` | Moldes de NPC sem edição (só criar/excluir) e `is_public` sem uso; fluxo **não exercitado** contra o app com banco real (só Prisma mockado); catálogo de 341 monstros sem busca/filtro | Editar molde e filtrar catálogo quando a P7 consumir; `is_public` se o compartilhamento entre mestres for pedido; exercitar no app rodando |

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
| 2026-11-24 | P7 · `docs/features/api/0001-salas-membership.md` | Entrega de evento ponta a ponta (action → bus → stream → `router.refresh`) **não exercitada no navegador**: no app rodando só se viu o stream abrir (`: conectado`, sem buffer) e o lobby do mestre renderizar; a entrega está coberta por teste unitário | Dois usuários em dois navegadores: pedido → aceite → lobby atualizando sozinho |
| 2026-11-24 | P7 · `docs/features/api/0001-salas-membership.md` | `test:cov` com o timeout padrão de 5 s **falha** em 4–5 testes do `CharacterWizard` na suíte inteira (também no commit-base); passa isolado e com `--testTimeout=30000`. O CI pode reprovar por isso | Subir `testTimeout` em `vitest.config.ts` ou aliviar o teste do wizard, numa feature de `chore(test)` |
| 2026-11-24 | P7 · `docs/features/api/0001-salas-membership.md` | EventBus em memória: só funciona com **uma instância** (ADR-0024) | Redis atrás da mesma interface quando houver mais de uma réplica |
| 2026-11-24 | P7 · `docs/features/api/0001-salas-membership.md` | Purga dos soft deletes (30 dias) e dos pedidos de entrada expirados (7 dias) sem job: as linhas só deixam de contar | Job agendado na P10/P12 |
| 2026-11-24 | P7 · `docs/features/api/0001-salas-membership.md` | Lobby lista só NPCs e moldes **próprios**; o service aceita molde público de outro mestre, a UI não oferece | Listar moldes públicos quando o compartilhamento entre mestres for pedido |
| 2026-11-24 | P7 · `docs/features/api/0001-salas-membership.md` | `pedirEntrada` aceita sala `paused`; sair e expulsar valem em `active` (decisões minhas, `salas.md` não diz); a P8 precisa zerar `active_for_user_id` ao marcar a morte de um PJ, ou a UNIQUE bloqueia o próximo PJ | Confirmar as duas regras na P8 e registrar em `salas.md` |
| 2026-11-25 | P8 · `docs/features/api/0002-initiative-core.md` | Exercitado contra o banco real em 2026-11-25 por teste descartável (ciclo completo: exclusividade, filtro JSON do pedido de pause, rolagens, Inspiração, desempate, pausa, morte, remoção — passou); **falta o navegador** (Server Actions, SSE e tela), e o teste não foi mantido no repo porque o CI não tem banco | Dois usuários em dois navegadores: abrir, pedir pause, ver o lobby atualizar por SSE |
| 2026-11-25 | P8 · `docs/features/api/0002-initiative-core.md` | Abertura concorrente da iniciativa e disputa de "sala `active` por usuário" não são serializadas (sem lock nem UNIQUE parcial): duas aberturas simultâneas podem passar pela checagem | Transação serializável ou índice único parcial |
| 2026-11-25 | P8 · `docs/features/api/0002-initiative-core.md` | Rate limit em memória por instância; quem é recusado por estar ocupado só vê a própria mesa ao abrir `/rooms` (sem evento dirigido) | Redis atrás de `LimiteDeAcoes` e evento ao ocupado na P9/P12 |
| 2026-11-25 | P8 · `docs/features/api/0002-initiative-core.md` | Decisões minhas sem diretriz: combate nasce em `draft` com passo próprio para abrir rolagens; cancelar marca `cancelled`; Inspiração só nas rolagens; sala `paused` mantém `rooms.is_paused` intocado | Confirmar na P9 |
| 2026-11-27 | P9 · `docs/features/ui/0004-initiative-ux.md` | Entrada no meio calcula a posição pelo tamanho da fila lido antes de gravar (sem lock): duas inclusões simultâneas podem empatar a posição; trava otimista de `passarVez` só testada com Prisma mockado | Mesma solução da abertura concorrente (transação serializável ou UNIQUE parcial) e exercitar contra o banco |
