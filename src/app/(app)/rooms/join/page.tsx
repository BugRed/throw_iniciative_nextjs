import { acaoPedirEntrada } from '@/app/(app)/rooms/actions'
import { EntrarSalaForm } from '@/shared/components/organisms/EntrarSalaForm'

export default function EntrarSalaPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-6 py-12">
      <h1 className="font-display text-2xl font-bold text-ink-900">Entrar em uma sala</h1>
      <p className="font-serif text-ink-500">
        Digite o código que o mestre passou. Ele precisa aceitar o seu pedido antes de você entrar.
      </p>
      <EntrarSalaForm acao={acaoPedirEntrada} />
    </main>
  )
}
