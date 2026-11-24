'use client'

import { useRouter } from 'next/navigation'

import { useRoomEvents } from '@/shared/lib/use-room-events'

// Não desenha nada: mantém a conexão SSE e, a cada aviso, pede ao servidor a
// página de novo (a leitura passa pela autorização, o evento nunca traz dado).
export function AtualizadorSala({ roomId }: { roomId: string }) {
  const router = useRouter()
  useRoomEvents(roomId, () => router.refresh())
  return null
}
