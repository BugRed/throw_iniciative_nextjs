import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    room: { findUnique: vi.fn(), update: vi.fn() },
    roomCharacter: { findMany: vi.fn() },
    roomTempNpc: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
    initiative: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    initiativeParticipant: { update: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(async (arg: unknown) =>
      Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: unknown) => unknown)(prismaMock),
    ),
  },
}))

vi.mock('@/server/db/prisma', () => ({ prisma: prismaMock }))

import { ConflictError, ForbiddenError } from '@/server/http/errors'
import { iniciativa, participante } from '@/server/iniciativa/__fixtures__/participantes'
import {
  abrirIniciativa,
  avancarIniciativa,
  cancelarIniciativa,
} from '@/server/iniciativa/iniciativa.abertura.service'

const MESTRE = 'u-mestre'

const pj = {
  characterId: 'c-pj',
  isNpc: false,
  activeForUserId: 'u-jogador',
  character: { name: 'Aria', initiativeMod: 3 },
}
const npc = {
  characterId: 'c-npc',
  isNpc: true,
  activeForUserId: null,
  character: { name: 'Vilão', initiativeMod: 1 },
}
const goblin = { id: 't-1', label: 'Goblin #1', initiativeMod: 2 }

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.room.findUnique.mockResolvedValue({ id: 'r-1', status: 'lobby', masterUserId: MESTRE })
  prismaMock.roomCharacter.findMany.mockResolvedValue([pj, npc])
  prismaMock.roomTempNpc.findMany.mockResolvedValue([goblin])
  prismaMock.user.findMany.mockResolvedValue([])
})

describe('abrirIniciativa', () => {
  it('deve criar o combate em draft com PJs e NPCs e levar a sala a active', async () => {
    await abrirIniciativa(MESTRE, 'r-1', {})

    expect(prismaMock.room.update).toHaveBeenCalledWith({
      where: { id: 'r-1' },
      data: { status: 'active' },
    })
    const { data } = prismaMock.initiative.create.mock.calls[0][0]
    expect(data.participants.create).toEqual([
      {
        participantType: 'character',
        characterId: 'c-pj',
        label: 'Aria',
        userIdResponsible: 'u-jogador',
        initiativeMod: 3,
      },
      {
        participantType: 'character',
        characterId: 'c-npc',
        label: 'Vilão',
        userIdResponsible: null,
        initiativeMod: 1,
      },
      { participantType: 'temp_npc', tempNpcId: 't-1', label: 'Goblin #1', initiativeMod: 2 },
    ])
  })

  it('deve excluir pelo id do personagem e do NPC temporário', async () => {
    prismaMock.roomCharacter.findMany.mockResolvedValue([
      { ...pj, characterId: '22222222-2222-4222-8222-222222222222' },
      npc,
    ])
    prismaMock.roomTempNpc.findMany.mockResolvedValue([
      { ...goblin, id: '33333333-3333-4333-8333-333333333333' },
    ])

    await abrirIniciativa(MESTRE, 'r-1', {
      excluir: ['22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'],
    })

    const { data } = prismaMock.initiative.create.mock.calls[0][0]
    expect(data.participants.create.map((p: { label: string }) => p.label)).toEqual(['Vilão'])
  })
})

describe('abrirIniciativa — recusas', () => {
  it('deve recusar quando a sala não está em lobby', async () => {
    prismaMock.room.findUnique.mockResolvedValue({
      id: 'r-1',
      status: 'paused',
      masterUserId: MESTRE,
    })

    await expect(abrirIniciativa(MESTRE, 'r-1', {})).rejects.toThrow(ConflictError)
    expect(prismaMock.initiative.create).not.toHaveBeenCalled()
  })

  it('deve recusar quando ninguém entra', async () => {
    prismaMock.roomCharacter.findMany.mockResolvedValue([])
    prismaMock.roomTempNpc.findMany.mockResolvedValue([])

    await expect(abrirIniciativa(MESTRE, 'r-1', {})).rejects.toThrow('Nenhum participante')
  })

  it('deve recusar e dizer só QUEM está ocupado em outra sala ativa', async () => {
    prismaMock.user.findMany.mockResolvedValue([{ id: 'u-jogador', name: 'Bia' }])

    const erro = await abrirIniciativa(MESTRE, 'r-1', {}).catch((e: ConflictError) => e)

    expect(erro).toBeInstanceOf(ConflictError)
    expect((erro as ConflictError).detalhes).toEqual({
      ocupados: [{ userId: 'u-jogador', nome: 'Bia' }],
    })
    expect(prismaMock.room.update).not.toHaveBeenCalled()
  })

  it('deve negar a quem não é o mestre', async () => {
    await expect(abrirIniciativa('u-outro', 'r-1', {})).rejects.toThrow(ForbiddenError)
  })
})

