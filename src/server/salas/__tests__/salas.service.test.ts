import { Prisma } from '@prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    room: { findUnique: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn() },
    roomMember: { findUnique: vi.fn(), findMany: vi.fn(), upsert: vi.fn() },
    notification: { create: vi.fn(), createMany: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(async (ops: unknown[]) => Promise.all(ops)),
  },
}))

vi.mock('@/server/db/prisma', () => ({ prisma: prismaMock }))

import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/server/http/errors'
import { criarSala, destruirSala, pedirEntrada } from '@/server/salas/salas.service'

const MESTRE = 'u-mestre'
const JOGADOR = 'u-jogador'
const SALA = { id: 'r-1', code: 'AB2CD3', status: 'lobby', masterUserId: MESTRE }
const colisao = () =>
  new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'x' })

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.room.count.mockResolvedValue(0)
  prismaMock.room.create.mockResolvedValue(SALA)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('criarSala', () => {
  it('deve criar a sala com o criador como mestre ativo', async () => {
    const sala = await criarSala(MESTRE, { nome: '  Mesa de sexta ' })

    expect(sala).toBe(SALA)
    expect(prismaMock.room.create).toHaveBeenCalledWith({
      data: {
        name: 'Mesa de sexta',
        code: expect.stringMatching(/^[A-Z2-9]{6}$/),
        masterUserId: MESTRE,
        members: { create: { userId: MESTRE, role: 'master', status: 'active' } },
      },
    })
  })

  it('deve recusar nome vazio sem tocar no banco', async () => {
    await expect(criarSala(MESTRE, { nome: '   ' })).rejects.toBeInstanceOf(ValidationError)
    expect(prismaMock.room.create).not.toHaveBeenCalled()
  })

  it('deve recusar a 6ª sala aberta do mesmo mestre', async () => {
    prismaMock.room.count.mockResolvedValue(5)

    await expect(criarSala(MESTRE, { nome: 'Nova' })).rejects.toBeInstanceOf(ConflictError)
    expect(prismaMock.room.create).not.toHaveBeenCalled()
  })

  it('deve contar só salas abertas (nem encerradas nem destruídas)', async () => {
    await criarSala(MESTRE, { nome: 'Nova' })

    expect(prismaMock.room.count).toHaveBeenCalledWith({
      where: { masterUserId: MESTRE, status: { in: ['lobby', 'active', 'paused'] } },
    })
  })

  it('deve sortear outro código quando o primeiro colide', async () => {
    prismaMock.room.create.mockRejectedValueOnce(colisao())

    const sala = await criarSala(MESTRE, { nome: 'Nova' })

    expect(sala).toBe(SALA)
    expect(prismaMock.room.create).toHaveBeenCalledTimes(2)
  })

  it('deve desistir com ConflictError depois de 5 colisões seguidas', async () => {
    prismaMock.room.create.mockRejectedValue(colisao())

    await expect(criarSala(MESTRE, { nome: 'Nova' })).rejects.toBeInstanceOf(ConflictError)
    expect(prismaMock.room.create).toHaveBeenCalledTimes(5)
  })

  it('deve propagar erro que não é colisão sem tentar de novo', async () => {
    prismaMock.room.create.mockRejectedValue(new Error('banco fora'))

    await expect(criarSala(MESTRE, { nome: 'Nova' })).rejects.toThrow('banco fora')
    expect(prismaMock.room.create).toHaveBeenCalledTimes(1)
  })
})

