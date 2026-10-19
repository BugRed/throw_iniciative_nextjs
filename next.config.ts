import type { NextConfig } from 'next'

/**
 * Security headers — baseline padrão do boilerplate.
 *
 * Estes headers são genéricos e seguros para qualquer app, então já vêm ativos.
 * São aplicados a TODAS as respostas (páginas, route handlers e assets) porque
 * `headers()` é verificado antes do filesystem. Ref.: `node_modules/next/dist/
 * docs/01-app/03-api-reference/05-config/01-next-config-js/headers.md`.
 *
 * O único que NÃO vem pronto é o Content-Security-Policy: ele é específico de
 * cada app (fontes de script/estilo, nonce por request, etc.) e uma CSP mal
 * configurada quebra a aplicação. Por isso fica como molde comentado abaixo —
 * descomente e ajuste ao ligar. Guia oficial: `node_modules/next/dist/docs/
 * 01-app/02-guides/content-security-policy.md`.
 */
const securityHeaders = [
  // Só HTTPS, incluindo subdomínios, por 2 anos. Só tem efeito sob HTTPS —
  // em dev (http://localhost) o browser ignora, então é seguro deixar ativo.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Impede o browser de "adivinhar" o Content-Type (mitiga alguns XSS).
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Anti-clickjacking. Sucedido por `frame-ancestors` na CSP — mantido aqui
  // como fallback para browsers antigos. Troque para DENY se a app nunca é
  // embutida em iframe.
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  // Quanto do Referer vaza ao navegar para outra origem.
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Desliga APIs sensíveis do browser por padrão. Libere só o que a app usar.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },

  // --- Content-Security-Policy (MOLDE — descomente e ajuste ao ligar) ---
  // A CSP abaixo é um ponto de partida restritivo. `'unsafe-inline'`/`'unsafe-eval'`
  // costumam ser necessários para o runtime do Next em dev; o ideal em prod é
  // trocar por nonce/hash por request (feito no proxy, não aqui). Veja o
  // guia de CSP citado no topo antes de habilitar.
  // {
  //   key: "Content-Security-Policy",
  //   value: [
  //     "default-src 'self'",
  //     "script-src 'self'",
  //     "style-src 'self'",
  //     "img-src 'self' data:",
  //     "font-src 'self'",
  //     "connect-src 'self'",
  //     "frame-ancestors 'self'",
  //     "base-uri 'self'",
  //     "form-action 'self'",
  //   ].join("; "),
  // },
]

const nextConfig: NextConfig = {
  // Remove o header `X-Powered-By: Next.js` — não exponha o framework/versão.
  poweredByHeader: false,

  async headers() {
    return [
      {
        // Aplica o baseline a todas as rotas.
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
