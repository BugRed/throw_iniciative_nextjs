import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    room: { findUnique: vi.fn(), update: vi.fn() },
    roomCharacter: { findUnique: vi.fn() },
    roomTempNpc: { findFirst: vi.fn() },
    user: { findMany: vi.fn() },
    initiative: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    initiativeParticipant: { create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(async (arg: unknown) =>
      Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: unknown) => unknown)(prismaMock),
    ),
  },
}))

vi.mock('@/server/db/prisma', () => ({ prisma: prismaMock }))

import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/server/http/errors'
import { iniciativa, participante } from '@/server/iniciativa/__fixtures__/participantes'
import {
  adicionarParticipante,
  finalizarIniciativa,
  passarVez,
} from '@/server/iniciativa/iniciativa.combate.service'

const MESTRE = 'u-mestre'
const JOGADOR = 'u-jogador'
const CHAR = '11111111-1111-4111-8111-111111111111'
const TEMP = '22222222-2222-4222-8222-222222222222'

// a (PJ do JOGADOR) · b (NPC) · c (PJ de outro jogador), já ordenados.
const fila = () => [
  participante({ id: 'a', characterId: 'a', hasRolled: true, rollResult: 20, position: 0 }),
  participante({
    id: 'b',
    characterId: 'b',
    userIdResponsible: null,
    hasRolled: true,
    rollResult: 15,
    position: 1,
  }),
  participante({
    id: 'c',
    characterId: 'c',
    userIdResponsible: 'u-outro',
    hasRolled: true,
    rollResult: 10,
    position: 2,
  }),
]

const combate = (currentPosition: number, extra: Record<string, unknown> = {}) =>
  iniciativa('active', fila(), { currentPosition, round: 3, ...extra })

const sala = (status = 'active') => ({ id: 'r-1', status, masterUserId: MESTRE })

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.room.findUnique.mockResolvedValue(sala())
  prismaMock.initiative.updateMany.mockResolvedValue({ count: 1 })
  prismaMock.user.findMany.mockResolvedValue([])
})

describe('passarVez — quem passa', () => {
  it('deve levar a vez ao próximo e marcar que o da vez jogou', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(combate(0))

    await passarVez(JOGADOR, 'r-1')

    expect(prismaMock.initiative.updateMany).toHaveBeenCalledWith({
      where: { id: 'i-1', status: 'active', currentPosition: 0, round: 3 },
      data: { currentPosition: 1, turnStartedAt: expect.any(Date) },
    })
    expect(prismaMock.initiativeParticipant.update).toHaveBeenCalledWith({
      where: { id: 'a' },
      data: { hasPlayed: true },
    })
  })

  it('deve deixar o mestre passar a vez de um NPC', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(combate(1))

    await passarVez(MESTRE, 'r-1')

    expect(prismaMock.initiative.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { currentPosition: 2, turnStartedAt: expect.any(Date) } }),
    )
  })

  it('deve deixar o mestre passar a vez de um jogador ausente', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(combate(2))

    await passarVez(MESTRE, 'r-1')

    expect(prismaMock.initiative.updateMany).toHaveBeenCalledTimes(1)
  })
})

describe('passarVez — rodada', () => {
  it('deve voltar ao topo, avançar a rodada e zerar as jogadas ao passar do último', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(combate(2))

    await passarVez(MESTRE, 'r-1')

    expect(prismaMock.initiative.updateMany).toHaveBeenCalledWith({
      where: { id: 'i-1', status: 'active', currentPosition: 2, round: 3 },
      data: { currentPosition: 0, turnStartedAt: expect.any(Date), round: { increment: 1 } },
    })
    expect(prismaMock.initiativeParticipant.updateMany).toHaveBeenCalledWith({
      where: { initiativeId: 'i-1' },
      data: { hasPlayed: false },
    })
    expect(prismaMock.initiativeParticipant.update).not.toHaveBeenCalled()
  })

  it('deve devolver a vez ao único participante na rodada seguinte', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(
      iniciativa('active', [fila()[0]], { currentPosition: 0, round: 1 }),
    )

    await passarVez(JOGADOR, 'r-1')

    expect(prismaMock.initiative.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currentPosition: 0, round: { increment: 1 } }),
      }),
    )
  })

  it('deve ignorar removidos ao decidir se a vez é do último', async () => {
    const [a, b, c] = fila()
    const removido = { ...c, removedAt: new Date(), position: null }
    prismaMock.initiative.findFirst.mockResolvedValue(
      iniciativa('active', [a, b, removido], { currentPosition: 1, round: 1 }),
    )

    await passarVez(MESTRE, 'r-1')

    expect(prismaMock.initiative.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currentPosition: 0, round: { increment: 1 } }),
      }),
    )
  })
})