describe('avancarIniciativa', () => {
  it('deve recusar avançar uma iniciativa já ativa', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('active', [participante()]))

    await expect(avancarIniciativa(MESTRE, 'r-1')).rejects.toThrow(ConflictError)
  })

  it('deve abrir as rolagens: draft → rolling', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('draft', [participante()]))

    await avancarIniciativa(MESTRE, 'r-1')

    expect(prismaMock.initiative.update).toHaveBeenCalledWith({
      where: { id: 'i-1' },
      data: { status: 'rolling' },
    })
  })

  it('deve ordenar só com quem rolou e deixar de fora quem não rolou', async () => {
    const rolou = participante({ id: 'p-a', hasRolled: true, rollResult: 14 })
    const faltou = participante({ id: 'p-b' })
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('rolling', [rolou, faltou]))

    await avancarIniciativa(MESTRE, 'r-1')

    expect(prismaMock.initiativeParticipant.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['p-b'] } },
      data: { removedAt: expect.any(Date) },
    })
    expect(prismaMock.initiative.updateMany).toHaveBeenCalledWith({
      where: { roomId: 'r-1', status: 'rolling' },
      data: { status: 'ordered' },
    })
  })
})

describe('avancarIniciativa — ordenar e ativar', () => {
  it('deve recusar ordenar quando ninguém rolou', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('rolling', [participante()]))

    await expect(avancarIniciativa(MESTRE, 'r-1')).rejects.toThrow('Ninguém rolou')
  })

  it('deve recusar ativar com empate pendente', async () => {
    const a = participante({ id: 'p-a', hasRolled: true, rollResult: 15, initiativeMod: 2 })
    const b = participante({ id: 'p-b', hasRolled: true, rollResult: 15, initiativeMod: 2 })
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('ordered', [a, b]))

    await expect(avancarIniciativa(MESTRE, 'r-1')).rejects.toThrow('empate pendente')
    expect(prismaMock.initiative.update).not.toHaveBeenCalled()
  })

  it('deve ativar o combate na posição 0 quando não há empate', async () => {
    const a = participante({ id: 'p-a', hasRolled: true, rollResult: 18 })
    const b = participante({ id: 'p-b', hasRolled: true, rollResult: 9 })
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('ordered', [a, b]))

    await avancarIniciativa(MESTRE, 'r-1')

    expect(prismaMock.initiative.update).toHaveBeenCalledWith({
      where: { id: 'i-1' },
      data: {
        status: 'active',
        startedAt: expect.any(Date),
        turnStartedAt: expect.any(Date),
        currentPosition: 0,
      },
    })
  })
})

describe('cancelarIniciativa', () => {
  it.each(['draft', 'rolling', 'ordered'])(
    'deve cancelar em %s e devolver a sala ao lobby',
    async (status) => {
      prismaMock.initiative.findFirst.mockResolvedValue(iniciativa(status, [participante()]))

      await cancelarIniciativa(MESTRE, 'r-1')

      expect(prismaMock.initiative.update).toHaveBeenCalledWith({
        where: { id: 'i-1' },
        data: { status: 'cancelled' },
      })
      expect(prismaMock.room.update).toHaveBeenCalledWith({
        where: { id: 'r-1' },
        data: { status: 'lobby' },
      })
    },
  )

  it('deve recusar cancelar depois de ativa', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('active', [participante()]))

    await expect(cancelarIniciativa(MESTRE, 'r-1')).rejects.toThrow(ConflictError)
    expect(prismaMock.initiative.update).not.toHaveBeenCalled()
  })
})