describe('pedirEntrada', () => {
  beforeEach(() => {
    prismaMock.room.findUnique.mockResolvedValue(SALA)
    prismaMock.roomMember.findUnique.mockResolvedValue(null)
  })

  it('deve abrir um pedido pendente e avisar o mestre', async () => {
    await pedirEntrada(JOGADOR, ' ab2cd3 ')

    expect(prismaMock.room.findUnique).toHaveBeenCalledWith({ where: { code: 'AB2CD3' } })
    expect(prismaMock.roomMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { roomId: 'r-1', userId: JOGADOR, status: 'pending' },
      }),
    )
    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: { userId: MESTRE, roomId: 'r-1', type: 'join_requested', payload: { userId: JOGADOR } },
    })
  })

  it('deve responder "código inválido" para formato errado sem consultar o banco', async () => {
    await expect(pedirEntrada(JOGADOR, 'ABC')).rejects.toThrow(
      new NotFoundError('Código inválido.'),
    )
    expect(prismaMock.room.findUnique).not.toHaveBeenCalled()
  })

  it.each(['finished', 'destroyed'])(
    'deve responder igual a um código inexistente quando a sala está %s',
    async (status) => {
      prismaMock.room.findUnique.mockResolvedValue({ ...SALA, status })

      await expect(pedirEntrada(JOGADOR, 'AB2CD3')).rejects.toThrow('Código inválido.')
    },
  )

  it.each(['active', 'paused'])('deve aceitar o pedido com a sala em %s', async (status) => {
    prismaMock.room.findUnique.mockResolvedValue({ ...SALA, status })

    await expect(pedirEntrada(JOGADOR, 'AB2CD3')).resolves.toBeDefined()
  })

  it('deve tratar sala órfã (sem mestre) como código inválido', async () => {
    prismaMock.room.findUnique.mockResolvedValue({ ...SALA, masterUserId: null })

    await expect(pedirEntrada(JOGADOR, 'AB2CD3')).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('pedirEntrada com vínculo anterior', () => {
  beforeEach(() => {
    prismaMock.room.findUnique.mockResolvedValue(SALA)
    prismaMock.roomMember.findUnique.mockResolvedValue(null)
  })

  it('deve recusar quem já é membro ativo', async () => {
    prismaMock.roomMember.findUnique.mockResolvedValue({ status: 'active' })

    await expect(pedirEntrada(JOGADOR, 'AB2CD3')).rejects.toBeInstanceOf(ConflictError)
  })

  it('deve barrar quem foi expulso', async () => {
    prismaMock.roomMember.findUnique.mockResolvedValue({ status: 'banned' })

    await expect(pedirEntrada(JOGADOR, 'AB2CD3')).rejects.toBeInstanceOf(ForbiddenError)
    expect(prismaMock.roomMember.upsert).not.toHaveBeenCalled()
  })

  it('deve barrar na 3ª recusa, mas deixar pedir de novo antes disso', async () => {
    const recusado = (n: number) => ({
      status: 'rejected',
      rejectionCount: n,
      statusChangedAt: new Date(),
    })
    prismaMock.roomMember.findUnique.mockResolvedValueOnce(recusado(3))
    await expect(pedirEntrada(JOGADOR, 'AB2CD3')).rejects.toBeInstanceOf(ForbiddenError)

    prismaMock.roomMember.findUnique.mockResolvedValueOnce(recusado(2))
    await expect(pedirEntrada(JOGADOR, 'AB2CD3')).resolves.toBeDefined()
  })

  it('deve deixar quem saiu pedir de novo', async () => {
    prismaMock.roomMember.findUnique.mockResolvedValue({
      status: 'left',
      rejectionCount: 0,
      statusChangedAt: new Date(),
    })

    await pedirEntrada(JOGADOR, 'AB2CD3')

    expect(prismaMock.roomMember.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ status: 'pending' }) }),
    )
  })

  it('deve recusar pedido duplicado dentro de 7 dias e reabrir depois disso', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-24T12:00:00Z'))
    const pendente = (data: string) => ({
      status: 'pending',
      rejectionCount: 0,
      statusChangedAt: new Date(data),
    })

    prismaMock.roomMember.findUnique.mockResolvedValueOnce(pendente('2026-11-18T12:00:01Z'))
    await expect(pedirEntrada(JOGADOR, 'AB2CD3')).rejects.toBeInstanceOf(ConflictError)

    prismaMock.roomMember.findUnique.mockResolvedValueOnce(pendente('2026-11-17T11:59:59Z'))
    await expect(pedirEntrada(JOGADOR, 'AB2CD3')).resolves.toBeDefined()
  })
})

describe('destruirSala', () => {
  beforeEach(() => {
    prismaMock.room.findUnique.mockResolvedValue(SALA)
    prismaMock.roomMember.findMany.mockResolvedValue([{ userId: JOGADOR }])
  })

  it('deve marcar destruída (soft) e avisar os demais membros ativos', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-24T12:00:00Z'))

    await destruirSala(MESTRE, 'r-1')

    expect(prismaMock.room.update).toHaveBeenCalledWith({
      where: { id: 'r-1' },
      data: { status: 'destroyed', destroyedAt: new Date('2026-11-24T12:00:00Z') },
    })
    expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
      data: [{ userId: JOGADOR, roomId: 'r-1', type: 'room_destroyed' }],
    })
  })

  it('deve recusar com a sala em andamento e oferecer pausar', async () => {
    prismaMock.room.findUnique.mockResolvedValue({ ...SALA, status: 'active' })

    await expect(destruirSala(MESTRE, 'r-1')).rejects.toThrow(/Pause/)
    expect(prismaMock.room.update).not.toHaveBeenCalled()
  })

  it('deve recusar quem não é o mestre', async () => {
    await expect(destruirSala(JOGADOR, 'r-1')).rejects.toBeInstanceOf(ForbiddenError)
    expect(prismaMock.room.update).not.toHaveBeenCalled()
  })
})
