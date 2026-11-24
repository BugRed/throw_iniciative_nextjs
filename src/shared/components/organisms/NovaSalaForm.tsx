'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect } from 'react'

import { Button } from '@/shared/components/atoms/Button'
import { Input } from '@/shared/components/atoms/Input'
import type { AcaoFormulario, EstadoAcao } from '@/shared/lib/estado-acao'

export function NovaSalaForm({ acao }: { acao: AcaoFormulario }) {
  const router = useRouter()
  const [estado, submeter] = useActionState<EstadoAcao | null, FormData>(acao, null)

  useEffect(() => {
    if (estado && 'ok' in estado && estado.id) router.push(`/rooms/${estado.id}`)
  }, [estado, router])

  return (
    <form action={submeter} className="flex flex-col gap-4">
      <Input rotulo="Nome da sala" name="nome" maxLength={50} required />
      {estado && 'erro' in estado && (
        <p role="alert" className="font-sans text-sm text-fire-600">
          {estado.erro}
        </p>
      )}
      <Button type="submit">Criar sala</Button>
    </form>
  )
}
