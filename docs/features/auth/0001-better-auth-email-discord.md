# Better Auth — e-mail/senha com verificação + Discord opcional

**Status:** entregue
**Responsabilidade:** seguranca
**Branch:** feature/auth-AUTH01/better-auth-email-discord
**Autor:** ZCode · **Data:** 2026-10-18

> Esta spec é também o **estado** da feature. O que o git sabe (commits, arquivos,
> camadas tocadas) é calculado pelo hook e não se escreve aqui. O que mora aqui é
> o que nenhum commit guarda: intenção, próximo passo e dívida.

## Estado

<!-- kit:camadas -->
- [x] prisma — models de auth (user/session/account/verification) em `auth.prisma` + migration
- [ ] service — não se aplica nesta feature: a regra de auth é do Better Auth (infra), não um `*.service.ts` nosso
- [ ] controller — não se aplica nesta feature: o catch-all `/api/auth/[...all]` delega ao handler do Better Auth
- [x] route — `GET/POST /api/auth/[...all]` + proxy protegendo `(app)`
- [x] ui — login, registro, verificação de e-mail, esqueci/reset de senha, painel com UserMenu
- [x] teste — config de auth (Discord condicional), helper de sessão, páginas, proxy
- [x] doc — ADR do Better Auth + `docs/db/modelo-de-dados.md` + `.env.example`
<!-- /kit:camadas -->

**Próximo passo:** nenhum — feature entregue; falta push e PR (do usuário).

## Problema / motivação

O produto é público: qualquer pessoa cria conta e sala. Sem auth não existe dono de
personagem nem mestre de sala. O doc técnico (F1) pede Discord OAuth + e-mail/senha com
verificação; o usuário decidiu manter **Better Auth** (decisão registrada no plano e na
tabela de divergências). Local-first: tudo precisa funcionar sem serviço externo —
verificação de e-mail incluída.

## Escopo

**Entra:**
- `better-auth` com **adapter Prisma** (models User/Session/Account/Verification em
  `prisma/schema/auth.prisma`, convenções do repo: PK uuid, `@map` snake_case, timestamptz).
- E-mail/senha (`requireEmailVerification: true`) com verificação por token.
- **Transporte de e-mail de dev**: links de verificação/reset ficam numa caixa de entrada
  em memória, visível em `/dev/caixa-de-entrada` — só fora de produção; interface única
  (`sendEmail`) para plugar provedor real depois.
- Discord OAuth **condicional por env** (`DISCORD_CLIENT_ID`+`SECRET` presentes → provider
  ativo e botão visível; ausentes → login por e-mail sem erro).
- Route handler catch-all `/api/auth/[...all]` (delega ao handler do Better Auth).
- `proxy.ts`: rotas de área logada sem cookie de sessão → `/login` (a validação real
  permanece server-side por request).
- Helpers `getSession()`/`requireSession()` em `src/server/auth/session.ts`.
- Client de browser `createAuthClient` em `src/shared/lib/auth-client.ts`.
- Páginas (tema Pergaminho): `/login`, `/register`, `/verify-email`, `/forgot-password`,
  `/reset-password`, `/dev/caixa-de-entrada` (dev), `/dashboard` (painel: sessão ativa,
  status de verificação, sair).
- `UserMenu` (organismo) + header em `(app)`.
- `env.ts`: `BETTER_AUTH_SECRET` (obrigatória), `BETTER_AUTH_URL` (default localhost:3000),
  `DISCORD_CLIENT_ID/SECRET` (opcionais) + `.env.example`/`.env` de dev.
- `db/prisma.ts` passa a importar `env` (validação de ambiente no boot do acesso a banco).
- Stack de dev completa sobe (`dev:up`) — quitando a dívida da P0.

**Não entra (fora de escopo):**
- Provedor de e-mail real (SMTP/Resend) — interface pronta, plugue na P12/P13.
- Webhook `user.deleted` (exclusão de conta) — fase P12 (hardening).
- Rate limit de auth — P12.
- 2FA, magic link, outros providers.

## Comportamento / fluxos

1. Registro com nome/e-mail/senha → conta criada **não verificada** → link de verificação
   aparece em `/dev/caixa-de-entrada` (dev) → abrir link verifica → login liberado.
2. Login sem verificação → erro claro apontando para a caixa de entrada.
3. Sessão via cookie httpOnly; `/dashboard` sem cookie redireciona para `/login`.
4. Esqueci a senha → link de reset na caixa de entrada → nova senha → login.
5. Com `DISCORD_*` no env: botão "Entrar com Discord" no login; sem elas, botão some.
6. Sair limpa sessão (banco + cookie) e volta para `/`.

## Impacto técnico

- **Banco:** 4 tabelas novas (migration `auth`).
- **API:** 1 route handler catch-all.
- **UI:** grupo `(auth)` inteiro + `(app)` ganha layout com header/UserMenu + `/dashboard`.

## Regras de negócio relacionadas

- Verificação de e-mail obrigatória para **criar sala** — regra aplicada na P7/P12; aqui só
  existe o estado `emailVerified`.

## Critérios de aceite

<!-- kit:criterios -->
- [x] Registro → verificação (via caixa de entrada dev) → login → logout funciona ponta a ponta no app de dev.
- [x] Login com e-mail não verificado é recusado com mensagem que aponta o próximo passo.
- [x] `/dashboard` sem cookie de sessão redireciona para `/login`; com sessão mostra nome, avatar e status de verificação.
- [x] Cookie de sessão é httpOnly e some após logout.
- [x] Discord: sem env, nenhuma menção ao provider em `/login`; com env, botão aparece (fluxo OAuth completo só é exercitável com app real no Discord — fica como dívida declarada).
- [x] Migration `auth` aplicada no container; `db:seed` continua idempotente.
- [x] `yarn format:check && yarn typecheck && yarn lint && yarn test:cov` verdes.
- [x] ADR-0023 registra a escolha Better Auth (com o fallback desenhado).
<!-- /kit:criterios -->

## Dívida / não exercitado

- Fluxo OAuth do Discord não foi exercitado contra o Discord real (exige app OAuth
  registrado lá); coberto apenas por teste de config + render condicional do botão.
- Reenvio de e-mail de verificação não implementado: a página `/verify-email` inválido
  sugere "pedir o reenvio", mas não há UI/endpoint para isso — Better Auth tem
  `resend-verification-email`; fica para P12 (hardening).
- Caixa de entrada de dev é por processo (memória + `globalThis`): suficiente para o
  `next dev` single-process; em deploy multi-instância ela não compartilha estado —
  irrelevante na prática porque em produção o transporte será provedor real (P13).
- `verify-email` com token expirado só foi exercitado em teste (a caixa não permite
  "envelhecer" um link) — o caminho de invalidade real depende do relógio.

## Decisões em aberto

- Nenhuma — decisão do usuário (Better Auth), interface de e-mail de dev é escolha desta
  sessão listada como decisão sem diretriz.
