# ADR 0007 — Boundaries de camada via ESLint (Clean Architecture)

**Status:** Aceito · 2026-09-28

## Contexto

O AGENTS.md descreve o fluxo obrigatório `app/api` (HTTP) → `*.controller.ts`
(orquestra) → `*.service.ts` (regra de negócio), e é explícito que a UI nunca
chama service diretamente. Essa regra só existia em prosa — nada no repositório
impedia, por exemplo, um `import * as service from '@/server/exemplo/exemplo.service'`
direto de dentro de uma `page.tsx`. Esse é exatamente o tipo de atalho que
acontece sob pressão de prazo ("só dessa vez") e que, sem reforço automático,
vira precedente e corrói a arquitetura em camadas com o tempo.

As opções eram: (a) manter só a revisão humana — o status quo, que já falhou em
outras regras do projeto (ex.: alias `@/`, ver [ADR-0003](./0003-ordenacao-automatica-imports.md));
(b) `no-restricted-imports` do próprio ESLint — simples, mas exigiria listar
manualmente cada caminho proibido, sem entender "camada" como conceito;
(c) `eslint-plugin-boundaries` — plugin dedicado a modelar arquitetura em
camadas, entende pasta (elemento) e papel do arquivo dentro dela (categoria) como
duas dimensões independentes.

## Decisão

Adotamos `eslint-plugin-boundaries`, classificando cada arquivo TS/TSX em:

- **Elemento** (pasta): `app` (`src/app`), `domain` (qualquer pasta em
  `src/server/*`, com o nome da pasta capturado), `shared` (`src/shared`).
- **Categoria** (papel do arquivo dentro do elemento): `controller`
  (`**/*.controller.ts`), `service` (`**/*.service.ts`), `schema`
  (`**/*.schema.ts`).

A regra `boundaries/dependencies` (`default: 'allow'`, só duas policies
explícitas de `disallow`) barra:

1. `app/` importar um arquivo de categoria `service` (deve passar pelo
   controller);
2. um arquivo de categoria `service` importar qualquer coisa de `app/`.

`src/server/{db,http,auth}` continuam classificados como `domain` mas nunca têm
arquivo `*.service.ts` — nunca batem em nenhuma das duas policies, então ficam
livres sem precisar de um elemento à parte. Tudo que não é `app`, `server/*` ou
`shared` (ex.: `proxy.ts`, CSS, `instrumentation.ts`) segue sem restrição.

Validamos manualmente as duas direções antes de aceitar: criamos um arquivo em
`app/` importando um `.service.ts` (bloqueado) e um `.service.ts` importando de
`app/` (bloqueado), confirmando a mensagem de erro, e removemos os dois arquivos
de teste antes deste commit.

**Nota de configuração** (útil se outro domínio precisar de ajuste): o plugin
exige que padrões de `boundaries/files` incluam `**/` antes do glob do arquivo
(`**/*.service.ts`, não `*.service.ts`) — a categoria é comparada contra o
caminho completo do arquivo, não só o nome. Sem isso, o arquivo fica com
categoria `null` e nenhuma policy dispara silenciosamente.

## Consequências

- ➕ A camada de arquitetura do AGENTS.md deixa de ser só documentação — vira
  erro de lint, pego em CI e no hook de pre-commit
  (ver [ADR-0004](./0004-husky-lint-staged.md)).
- ➕ Mensagem de erro explica o *porquê* (não só "import proibido"), reduzindo a
  chance de alguém contornar sem entender a regra.
- ➖ É a configuração mais delicada das seis: exige manter os padrões de
  `boundaries/elements`/`boundaries/files` sincronizados se a estrutura de
  pastas mudar (ex.: um novo tipo de camada em `src/server/`).
- ⚠️ Não impede import cruzado **entre domínios** (ex.: `usuarios.service.ts`
  importando `pedidos.service.ts` direto) — hoje só há um domínio de exemplo, sem
  caso real pra calibrar essa regra. Revisitar quando houver 2+ domínios reais,
  usando o `capture: ['domain']` já configurado para restringir a mesmo-domínio
  quando fizer sentido.
