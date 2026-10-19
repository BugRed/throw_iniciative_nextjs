# ADR 0001 — Security headers baseline no next.config.ts

**Status:** Aceito · 2026-08-14

## Contexto

Toda aplicação web exposta à internet precisa de headers HTTP defensivos. Sem eles,
browsers ficam vulneráveis a clickjacking, MIME sniffing, vazamento de Referer e downgrade
de HTTPS. Configurar esses headers manualmente em cada projeto gera inconsistência e esquecimento.

As opções avaliadas foram:
- Configurar no servidor web (nginx/caddy) — acoplado à infra, fora do controle do código.
- Configurar no proxy (`src/proxy.ts`) por request — necessário para headers dinâmicos (ex.: CSP com nonce), mas desnecessário para headers estáticos.
- Configurar em `next.config.ts` via `headers()` — cobre todas as rotas antes do filesystem, é estático, versionado junto ao código.

## Decisão

Headers defensivos estáticos são declarados em `next.config.ts` via `headers()` e aplicados
a `/:path*`. São incluídos no baseline:

| Header | Valor | Proteção |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Força HTTPS por 2 anos |
| `X-Content-Type-Options` | `nosniff` | Previne MIME sniffing |
| `X-Frame-Options` | `SAMEORIGIN` | Anti-clickjacking (fallback) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limita vazamento de URL |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), browsing-topics=()` | Desativa APIs sensíveis |

O `Content-Security-Policy` fica como molde **comentado** — é app-específico e uma CSP
mal configurada quebra o app. O ponto de extensão dinâmica (nonce por request) fica reservado
no `proxy.ts`.

O header `X-Powered-By` é removido via `poweredByHeader: false` para não expor o framework.

## Consequências

- ➕ Todo projeto gerado a partir do boilerplate nasce com proteção básica sem esforço.
- ➕ Headers versionados junto ao código — auditáveis via `git log`.
- ➕ Compatível com dev local: HSTS é ignorado pelo browser em `http://localhost`.
- ➖ Headers estáticos não podem variar por request — para CSP com nonce, é necessário mover para o proxy (`src/proxy.ts`) com custo de latência por request.
- ⚠️ `X-Frame-Options: SAMEORIGIN` deve ser trocado por `DENY` (ou por `frame-ancestors` na CSP) se a aplicação nunca precisar ser embutida em iframe.
- ⚠️ `Permissions-Policy` pode precisar de ajuste se a app usar câmera, microfone ou geolocalização.
