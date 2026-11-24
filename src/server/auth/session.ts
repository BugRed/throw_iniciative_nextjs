import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth, type Sessao } from '@/server/auth/auth'
import { AppError } from '@/server/http/errors'

export async function getSession(): Promise<Sessao | null> {
  return auth.api.getSession({ headers: await headers() })
}

export async function requireSession(): Promise<Sessao> {
  const sessao = await getSession()
  if (!sessao) {
    redirect('/login')
  }
  return sessao
}

// Para controllers de Server Action/route: sem sessão é 401 (erro de domínio),
// não redirect — quem chama decide o que mostrar.
export async function exigirUserId(): Promise<string> {
  const sessao = await getSession()
  if (!sessao) throw new AppError('Sessão necessária.', 401, 'SEM_SESSAO')
  return sessao.user.id
}
