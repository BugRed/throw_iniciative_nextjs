'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useState } from 'react'

import { Button } from '@/shared/components/atoms/Button'
import { Input } from '@/shared/components/atoms/Input'
import type { AcaoFormulario, EstadoAcao } from '@/shared/lib/estado-acao'
import { useRoomEvents } from '@/shared/lib/use-room-events'

// Depois do pedido o jogador ainda não é membro: ele só escuta o resultado do
// próprio pedido (o servidor entrega a quem está pendente só esse evento).
function AguardandoAprovacao({ roomId }: { roomId: string }) {
  const router = useRouter()
  const [recusado, setRecusado] = useState(false)

  useRoomEvents(roomId, (motivo) => {
    if (motivo === 'member:joined') router.push(`/rooms/${roomId}`)
    if (motivo === 'member:rejected') setRecusado(true)
  })

  if (recusado) {
    return (
      <p role="alert" className="font-serif text-fire-600">
        O mestre recusou o seu pedido de entrada.
      </p>
    )
  }
  return (
    <p role="status" className="font-serif text-ink-700">
      Pedido enviado. Aguarde o mestre aceitar — você entra na sala automaticamente.
    </p>
  )
}

export function EntrarSalaForm({ acao }: { acao: AcaoFormulario }) {
  const [estado, submeter] = useActionState<EstadoAcao | null, FormData>(acao, null)

  if (estado && 'ok' in estado && estado.id) return <AguardandoAprovacao roomId={estado.id} />

  return (
    <form action={submeter} className="flex flex-col gap-4">
      <Input
        rotulo="Código da sala"
        name="codigo"
        maxLength={6}
        autoComplete="off"
        className="font-mono uppercase tracking-widest"
        required
      />
      {estado && 'erro' in estado && (
        <p role="alert" className="font-sans text-sm text-fire-600">
          {estado.erro}
        </p>
      )}
      <Button type="submit">Pedir para entrar</Button>
    </form>
  )
}
