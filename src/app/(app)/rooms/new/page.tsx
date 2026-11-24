import { acaoCriarSala } from '@/app/(app)/rooms/actions'
import { NovaSalaForm } from '@/shared/components/organisms/NovaSalaForm'

export default function NovaSalaPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-12">
      <h1 className="font-display text-2xl font-bold text-ink-900">Criar sala</h1>
      <p className="font-serif text-ink-500">
        Você será o mestre. O código de entrada aparece no lobby, e ninguém entra sem a sua
        aprovação.
      </p>
      <NovaSalaForm acao={acaoCriarSala} />
    </main>
  )
}
