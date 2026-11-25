'use server'

import { revalidatePath } from 'next/cache'

import { AppError } from '@/server/http/errors'
import {
  controlarAbertura,
  controlarPedidoDePause,
} from '@/server/iniciativa/iniciativa.controller'
import type { EstadoAcao } from '@/shared/lib/estado-acao'

// Server Actions da iniciativa: traduzem FormData e delegam ao controller.

type Estado = EstadoAcao | null

// O mestre vê QUEM está ocupado em outra sala ativa, nunca qual mesa.
function mensagem(erro: unknown): string {
  if (!(erro instanceof AppError)) return 'Algo falhou. Tente de novo.'
  const ocupados = (erro.detalhes as { ocupados?: { nome: string }[] } | undefined)?.ocupados
  if (!ocupados?.length) return erro.message
  return `${erro.message} Ocupados: ${ocupados.map((o) => o.nome).join(', ')}.`
}

export async function acaoAbrirIniciativa(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  const roomId = String(formData.get('roomId') ?? '')
  try {
    await controlarAbertura(roomId, {})
    revalidatePath(`/rooms/${roomId}`)
    return { ok: true, id: roomId }
  } catch (erro) {
    return { erro: mensagem(erro) }
  }
}

export async function acaoSolicitarPause(_e: Estado): Promise<EstadoAcao> {
  try {
    await controlarPedidoDePause()
    return { ok: true, id: 'pause' }
  } catch (erro) {
    return { erro: mensagem(erro) }
  }
}
