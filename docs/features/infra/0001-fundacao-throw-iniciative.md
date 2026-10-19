# Fundação Throw Iniciative

**Status:** entregue
**Responsabilidade:** infra
**Branch:** feature/infra-INFRA01/fundacao-throw-iniciative
**Autor:** ZCode · **Data:** 2026-10-18

> Esta spec é também o **estado** da feature. O que o git sabe (commits, arquivos,
> camadas tocadas) é calculado pelo hook e não se escreve aqui. O que mora aqui é
> o que nenhum commit guarda: intenção, próximo passo e dívida.

## Estado

<!-- kit:camadas -->
- [x] prisma — não se aplica nesta feature: nenhum model ativo ainda; o molde `example.prisma`/`example.seeder` fica inerte até a P3 trazer schema de domínio
- [x] service — não se aplica nesta feature: nenhum domínio de produto ainda
- [x] controller — não se aplica nesta feature: nenhum domínio de produto ainda
- [x] route — não se aplica nesta feature: `/api/health` do template permanece inalterado
- [x] ui — landing nova em `/` substituindo a do template (RSC puro, pré-renderizada)
- [x] teste — landing e env reescritos; fronteira de erros (`http/errors.ts`) coberta a 100%
- [x] doc — README/ROADMAP/CHANGELOG/contexto do produto + ADR-0021
<!-- /kit:camadas -->

**Próximo passo:** merge para `main` e abrir a P1 (design system Pergaminho).

> Camada que não se aplica a esta feature: marque e escreva o motivo ao lado
> (ex.: `- [x] ui — não se aplica, feature só de API`). O contrato cobra as
> camadas tocadas no código, não as sete sempre.

## Problema / motivação

O repo raiz tem o kit de processo mas nenhum aplicativo; o produto "Throw Iniciative"
precisa de uma base Next 16 executável. O `Next-Project-Boilerplate/` é o template
escolhido, mas vive em outro repositório git (com histórico e remote que não são nossos)
e traz um kit de processo antigo que conflita com o novo. Esta feature funde os dois em
um único repo na raiz, já renomeado e com os gates de qualidade funcionando.

## Escopo

**Entra:**
- Cópia do conteúdo do boilerplate para a raiz, **excluindo** `.git/`, `.claude/`, `CLAUDE.md`, `AGENTS.md`, `PROGRESS.md` e `docs/features/TEMPLATE.md` (versões do kit novo já na raiz vencem).
- ADRs do kit renumerados 0009–0018 → **0011–0020** (os 0001–0010 do boilerplate ficam).
- `eslint.config.mjs` importando `regrasDoKit` do `eslint.kit.mjs`.
- CI mesclado: `pr.yml` (kit) + `deploy.yml`/`sonar.yml` (boilerplate).
- `.gitignore` mesclado.
- Remoção do que não serve ao produto: `/admin`, domínio `example`, landing e teste do template, spec `processo/0001` e `docs/PROGRESS.md` (ferramenta `/continue` substituída pelo kit novo).
- Rename para `throw-iniciative` (package.json, metadata, `lang="pt-BR"`, robots/sitemap).
- `src/shared/lib/env.ts` validando env com zod no boot (ponto único, regra do kit).
- `zod` como dependência nova.
- Landing nova em `/` (RSC puro, estilização neutra — o tema Pergaminho chega na P1).
- `vitest.config.ts`: exclusão desatualizada `middleware.ts` → `proxy.ts`.
- README curto do produto, ROADMAP com as fases P0–P13, CHANGELOG zerado, `docs/contexto.md` primeira versão.

**Não entra (fora de escopo):**
- Tema/tokens do design system (P1), auth (P2), schema de domínio (P3).
- Deploy real, Sonar local, ajustes de `deploy.yml` além do que já roda.
- Internacionalização, i18n.

## Comportamento / fluxos

1. `yarn install` na raiz instala o app.
2. `yarn dev` sobe `localhost:3000` com a landing "Throw Iniciative" (sem JS client).
3. `yarn format:check && yarn typecheck && yarn lint && yarn test` passam.
4. `yarn dev:up` (Docker) sobe app + Postgres + SeaweedFS como no template — sem mudança de comportamento.
5. `GET /api/health` responde `{status:"ok"}` como antes.

## Impacto técnico

- **Banco:** nenhum (nenhum model ativo; molde `example` removido).
- **API:** nada novo; `/api/health` mantido.
- **UI:** `/` reescrita; `(auth)` placeholders permanecem para P2.

## Regras de negócio relacionadas

Nenhuma — feature de infraestrutura.

## Critérios de aceite

<!-- kit:criterios -->
- [x] Conteúdo do boilerplate na raiz, sem `.git` alheio e sem kit antigo; referências de template (`nextjs`, `project-name`, `/admin`, `example`) removidas (as menções restantes a "boilerplate" vivem em ADRs históricos imutáveis, onde são fato).
- [x] ADRs 0001–0021 sem colisão de numeração nem link quebrado; índice derivado pelo hook de estado.
- [x] `yarn install` + `yarn format:check` + `yarn typecheck` + `yarn lint` + `yarn test` verdes na raiz (ratchet subiu para 61,22% statements / 44% branches / 53,33% functions).
- [x] Landing renderiza "Throw Iniciative" via RSC — pré-renderizada como conteúdo estático no `next build`, sem JS client; teste de componente cobre título, CTAs e destaques.
- [x] `env.ts` falha no boot com `DATABASE_URL` ausente (teste cobre ausência, formato inválido e URL de dev do compose).
- [x] CI do PR (`pr.yml`) continua coerente com os scripts existentes do `package.json` (nenhum script mudou de nome).
- [x] `docs/contexto.md`, README, ROADMAP e CHANGELOG refletem o produto Throw Iniciative.
- [x] Extra do gate: `yarn build` de produção verde (10 rotas, proxy ativo) e `docker compose -f docker-compose.dev.yml config` válido.
<!-- /kit:criterios -->

## Dívida / não exercitado

- `dev:up` completo (subir app + Postgres + SeaweedFS de fato) não foi exercitado nesta
  sessão — só `docker compose config` (sintaxe). O sobe-desce real acontece na P3, quando o
  banco passa a ser usado; o comportamento é herdado do template sem mudança.
- `CODEOWNERS` segue com placeholders (`@org-owner`) — ajustar quando o repo ganhar GitHub real.
- `deploy.yml` aponta `DEPLOY_PATH`/K3s do template; adaptação de ops fica para a P13 junto
  com `docs/ops/`.
- Landing com classes neutras do template; o tema Pergaminho (tokens, fontes) chega na P1.

## Decisões em aberto

- Nenhuma — decisões macro registradas em `plano.md` (aprovado pelo usuário) e ADR-0021.
