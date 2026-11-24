import { requireSession } from '@/server/auth/session'
import { controlarListagem } from '@/server/personagens/personagens.controller'
import { Avatar } from '@/shared/components/atoms/Avatar'
import { Badge } from '@/shared/components/atoms/Badge'
import { Button } from '@/shared/components/atoms/Button'
import { CharacterCard } from '@/shared/components/molecules/CharacterCard'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const { user } = await requireSession()
  const personagens = await controlarListagem()

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

      <section className="flex flex-col gap-4" aria-label="Suas fichas">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold text-ink-900">
            Suas fichas
            <span className="ml-2 font-sans text-sm font-normal text-ink-400">
              {personagens.length}
            </span>
          </h2>
          <Button href="/characters/new" size="sm">
            Nova ficha
          </Button>
        </div>

        {personagens.length === 0 ? (
          <p className="font-serif text-ink-500">
            Nenhuma ficha ainda — monte a primeira pelo wizard em poucos minutos.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {personagens.map((personagem) => (
              <CharacterCard key={personagem.id} personagem={personagem} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
