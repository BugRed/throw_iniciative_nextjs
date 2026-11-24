import Link from 'next/link'

import { controlarMinhasSalas } from '@/server/salas/salas.controller'
import { Badge } from '@/shared/components/atoms/Badge'
import { Button } from '@/shared/components/atoms/Button'
import { ROTULO_STATUS_SALA } from '@/shared/components/organisms/lobby-tipos'

export const dynamic = 'force-dynamic'

export default async function SalasPage() {
  const salas = await controlarMinhasSalas()

  return (
    <main className="mx-auto flex max-w-4xl flex-1 flex-col gap-6 px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-ink-900">Suas salas</h1>
        <div className="flex gap-2">
          <Button href="/rooms/join" variant="secondary">
            Entrar com código
          </Button>
          <Button href="/rooms/new">Criar sala</Button>
        </div>
      </div>
      {salas.length === 0 ? (
        <p className="font-serif text-ink-500">
          Você ainda não está em nenhuma sala. Crie uma como mestre ou entre com o código de uma
          mesa.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {salas.map((sala) => (
            <li key={sala.id}>
              <Link
                href={`/rooms/${sala.id}`}
                className="flex items-center justify-between rounded-md border border-paper-300 px-4 py-3 hover:bg-gold-400/10"
              >
                <span className="font-serif text-ink-900">{sala.name}</span>
                <Badge variante="outline">{ROTULO_STATUS_SALA[sala.status] ?? sala.status}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
