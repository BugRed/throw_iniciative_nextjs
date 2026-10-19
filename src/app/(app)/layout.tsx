import Link from 'next/link'

import { getSession } from '@/server/auth/session'
import { Button } from '@/shared/components/atoms/Button'
import { UserMenu } from '@/shared/components/organisms/UserMenu'

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const sessao = await getSession()

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b-2 border-leather-600 bg-gradient-to-b from-leather-700 to-leather-800">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3">
          <Link
            href="/"
            className="font-display text-lg font-bold tracking-wide text-gold-300 hover:text-gold-400"
          >
            Throw Iniciative
          </Link>
          {sessao ? (
            <UserMenu
              nome={sessao.user.name}
              email={sessao.user.email}
              imagem={sessao.user.image ?? undefined}
            />
          ) : (
            <Button href="/login" variant="gold" size="sm">
              Entrar
            </Button>
          )}
        </div>
      </header>
      {children}
    </div>
  )
}
