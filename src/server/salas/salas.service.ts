import { Prisma, type Room } from '@prisma/client'

import { prisma } from '@/server/db/prisma'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/server/http/errors'
import { gerarCodigo, normalizarCodigo } from '@/server/salas/salas.codigo'
import {
  CODIGO_INVALIDO,
  exigirMestre,
  MAX_RECUSAS_POR_SALA,
  MAX_SALAS_ABERTAS_POR_MESTRE,
  pedidoExpirou,
  STATUS_ABERTOS,
} from '@/server/salas/salas.regras'
import { esquemaNovaSala } from '@/server/salas/salas.schema'

// Regras vigentes em docs/negocio/salas.md. Toda sala é privada: o código só
// abre um pedido (`pending`), e quem decide a entrada é o mestre.

const TENTATIVAS_CODIGO = 5

function colidiuCodigo(erro: unknown): boolean {
  return erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002'
}

// O sorteio pode repetir um código existente; a UNIQUE do banco é a fonte da
// verdade, então tentamos criar e sorteamos de novo só na colisão.
async function criarComCodigoUnico(userId: string, nome: string): Promise<Room> {
  for (let i = 0; i < TENTATIVAS_CODIGO; i += 1) {
    try {
      return await prisma.room.create({
        data: {
          name: nome,
          code: gerarCodigo(),
          masterUserId: userId,
          members: { create: { userId, role: 'master', status: 'active' } },
        },
      })
    } catch (erro) {
      if (!colidiuCodigo(erro)) throw erro
    }
  }
  throw new ConflictError('Não foi possível gerar um código de sala. Tente de novo.')
}

export async function criarSala(userId: string, entradaDesvalidada: unknown): Promise<Room> {
  const parsed = esquemaNovaSala.safeParse(entradaDesvalidada)
  if (!parsed.success) {
    throw new ValidationError(
      'Sala inválida.',
      parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    )
  }
  const abertas = await prisma.room.count({
    where: { masterUserId: userId, status: { in: STATUS_ABERTOS } },
  })
  if (abertas >= MAX_SALAS_ABERTAS_POR_MESTRE) {
    throw new ConflictError(`Você já tem ${MAX_SALAS_ABERTAS_POR_MESTRE} salas abertas.`)
  }
  const sala = await criarComCodigoUnico(userId, parsed.data.nome)
  await prisma.auditLog.create({ data: { action: 'room_created', entityId: sala.id, userId } })
  return sala
}

type MembroExistente = { status: string; rejectionCount: number; statusChangedAt: Date }

// Decide se um vínculo anterior deixa o usuário pedir de novo. `pending` vivo e
// `active` são conflito; `banned` e recusas demais são proibição.
function validarNovoPedido(existente: MembroExistente): void {
  if (existente.status === 'active') throw new ConflictError('Você já está nesta sala.')
  if (existente.status === 'banned') throw new ForbiddenError('Você não pode entrar nesta sala.')
  if (existente.status === 'rejected' && existente.rejectionCount >= MAX_RECUSAS_POR_SALA) {
    throw new ForbiddenError('Você não pode entrar nesta sala.')
  }
  if (existente.status === 'pending' && !pedidoExpirou(existente.statusChangedAt)) {
    throw new ConflictError('Seu pedido já foi enviado. Aguarde o mestre.')
  }
}

export async function pedirEntrada(userId: string, codigoBruto: string): Promise<Room> {
  const codigo = normalizarCodigo(codigoBruto)
  const sala = codigo ? await prisma.room.findUnique({ where: { code: codigo } }) : null
  // Mesma resposta para inexistente, encerrada e órfã: não confirmar que o código existiu.
  if (!sala?.masterUserId || !STATUS_ABERTOS.includes(sala.status)) {
    throw new NotFoundError(CODIGO_INVALIDO)
  }
  const existente = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: sala.id, userId } },
  })
  if (existente) validarNovoPedido(existente)

  const agora = new Date()
  await prisma.$transaction([
    prisma.roomMember.upsert({
      where: { roomId_userId: { roomId: sala.id, userId } },
      create: { roomId: sala.id, userId, status: 'pending' },
      update: { status: 'pending', statusChangedAt: agora },
    }),
    prisma.notification.create({
      data: {
        userId: sala.masterUserId,
        roomId: sala.id,
        type: 'join_requested',
        payload: { userId },
      },
    }),
  ])
  return sala
}

export async function destruirSala(userId: string, roomId: string): Promise<void> {
  const sala = await exigirMestre(userId, roomId)
  if (sala.status === 'active') {
    throw new ConflictError('A sala está em andamento. Pause a iniciativa antes de encerrá-la.')
  }
  const membros = await prisma.roomMember.findMany({
    where: { roomId, status: 'active', userId: { not: userId } },
    select: { userId: true },
  })
  await prisma.$transaction([
    prisma.room.update({
      where: { id: roomId },
      data: { status: 'destroyed', destroyedAt: new Date() },
    }),
    prisma.notification.createMany({
      data: membros.map((m) => ({ userId: m.userId, roomId, type: 'room_destroyed' as const })),
    }),
    prisma.auditLog.create({ data: { action: 'room_destroyed', entityId: roomId, userId } }),
  ])
}
