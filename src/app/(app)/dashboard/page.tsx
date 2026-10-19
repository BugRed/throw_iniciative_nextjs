import { requireSession } from '@/server/auth/session'
import { Avatar } from '@/shared/components/atoms/Avatar'
import { Badge } from '@/shared/components/atoms/Badge'
import { Card } from '@/shared/components/atoms/Card'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const { user } = await requireSession()

  return (
    <main className="mx-auto flex max-w-4xl flex-1 flex-col gap-8 px-6 py-12">
      <section className="flex items-center gap-5">
        <Avatar nome={user.name} src={user.image ?? undefined} tamanho="lg" />
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold text-ink-900">{user.name}</h1>
          <p className="font-serif text-ink-500">{user.email}</p>
          {user.emailVerified ? (
            <Badge variante="moss">E-mail verificado</Badge>
          ) : (
            <Badge variante="fire">E-mail não verificado</Badge>
          )}
        </div>
      </section>
      <Card titulo="Sua conta">
        <p className="font-serif text-sm text-ink-500">
          Sessão ativa com cookie httpOnly. Salas de jogo, personagens e o tracker de iniciativa são
          desbloqueados nas próximas fases do plano.
        </p>
      </Card>
    </main>
  )
}