describe('passarVez — recusas de permissão e estado', () => {
  it('deve recusar outro jogador que não está na vez, sem gravar', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(combate(2))

    await expect(passarVez(JOGADOR, 'r-1')).rejects.toThrow(ForbiddenError)
    expect(prismaMock.initiative.updateMany).not.toHaveBeenCalled()
  })

  it('deve recusar jogador na vez de um NPC', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(combate(1))

    await expect(passarVez(JOGADOR, 'r-1')).rejects.toThrow(ForbiddenError)
  })

  it('deve recusar com a sala pausada', async () => {
    prismaMock.room.findUnique.mockResolvedValue(sala('paused'))
    prismaMock.initiative.findFirst.mockResolvedValue(combate(0))

    await expect(passarVez(JOGADOR, 'r-1')).rejects.toThrow('A sala está pausada')
    expect(prismaMock.initiative.updateMany).not.toHaveBeenCalled()
  })

  it('deve recusar antes de o combate ser ativado', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('ordered', fila()))

    await expect(passarVez(MESTRE, 'r-1')).rejects.toThrow(ConflictError)
  })
})

describe('passarVez — sala inexistente e clique duplo', () => {
  it('deve lançar NotFoundError quando a sala não existe', async () => {
    prismaMock.room.findUnique.mockResolvedValue(null)

    await expect(passarVez(MESTRE, 'r-1')).rejects.toThrow(NotFoundError)
  })

  it('deve recusar o segundo clique quando a vez já passou, sem marcar jogada', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(combate(0))
    prismaMock.initiative.updateMany.mockResolvedValue({ count: 0 })

    await expect(passarVez(JOGADOR, 'r-1')).rejects.toThrow('A vez já passou.')
    expect(prismaMock.initiativeParticipant.update).not.toHaveBeenCalled()
  })
})

const vinculo = (extra: Record<string, unknown> = {}) => ({
  roomId: 'r-1',
  characterId: CHAR,
  isNpc: false,
  activeForUserId: 'u-novo',
  diedAt: null,
  character: { name: 'Brom', initiativeMod: 1 },
  ...extra,
})

describe('adicionarParticipante — onde entra', () => {
  it('deve pôr o PJ no fim da fila, sem rolar, contando só quem está na fila', async () => {
    const [a, b, c] = fila()
    prismaMock.initiative.findFirst.mockResolvedValue(
      iniciativa('active', [a, b, { ...c, removedAt: new Date(), position: null }]),
    )
    prismaMock.roomCharacter.findUnique.mockResolvedValue(vinculo())

    await adicionarParticipante(MESTRE, 'r-1', { characterId: CHAR })

    expect(prismaMock.initiativeParticipant.create).toHaveBeenCalledWith({
      data: {
        participantType: 'character',
        characterId: CHAR,
        label: 'Brom',
        userIdResponsible: 'u-novo',
        initiativeMod: 1,
        initiativeId: 'i-1',
        addedMode: 'append',
        position: 2,
      },
    })
  })

  it('deve pôr no fim também em ordered', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('ordered', fila()))
    prismaMock.roomTempNpc.findFirst.mockResolvedValue({
      id: TEMP,
      label: 'Goblin',
      initiativeMod: 2,
    })

    await adicionarParticipante(MESTRE, 'r-1', { tempNpcId: TEMP })

    expect(prismaMock.initiativeParticipant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tempNpcId: TEMP, addedMode: 'append', position: 3 }),
    })
  })

  it('deve entrar como os demais, para rolar, sem posição', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('rolling', [participante()]))
    prismaMock.roomCharacter.findUnique.mockResolvedValue(vinculo())

    await adicionarParticipante(MESTRE, 'r-1', { characterId: CHAR })

    const { data } = prismaMock.initiativeParticipant.create.mock.calls[0][0]
    expect(data).not.toHaveProperty('position')
    expect(data).not.toHaveProperty('addedMode')
  })
})

