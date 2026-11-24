import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    room: { findUnique: vi.fn(), update: vi.fn() },
    roomMember: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
    roomCharacter: { deleteMany: vi.fn() },
    notification: { create: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops)),
  },
}))

vi.mock('@/server/db/prisma', () => ({ prisma: prismaMock }))

import { ConflictError, ForbiddenError, NotFoundError } from '@/server/http/errors'
import {
  decidirPedido,
  expulsarMembro,
  passarCargo,
  sairDaSala,
} from '@/server/salas/salas.membros.service'

const MESTRE = 'u-mestre'
const JOGADOR = 'u-jogador'
const SALA = { id: 'r-1', status: 'lobby', masterUserId: MESTRE }
const pendente = { status: 'pending', role: 'player', statusChangedAt: new Date() }
const ativo = (role: 'player' | 'master' = 'player') => ({ status: 'active', role })

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.room.findUnique.mockResolvedValue(SALA)
})

describe('decidirPedido', () => {
  beforeEach(() => {
    prismaMock.roomMember.findUnique.mockResolvedValue(pendente)
    prismaMock.roomMember.count.mockResolvedValue(3)
  })

  it('deve aceitar: vira ativo e o jogador é avisado', async () => {
    await decidirPedido(MESTRE, 'r-1', JOGADOR, true)

    expect(prismaMock.roomMember.update).toHaveBeenCalledWith({
      where: { roomId_userId: { roomId: 'r-1', userId: JOGADOR } },
      data: { status: 'active', statusChangedAt: expect.any(Date) },
    })
    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: { userId: JOGADOR, roomId: 'r-1', type: 'member_joined' },
    })
  })

  it('deve recusar: soma uma recusa e avisa o jogador', async () => {
    await decidirPedido(MESTRE, 'r-1', JOGADOR, false)

    expect(prismaMock.roomMember.update).toHaveBeenCalledWith({
      where: { roomId_userId: { roomId: 'r-1', userId: JOGADOR } },
      data: {
        status: 'rejected',
        statusChangedAt: expect.any(Date),
        rejectionCount: { increment: 1 },
      },
    })
    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: { userId: JOGADOR, roomId: 'r-1', type: 'join_rejected' },
    })
  })
})

describe('decidirPedido: limites e pedidos inválidos', () => {
  beforeEach(() => {
    prismaMock.roomMember.findUnique.mockResolvedValue(pendente)
    prismaMock.roomMember.count.mockResolvedValue(3)
  })

  it('deve recusar o aceite com 10 jogadores e manter o pedido pendente', async () => {
    prismaMock.roomMember.count.mockResolvedValue(10)

    await expect(decidirPedido(MESTRE, 'r-1', JOGADOR, true)).rejects.toBeInstanceOf(ConflictError)
    expect(prismaMock.roomMember.update).not.toHaveBeenCalled()
    expect(prismaMock.roomMember.count).toHaveBeenCalledWith({
      where: { roomId: 'r-1', role: 'player', status: 'active' },
    })
  })

  it('deve permitir recusar mesmo com a sala cheia', async () => {
    prismaMock.roomMember.count.mockResolvedValue(10)

    await expect(decidirPedido(MESTRE, 'r-1', JOGADOR, false)).resolves.toBeUndefined()
  })

  it.each([
    ['inexistente', null],
    ['já decidido', { ...pendente, status: 'active' }],
    ['expirado há mais de 7 dias', { ...pendente, statusChangedAt: new Date('2020-01-01') }],
  ])('deve tratar pedido %s como não encontrado', async (_nome, membro) => {
    prismaMock.roomMember.findUnique.mockResolvedValue(membro)

    await expect(decidirPedido(MESTRE, 'r-1', JOGADOR, true)).rejects.toBeInstanceOf(NotFoundError)
    expect(prismaMock.roomMember.update).not.toHaveBeenCalled()
  })

  it('deve recusar quem não é o mestre', async () => {
    await expect(decidirPedido(JOGADOR, 'r-1', 'u-outro', true)).rejects.toBeInstanceOf(
      ForbiddenError,
    )
  })
})

