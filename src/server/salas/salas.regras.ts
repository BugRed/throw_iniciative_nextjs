import type { Room, RoomStatus } from '@prisma/client'

import { prisma } from '@/server/db/prisma'
import { ForbiddenError, NotFoundError } from '@/server/http/errors'

// Constantes e guardas compartilhadas pelos services de sala
// (docs/negocio/salas.md).

export const MAX_SALAS_ABERTAS_POR_MESTRE = 5
export const MAX_JOGADORES_POR_SALA = 10
export const MAX_RECUSAS_POR_SALA = 3
export const VALIDADE_PEDIDO_DIAS = 7

export const SALA_NAO_ENCONTRADA = 'Sala não encontrada.'
export const CODIGO_INVALIDO = 'Código inválido.'

// Salas que ainda aceitam pedido de entrada e mudança de elenco.
export const STATUS_ABERTOS: RoomStatus[] = ['lobby', 'active', 'paused']

const MS_POR_DIA = 24 * 60 * 60 * 1000

export function pedidoExpirou(statusChangedAt: Date, agora = new Date()): boolean {
  return agora.getTime() - statusChangedAt.getTime() > VALIDADE_PEDIDO_DIAS * MS_POR_DIA
}

// Para o não-mestre a sala "não existe": não confirmamos a existência de uma
// sala em que a pessoa não tem papel.
export async function exigirMestre(userId: string, roomId: string): Promise<Room> {
  const sala = await prisma.room.findUnique({ where: { id: roomId } })
  if (!sala || sala.status === 'destroyed') throw new NotFoundError(SALA_NAO_ENCONTRADA)
  if (sala.masterUserId !== userId) throw new ForbiddenError('Só o mestre pode fazer isso.')
  return sala
}

export async function exigirMembroAtivo(userId: string, roomId: string) {
  const membro = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
    include: { room: true },
  })
  if (!membro || membro.status !== 'active' || membro.room.status === 'destroyed') {
    throw new NotFoundError(SALA_NAO_ENCONTRADA)
  }
  return membro
}