describe('adicionarParticipante — elegibilidade', () => {
  it('deve recusar quem foi removido deste combate', async () => {
    const removido = participante({ id: 'x', characterId: CHAR, removedAt: new Date() })
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('active', [removido]))
    prismaMock.roomCharacter.findUnique.mockResolvedValue(vinculo())

    await expect(adicionarParticipante(MESTRE, 'r-1', { characterId: CHAR })).rejects.toThrow(
      'já esteve',
    )
    expect(prismaMock.initiativeParticipant.create).not.toHaveBeenCalled()
  })

  it('deve recusar PJ morto nesta sala', async () => {
    prismaMock.roomCharacter.findUnique.mockResolvedValue(vinculo({ diedAt: new Date() }))

    await expect(adicionarParticipante(MESTRE, 'r-1', { characterId: CHAR })).rejects.toThrow(
      ConflictError,
    )
  })

  it('deve recusar PJ sem jogador ativo', async () => {
    prismaMock.roomCharacter.findUnique.mockResolvedValue(vinculo({ activeForUserId: null }))

    await expect(adicionarParticipante(MESTRE, 'r-1', { characterId: CHAR })).rejects.toThrow(
      ConflictError,
    )
  })

  it('deve lançar NotFoundError para personagem fora da sala', async () => {
    prismaMock.roomCharacter.findUnique.mockResolvedValue(null)

    await expect(adicionarParticipante(MESTRE, 'r-1', { characterId: CHAR })).rejects.toThrow(
      NotFoundError,
    )
  })

  it('deve lançar NotFoundError para NPC temporário de outra sala', async () => {
    prismaMock.roomTempNpc.findFirst.mockResolvedValue(null)

    await expect(adicionarParticipante(MESTRE, 'r-1', { tempNpcId: TEMP })).rejects.toThrow(
      NotFoundError,
    )
    expect(prismaMock.roomTempNpc.findFirst).toHaveBeenCalledWith({
      where: { id: TEMP, roomId: 'r-1' },
    })
  })
})

describe('adicionarParticipante — entrada e permissão', () => {
  it.each([[{}], [{ characterId: CHAR, tempNpcId: TEMP }], [{ characterId: 'x' }], [null]])(
    'deve recusar entrada malformada %j',
    async (entrada) => {
      await expect(adicionarParticipante(MESTRE, 'r-1', entrada)).rejects.toThrow(ValidationError)
    },
  )

  it('deve recusar com a sala pausada', async () => {
    prismaMock.room.findUnique.mockResolvedValue(sala('paused'))
    prismaMock.roomCharacter.findUnique.mockResolvedValue(vinculo())

    await expect(adicionarParticipante(MESTRE, 'r-1', { characterId: CHAR })).rejects.toThrow(
      'A sala está pausada',
    )
  })

  it('deve recusar quem não é o mestre', async () => {
    prismaMock.roomCharacter.findUnique.mockResolvedValue(vinculo())

    await expect(adicionarParticipante(JOGADOR, 'r-1', { characterId: CHAR })).rejects.toThrow(
      ForbiddenError,
    )
  })
})

describe('adicionarParticipante — exclusividade', () => {
  it('deve recusar o jogador ocupado em outra sala ativa', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('active', fila()))
    prismaMock.roomCharacter.findUnique.mockResolvedValue(vinculo())
    prismaMock.user.findMany.mockResolvedValue([{ id: 'u-novo', name: 'Nina' }])

    await expect(adicionarParticipante(MESTRE, 'r-1', { characterId: CHAR })).rejects.toThrow(
      'outra sala ativa',
    )
    expect(prismaMock.initiativeParticipant.create).not.toHaveBeenCalled()
  })

  it('não deve checar ocupação para NPC de ficha', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('active', fila()))
    prismaMock.roomCharacter.findUnique.mockResolvedValue(
      vinculo({ isNpc: true, activeForUserId: null }),
    )

    await adicionarParticipante(MESTRE, 'r-1', { characterId: CHAR })

    expect(prismaMock.user.findMany).not.toHaveBeenCalled()
  })
})

describe('finalizarIniciativa', () => {
  it.each(['active', 'paused'])(
    'deve finalizar e devolver a sala a lobby com a sala %s',
    async (status) => {
      prismaMock.room.findUnique.mockResolvedValue(sala(status))
      prismaMock.initiative.findFirst.mockResolvedValue(combate(1))

      await finalizarIniciativa(MESTRE, 'r-1')

      expect(prismaMock.initiative.update).toHaveBeenCalledWith({
        where: { id: 'i-1' },
        data: { status: 'finished', finishedAt: expect.any(Date), pausedAt: null },
      })
      expect(prismaMock.room.update).toHaveBeenCalledWith({
        where: { id: 'r-1' },
        data: { status: 'lobby' },
      })
    },
  )

  it('deve recusar antes de o combate começar, sem gravar', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('ordered', fila()))

    await expect(finalizarIniciativa(MESTRE, 'r-1')).rejects.toThrow('se cancela')
    expect(prismaMock.room.update).not.toHaveBeenCalled()
  })

  it('deve recusar quem não é o mestre', async () => {
    await expect(finalizarIniciativa(JOGADOR, 'r-1')).rejects.toThrow(ForbiddenError)
  })

  it('deve lançar NotFoundError sem combate em andamento', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(null)

    await expect(finalizarIniciativa(MESTRE, 'r-1')).rejects.toThrow(NotFoundError)
  })
})
