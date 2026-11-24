'use client'

import { useEffect, useRef } from 'react'

import { type TipoEventoSala, TIPOS_EVENTO_SALA } from '@/shared/lib/eventos-sala'

// O evento só avisa que algo mudou; quem usa o hook refaz a leitura. Como o
// servidor não reenvia o que se perdeu, reconectar também dispara `aoMudar`.
export type MotivoAtualizacao = TipoEventoSala | 'reconectado'

export function useRoomEvents(roomId: string, aoMudar: (motivo: MotivoAtualizacao) => void): void {
  // Ref para a conexão não reabrir a cada render só porque o callback é novo.
  const callback = useRef(aoMudar)
  useEffect(() => {
    callback.current = aoMudar
  })

  useEffect(() => {
    const fonte = new EventSource(`/api/rooms/${roomId}/events`)
    let jaConectou = false

    fonte.onopen = () => {
      if (jaConectou) callback.current('reconectado')
      jaConectou = true
    }
    for (const tipo of TIPOS_EVENTO_SALA) {
      fonte.addEventListener(tipo, () => callback.current(tipo))
    }
    return () => fonte.close()
  }, [roomId])
}
