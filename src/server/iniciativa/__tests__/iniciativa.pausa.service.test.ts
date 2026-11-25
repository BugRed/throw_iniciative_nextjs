import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    room: { findUnique: vi.fn(), update: vi.fn() },
    roomMember: { findMany: vi.fn(), findFirst: vi.fn() },
    user: { findMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    initiative: { findFirst: vi.fn(), update: vi.fn() },
    notification: { findFirst: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(async (arg: unknown) => Promise.all(arg as unknown[])),
  },
}))

vi.mock('@/server/db/prisma', () => ({ prisma: prismaMock }))

import { ConflictError, ForbiddenError, NotFoundError } from '@/server/http/errors'
import { iniciativa, participante } from '@/server/iniciativa/__fixtures__/participantes'
import {
  pausarSala,
  retomarSala,
  solicitarPause,
} from '@/server/iniciativa/iniciativa.pausa.service'

const MESTRE = 'u-mestre'
const sala = (status: string) => ({ id: 'r-1', status, masterUserId: MESTRE })

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.user.findMany.mockResolvedValue([])
  prismaMock.roomMember.findMany.mockResolvedValue([{ userId: MESTRE }, { userId: 'u-j' }])
})

describe('pausarSala', () => {
  it('deve pausar a sala e congelar a iniciativa', async () => {
    prismaMock.room.findUnique.mockResolvedValue(sala('active'))
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('active', [participante()]))

    await pausarSala(MESTRE, 'r-1')

    expect(prismaMock.room.update).toHaveBeenCalledWith({
      where: { id: 'r-1' },
      data: { status: 'paused' },
    })
    expect(prismaMock.initiative.update).toHaveBeenCalledWith({
      where: { id: 'i-1' },
      data: { pausedAt: expect.any(Date) },
    })
  })

  it('deve recusar pausar sala que não está ativa', async () => {
    prismaMock.room.findUnique.mockResolvedValue(sala('lobby'))

    await expect(pausarSala(MESTRE, 'r-1')).rejects.toThrow(ConflictError)
  })

  it('deve negar a quem não é o mestre', async () => {
    prismaMock.room.findUnique.mockResolvedValue(sala('active'))

    await expect(pausarSala('u-x', 'r-1')).rejects.toThrow(ForbiddenError)
  })
})

describe('retomarSala', () => {
  beforeEach(() => prismaMock.room.findUnique.mockResolvedValue(sala('paused')))

  it('deve retomar de onde parou: o tempo pausado não conta no turno', async () => {
    const pausadoEm = new Date('2026-11-24T10:10:00Z')
    vi.useFakeTimers().setSystemTime(new Date('2026-11-24T10:15:00Z'))
    prismaMock.initiative.findFirst.mockResolvedValue(
      iniciativa('active', [participante()], {
        pausedAt: pausadoEm,
        turnStartedAt: new Date('2026-11-24T10:09:00Z'),
      }),
    )

    await retomarSala(MESTRE, 'r-1')
    vi.useRealTimers()

    expect(prismaMock.room.update).toHaveBeenCalledWith({
      where: { id: 'r-1' },
      data: { status: 'active' },
    })
    expect(prismaMock.initiative.update).toHaveBeenCalledWith({
      where: { id: 'i-1' },
      data: { pausedAt: null, turnStartedAt: new Date('2026-11-24T10:14:00Z') },
    })
  })

  it('deve recusar quando alguém já está ativo em outra sala', async () => {
    prismaMock.user.findMany.mockResolvedValue([{ id: 'u-j', name: 'Bia' }])
    prismaMock.initiative.findFirst.mockResolvedValue(null)

    await expect(retomarSala(MESTRE, 'r-1')).rejects.toThrow(ConflictError)
    expect(prismaMock.room.update).not.toHaveBeenCalled()
  })

  it('deve recusar retomar sala que não está pausada', async () => {
    prismaMock.room.findUnique.mockResolvedValue(sala('active'))

    await expect(retomarSala(MESTRE, 'r-1')).rejects.toThrow(ConflictError)
  })
})

describe('solicitarPause', () => {
  const mesa = { room: { id: 'r-9', name: 'Mesa 9', masterUserId: 'u-outro-mestre' } }

  beforeEach(() => {
    prismaMock.roomMember.findFirst.mockResolvedValue(mesa)
    prismaMock.notification.findFirst.mockResolvedValue(null)
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({ name: 'Bia' })
  })

  it('deve notificar o mestre da mesa em andamento, sem efeito automático', async () => {
    const r = await solicitarPause('u-j')

    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: {
        userId: 'u-outro-mestre',
        roomId: 'r-9',
        type: 'pause_requested',
        payload: { userId: 'u-j', nome: 'Bia' },
      },
    })
    expect(r).toEqual({ roomId: 'r-9', mestreId: 'u-outro-mestre' })
    expect(prismaMock.room.update).not.toHaveBeenCalled()
  })

  it('deve manter um pedido pendente por jogador por sala', async () => {
    prismaMock.notification.findFirst.mockResolvedValue({ id: 'n-1' })

    await expect(solicitarPause('u-j')).rejects.toThrow('já pediu')
    expect(prismaMock.notification.create).not.toHaveBeenCalled()
  })

  it('deve recusar quem não está em sala ativa', async () => {
    prismaMock.roomMember.findFirst.mockResolvedValue(null)

    await expect(solicitarPause('u-j')).rejects.toThrow(NotFoundError)
  })
})
