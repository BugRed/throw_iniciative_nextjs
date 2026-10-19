# ADR 0023 — Auth com Better Auth (adapter Prisma), Discord opcional por env

**Status:** Aceito · 2026-10-18

## Contexto

O doc técnico do produto (F1) especifica Discord OAuth + e-mail/senha com verificação e
sessões em Postgres. O plano propôs auth próprio com scrypt (local-first, zero deps); o
usuário decidiu explicitamente por **Better Auth** — ou pelo que o README do boilerplate
indicasse (que só reservava `server/auth/` para "Auth.js quando o projeto adotar").
Local-first segue como restrição: nada pode depender de serviço externo para funcionar em
dev — nem o envio do e-mail de verificação.

## Decisão

**Better Auth 1.x com adapter Prisma** (`prisma/schema/auth.prisma`, models minúsculos por
exigência do adapter, PKs uuid via `advanced.database.generateId: "uuid"`). E-mail/senha com
`requireEmailVerification: true`; o "envio" de e-mail em dev cai numa **caixa de entrada em
memória** exposta em `/dev/caixa-de-entrada` (fora de produção a rota é 404) — a interface
(`registrarEmailDev`) é o único ponto para plugar provedor real. Discord OAuth só existe
quando `DISCORD_CLIENT_ID`+`DISCORD_CLIENT_SECRET` estão no env; sem elas o produto funciona
100% por e-mail e o botão some do login. O `proxy.ts` faz barreira early-redirect por
presença de cookie; a validação real continua sendo `auth.api.getSession` por request.

## Alternativas rejeitadas

- **Auth próprio com scrypt (proposta do plano):** zero deps e total controle, mas
  re-implementa verificação de e-mail, reset de senha, sessão e OAuth — superfície de erro
  de segurança grande para ganho pequeno; substituído pela decisão do usuário.
- **Auth.js (NextAuth v5):** o que o README do boilerplate sugeriria; acoplado às APIs de
  servidor do Next (maior risco com as mudanças do Next 16) e com workflow de OAuth menos
  direto para o caso.
- **Supabase Auth (como no doc técnico):** amarraria o produto a um serviço externo já no
  dev — contraria o local-first.

## Consequências

- ➕ Verificação, reset, sessão e OAuth prontos e auditados; Discord entra com um par de env.
- ➕ Dev 100% local: a caixa de entrada substitui o provedor de e-mail sem código condicional
  espalhado.
- ➖ Uma dependência a mais (com `kysely` transitivo que exigiu Node ≥ 22 na imagem Docker —
  base atualizada, alinhada ao CI).
- ⚠️ Se o Better Auth quebrar compat com Next/Prisma no futuro, o fallback desenhado é o auth
  próprio do plano (mesmas tabelas de sessão, troca só do `auth.ts` e do catch-all).
