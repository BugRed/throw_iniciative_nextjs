import type { Prisma } from '@prisma/client'

import { prisma } from '@/server/db/prisma'
import { ConflictError, ForbiddenError, NotFoundError } from '@/server/http/errors'
import {
  exigirMestre,
  MAX_JOGADORES_POR_SALA,
  pedidoExpirou,
  SALA_NAO_ENCONTRADA,
} from '@/server/salas/salas.regras'

// Decisão sobre pedidos, saída, expulsão e passagem de cargo
// (docs/negocio/salas.md). Toda remoção é soft delete: a linha fica.

const PEDIDO_NAO_ENCONTRADO = 'Pedido de entrada não encontrado.'
const MENSAGEM_MESTRE_FIXO = 'O mestre não sai nem é expulso. Passe o cargo ou encerre a sala.'

async function buscarMembro(roomId: string, userId: string) {
  return prisma.roomMember.findUnique({ where: { roomId_userId: { roomId, userId } } })
}

export async function decidirPedido(
  mestreId: string,
  roomId: string,
  usuarioId: string,
  aceitar: boolean,
): Promise<void> {
  await exigirMestre(mestreId, roomId)
  const pedido = await buscarMembro(roomId, usuarioId)
  if (pedido?.status !== 'pending' || pedidoExpirou(pedido.statusChangedAt)) {
    throw new NotFoundError(PEDIDO_NAO_ENCONTRADO)
  }
  const agora = new Date()
  if (!aceitar) {
    await prisma.$transaction([
      prisma.roomMember.update({
        where: { roomId_userId: { roomId, userId: usuarioId } },
        data: { status: 'rejected', statusChangedAt: agora, rejectionCount: { increment: 1 } },
      }),
      prisma.notification.create({
        data: { userId: usuarioId, roomId, type: 'join_rejected' },
      }),
    ])
    return
  }
  // O limite vale só no aceite: pedidos pendentes não ocupam vaga.
  const jogadores = await prisma.roomMember.count({
    where: { roomId, role: 'player', status: 'active' },
  })
  if (jogadores >= MAX_JOGADORES_POR_SALA) {
    throw new ConflictError(`A sala já tem ${MAX_JOGADORES_POR_SALA} jogadores.`)
  }
  await prisma.$transaction([
    prisma.roomMember.update({
      where: { roomId_userId: { roomId, userId: usuarioId } },
      data: { status: 'active', statusChangedAt: agora },
    }),
    prisma.notification.create({ data: { userId: usuarioId, roomId, type: 'member_joined' } }),
  ])
}

// Quem sai ou é expulso perde o PJ ativo; PJ morto na sala fica (diedAt), para
// continuar barrando o mesmo personagem de voltar àquela sala.
function removerPjAtivo(roomId: string, userId: string): Prisma.PrismaPromise<unknown> {
  return prisma.roomCharacter.deleteMany({
    where: { roomId, activeForUserId: userId, diedAt: null },
  })
}

async function encerrarVinculo(
  roomId: string,
  userId: string,
  status: 'left' | 'banned',
): Promise<void> {
  await prisma.$transaction([
    removerPjAtivo(roomId, userId),
    prisma.roomMember.update({
      where: { roomId_userId: { roomId, userId } },
      data: { status, statusChangedAt: new Date() },
    }),
  ])
}

export async function sairDaSala(userId: string, roomId: string): Promise<void> {
  const membro = await buscarMembro(roomId, userId)
  if (membro?.status !== 'active') throw new NotFoundError(SALA_NAO_ENCONTRADA)
  if (membro.role === 'master') throw new ForbiddenError(MENSAGEM_MESTRE_FIXO)
  await encerrarVinculo(roomId, userId, 'left')
}

export async function expulsarMembro(
  mestreId: string,
  roomId: string,
  usuarioId: string,
): Promise<void> {
  await exigirMestre(mestreId, roomId)
  if (usuarioId === mestreId) throw new ForbiddenError(MENSAGEM_MESTRE_FIXO)
  const membro = await buscarMembro(roomId, usuarioId)
  if (membro?.status !== 'active') throw new NotFoundError('Membro não encontrado.')
  await encerrarVinculo(roomId, usuarioId, 'banned')
  await prisma.auditLog.create({
    data: { action: 'member_kicked', entityId: roomId, userId: mestreId },
  })
}

export async function passarCargo(
  mestreId: string,
  roomId: string,
  novoMestreId: string,
): Promise<void> {
  const sala = await exigirMestre(mestreId, roomId)
  // Em `active` o mestre é parte do combate; só `lobby` e `paused` trocam de mão.
  if (sala.status !== 'lobby' && sala.status !== 'paused') {
    throw new ConflictError('Só dá para passar o cargo com a sala em lobby ou pausada.')
  }
  const alvo = await buscarMembro(roomId, novoMestreId)
  if (alvo?.status !== 'active' || alvo.role !== 'player') {
    throw new NotFoundError('Escolha um jogador ativo da sala.')
  }
  await prisma.$transaction([
    prisma.room.update({ where: { id: roomId }, data: { masterUserId: novoMestreId } }),
    prisma.roomMember.update({
      where: { roomId_userId: { roomId, userId: mestreId } },
      data: { role: 'player' },
    }),
    prisma.roomMember.update({
      where: { roomId_userId: { roomId, userId: novoMestreId } },
      data: { role: 'master' },
    }),
    // O novo mestre só joga com NPCs; os NPCs do antigo são fichas dele e saem.
    prisma.roomCharacter.deleteMany({
      where: {
        roomId,
        OR: [
          { activeForUserId: novoMestreId },
          { isNpc: true, character: { ownerUserId: mestreId } },
        ],
      },
    }),
    prisma.auditLog.create({
      data: { action: 'master_transferred', entityId: roomId, userId: mestreId },
    }),
  ])
}
