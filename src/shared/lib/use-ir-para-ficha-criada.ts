'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import type { EstadoAcao } from '@/shared/lib/estado-acao'

// Ao criar a ficha (PJ ou NPC) a Server Action devolve o id; o client segue para ela.
export function useIrParaFichaCriada(estadoAcao: EstadoAcao | null) {
  const router = useRouter()
  useEffect(() => {
    if (estadoAcao && 'ok' in estadoAcao && estadoAcao.id)
      router.push(`/characters/${estadoAcao.id}`)
  }, [estadoAcao, router])
}
