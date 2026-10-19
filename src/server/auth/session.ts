import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth, type Sessao } from '@/server/auth/auth'

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
