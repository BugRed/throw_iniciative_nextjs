import { NextRequest, NextResponse } from 'next/server'

// Cookie de sessão do Better Auth (nome default da lib). A validação real da
// sessão acontece no servidor por request (auth.api.getSession); o proxy só
// evita renderizar área logada para quem nem tem cookie — redirecionando cedo.
const COOKIE_SESSAO = 'better-auth.session_token'

// Área logada do produto: dashboard hoje; rooms/characters/settings entram
// nas próximas fases e já ficam protegidas.
const ROTAS_PROTEGIDAS = /^\/(dashboard|rooms|characters|settings)(\/|$)/

export async function proxy(req: NextRequest) {
  const temCookieSessao = req.cookies.has(COOKIE_SESSAO)

  if (!temCookieSessao && ROTAS_PROTEGIDAS.test(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