describe('sairDaSala', () => {
  it('deve soltar o PJ vivo e marcar o vínculo como "saiu"', async () => {
    prismaMock.roomMember.findUnique.mockResolvedValue(ativo())

    await sairDaSala(JOGADOR, 'r-1')

    expect(prismaMock.roomCharacter.deleteMany).toHaveBeenCalledWith({
      where: { roomId: 'r-1', activeForUserId: JOGADOR, diedAt: null },
    })
    expect(prismaMock.roomMember.update).toHaveBeenCalledWith({
      where: { roomId_userId: { roomId: 'r-1', userId: JOGADOR } },
      data: { status: 'left', statusChangedAt: expect.any(Date) },
    })
  })

  it('deve impedir o mestre de sair', async () => {
    prismaMock.roomMember.findUnique.mockResolvedValue(ativo('master'))

    await expect(sairDaSala(MESTRE, 'r-1')).rejects.toBeInstanceOf(ForbiddenError)
    expect(prismaMock.roomMember.update).not.toHaveBeenCalled()
  })

  it.each([null, { status: 'left', role: 'player' }])(
    'deve tratar quem não é membro ativo (%j) como sala não encontrada',
    async (membro) => {
      prismaMock.roomMember.findUnique.mockResolvedValue(membro)

      await expect(sairDaSala(JOGADOR, 'r-1')).rejects.toBeInstanceOf(NotFoundError)
    },
  )
})

describe('expulsarMembro', () => {
  it('deve banir o jogador e registrar auditoria', async () => {
    prismaMock.roomMember.findUnique.mockResolvedValue(ativo())

    await expulsarMembro(MESTRE, 'r-1', JOGADOR)

    expect(prismaMock.roomMember.update).toHaveBeenCalledWith({
      where: { roomId_userId: { roomId: 'r-1', userId: JOGADOR } },
      data: { status: 'banned', statusChangedAt: expect.any(Date) },
    })
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: { action: 'member_kicked', entityId: 'r-1', userId: MESTRE },
    })
  })

  it('deve impedir o mestre de expulsar a si mesmo', async () => {
    await expect(expulsarMembro(MESTRE, 'r-1', MESTRE)).rejects.toBeInstanceOf(ForbiddenError)
    expect(prismaMock.roomMember.update).not.toHaveBeenCalled()
  })

  it('deve recusar expulsar quem não é membro ativo', async () => {
    prismaMock.roomMember.findUnique.mockResolvedValue({ status: 'pending', role: 'player' })

    await expect(expulsarMembro(MESTRE, 'r-1', JOGADOR)).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('passarCargo', () => {
  beforeEach(() => {
    prismaMock.roomMember.findUnique.mockResolvedValue(ativo())
  })

  it('deve trocar os papéis e tirar os NPCs do antigo mestre e o PJ do novo', async () => {
    await passarCargo(MESTRE, 'r-1', JOGADOR)

    expect(prismaMock.room.update).toHaveBeenCalledWith({
      where: { id: 'r-1' },
      data: { masterUserId: JOGADOR },
    })
    expect(prismaMock.roomMember.update).toHaveBeenCalledWith({
      where: { roomId_userId: { roomId: 'r-1', userId: MESTRE } },
      data: { role: 'player' },
    })
    expect(prismaMock.roomMember.update).toHaveBeenCalledWith({
      where: { roomId_userId: { roomId: 'r-1', userId: JOGADOR } },
      data: { role: 'master' },
    })
    expect(prismaMock.roomCharacter.deleteMany).toHaveBeenCalledWith({
      where: {
        roomId: 'r-1',
        OR: [{ activeForUserId: JOGADOR }, { isNpc: true, character: { ownerUserId: MESTRE } }],
      },
    })
  })

  it('deve permitir com a sala pausada', async () => {
    prismaMock.room.findUnique.mockResolvedValue({ ...SALA, status: 'paused' })

    await expect(passarCargo(MESTRE, 'r-1', JOGADOR)).resolves.toBeUndefined()
  })

  it.each(['active', 'finished'])('deve recusar com a sala em %s', async (status) => {
    prismaMock.room.findUnique.mockResolvedValue({ ...SALA, status })

    await expect(passarCargo(MESTRE, 'r-1', JOGADOR)).rejects.toBeInstanceOf(ConflictError)
    expect(prismaMock.room.update).not.toHaveBeenCalled()
  })

  it.each([
    ['não é membro', null],
    ['ainda é pedido pendente', { status: 'pending', role: 'player' }],
    ['já é mestre', { status: 'active', role: 'master' }],
  ])('deve recusar quando o destino %s', async (_nome, membro) => {
    prismaMock.roomMember.findUnique.mockResolvedValue(membro)

    await expect(passarCargo(MESTRE, 'r-1', JOGADOR)).rejects.toBeInstanceOf(NotFoundError)
    expect(prismaMock.room.update).not.toHaveBeenCalled()
  })
})
