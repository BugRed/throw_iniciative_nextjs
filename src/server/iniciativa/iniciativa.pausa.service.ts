import { prisma } from '@/server/db/prisma'
import { ConflictError, NotFoundError } from '@/server/http/errors'
import { buscarAtual, exigirNinguemOcupado } from '@/server/iniciativa/iniciativa.regras'
import { exigirMestre } from '@/server/salas/salas.regras'

// Pausa, retomada e "Solicitar pause" (docs/negocio/iniciativa.md, salas.md).
// `paused` é o estado da sala, não a pausa do timer.

export async function pausarSala(mestreId: string, roomId: string): Promise<void> {
  const sala = await exigirMestre(mestreId, roomId)
  if (sala.status !== 'active') throw new ConflictError('Só uma sala ativa pode ser pausada.')
  const atual = await buscarAtual(roomId)
  await prisma.$transaction([
    prisma.room.update({ where: { id: roomId }, data: { status: 'paused' } }),
    ...(atual
      ? [prisma.initiative.update({ where: { id: atual.id }, data: { pausedAt: new Date() } })]
      : []),
  ])
}

export async function retomarSala(mestreId: string, roomId: string): Promise<void> {
  const sala = await exigirMestre(mestreId, roomId)
  if (sala.status !== 'paused') throw new ConflictError('Só uma sala pausada pode ser retomada.')
  const membros = await prisma.roomMember.findMany({
    where: { roomId, status: 'active' },
    select: { userId: true },
  })
  // Ao retomar vale de novo a exclusividade: alguém pode ter ativado outra sala.
  await exigirNinguemOcupado([mestreId, ...membros.map((m) => m.userId)], roomId)
  const atual = await buscarAtual(roomId)
  const agora = new Date()
  const congelado =
    atual?.pausedAt && atual.turnStartedAt ? agora.getTime() - atual.pausedAt.getTime() : 0
  await prisma.$transaction([
    prisma.room.update({ where: { id: roomId }, data: { status: 'active' } }),
    ...(atual
      ? [
          prisma.initiative.update({
            where: { id: atual.id },
            // O turno continua de onde parou: o tempo pausado não conta.
            data: {
              pausedAt: null,
              turnStartedAt: atual.turnStartedAt
                ? new Date(atual.turnStartedAt.getTime() + congelado)
                : null,
            },
          }),
        ]
      : []),
  ])
}

export type SalaOcupada = { id: string; nome: string; masterUserId: string | null }

// A mesa em que o usuário (como jogador) está `active`. Só o próprio ocupado
// a vê: nunca é exposta ao mestre da sala que tenta abrir.
export async function salaAtivaComoJogador(userId: string): Promise<SalaOcupada | null> {
  const membro = await prisma.roomMember.findFirst({
    where: { userId, role: 'player', status: 'active', room: { status: 'active' } },
    include: { room: true },
  })
  if (!membro) return null
  return { id: membro.room.id, nome: membro.room.name, masterUserId: membro.room.masterUserId }
}

// Pede ao mestre da mesa em andamento que pause. Sem efeito automático: vira
// uma notificação. Um pedido pendente por jogador por sala.
export async function solicitarPause(
  userId: string,
): Promise<{ roomId: string; mestreId: string }> {
  const mesa = await salaAtivaComoJogador(userId)
  if (!mesa?.masterUserId) throw new NotFoundError('Você não está em uma sala ativa.')
  const pendente = await prisma.notification.findFirst({
    where: {
      userId: mesa.masterUserId,
      roomId: mesa.id,
      type: 'pause_requested',
      readAt: null,
      payload: { path: ['userId'], equals: userId },
    },
  })
  if (pendente) throw new ConflictError('Você já pediu para pausar: aguarde o mestre.')
  const usuario = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true },
  })
  await prisma.notification.create({
    data: {
      userId: mesa.masterUserId,
      roomId: mesa.id,
      type: 'pause_requested',
      payload: { userId, nome: usuario.name },
    },
  })
  return { roomId: mesa.id, mestreId: mesa.masterUserId }
}
