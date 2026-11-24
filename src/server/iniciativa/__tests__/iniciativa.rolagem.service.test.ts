import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock, dado } = vi.hoisted(() => ({
  dado: { rolarD20: vi.fn(), rollDie: vi.fn() },
  prismaMock: {
    room: { findUnique: vi.fn() },
    roomMember: { findUnique: vi.fn() },
    initiative: { findFirst: vi.fn() },
    initiativeParticipant: { update: vi.fn(), findMany: vi.fn() },
    auditRoll: { create: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn(async (arg: unknown) =>
      Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: unknown) => unknown)(prismaMock),
    ),
  },
}))

vi.mock('@/server/db/prisma', () => ({ prisma: prismaMock }))
vi.mock('@/server/iniciativa/iniciativa.dado', () => dado)

import { ConflictError, ForbiddenError, TooManyRequestsError } from '@/server/http/errors'
import { iniciativa, participante } from '@/server/iniciativa/__fixtures__/participantes'
import { limiteRolagem } from '@/server/iniciativa/iniciativa.limite'
import {
  rolarDesempate,
  rolarIniciativaDosNpcs,
  rolarMinhaIniciativa,
  usarInspiracao,
} from '@/server/iniciativa/iniciativa.rolagem.service'

const MESTRE = 'u-mestre'
const JOGADOR = 'u-jogador'
const npc = (id: string, extra = {}) =>
  participante({
    id,
    userIdResponsible: null,
    characterId: null,
    tempNpcId: id,
    label: id,
    ...extra,
  })

function logarComo(userId: string): void {
  prismaMock.roomMember.findUnique.mockResolvedValue({
    status: 'active',
    room: { status: 'active', masterUserId: MESTRE },
    userId,
  })
  prismaMock.room.findUnique.mockResolvedValue({
    id: 'r-1',
    status: 'active',
    masterUserId: MESTRE,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(limiteRolagem, 'consumir').mockImplementation(() => undefined)
  logarComo(JOGADOR)
})

describe('rolarMinhaIniciativa', () => {
  beforeEach(() => {
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('rolling', [participante()]))
    dado.rolarD20.mockReturnValue({ resultado: 12, descartado: null })
  })

  it('deve gravar o total (d20 + mod congelado) e auditar a rolagem', async () => {
    await rolarMinhaIniciativa(JOGADOR, 'r-1')

    expect(prismaMock.initiativeParticipant.update).toHaveBeenCalledWith({
      where: { id: 'p-1' },
      data: { hasRolled: true, rollResult: 14 },
    })
    expect(prismaMock.auditRoll.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: JOGADOR,
          kind: 'initiative',
          result: 12,
          modifier: 2,
          total: 14,
          discardedResult: null,
        }),
      ],
    })
  })

  it('deve rolar com o modo marcado pelo mestre e auditar o dado descartado', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(
      iniciativa('rolling', [participante({ rollMode: 'advantage' })]),
    )
    dado.rolarD20.mockReturnValue({ resultado: 17, descartado: 5 })

    await rolarMinhaIniciativa(JOGADOR, 'r-1')

    expect(dado.rolarD20).toHaveBeenCalledWith('advantage')
    expect(prismaMock.auditRoll.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ result: 17, discardedResult: 5 })],
    })
  })
})

describe('rolarMinhaIniciativa — recusas', () => {
  beforeEach(() => {
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('rolling', [participante()]))
  })

  it('deve recusar rolar duas vezes', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(
      iniciativa('rolling', [participante({ hasRolled: true, rollResult: 9 })]),
    )

    await expect(rolarMinhaIniciativa(JOGADOR, 'r-1')).rejects.toThrow('Você já rolou')
    expect(prismaMock.auditRoll.createMany).not.toHaveBeenCalled()
  })

  it('deve negar a quem não participa do combate', async () => {
    logarComo('u-outro')

    await expect(rolarMinhaIniciativa('u-outro', 'r-1')).rejects.toThrow(ForbiddenError)
  })

  it('deve recusar fora da fase de rolagens', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('draft', [participante()]))

    await expect(rolarMinhaIniciativa(JOGADOR, 'r-1')).rejects.toThrow(ConflictError)
  })

  it('deve responder 429 sem gravar nada ao estourar o limite', async () => {
    vi.spyOn(limiteRolagem, 'consumir').mockImplementation(() => {
      throw new TooManyRequestsError()
    })

    await expect(rolarMinhaIniciativa(JOGADOR, 'r-1')).rejects.toThrow(TooManyRequestsError)
    expect(prismaMock.initiativeParticipant.update).not.toHaveBeenCalled()
  })
})

describe('rolarIniciativaDosNpcs', () => {
  beforeEach(() => {
    logarComo(MESTRE)
    dado.rolarD20
      .mockReturnValueOnce({ resultado: 4, descartado: null })
      .mockReturnValueOnce({ resultado: 19, descartado: null })
  })

  it('deve rolar um d20 independente por NPC e não rolar por jogador', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(
      iniciativa('rolling', [npc('n-1'), npc('n-2'), participante()]),
    )

    await rolarIniciativaDosNpcs(MESTRE, 'r-1')

    expect(dado.rolarD20).toHaveBeenCalledTimes(2)
    expect(prismaMock.initiativeParticipant.update).toHaveBeenCalledTimes(2)
    expect(prismaMock.initiativeParticipant.update).toHaveBeenCalledWith({
      where: { id: 'n-1' },
      data: { hasRolled: true, rollResult: 6 },
    })
    expect(prismaMock.initiativeParticipant.update).toHaveBeenCalledWith({
      where: { id: 'n-2' },
      data: { hasRolled: true, rollResult: 21 },
    })
  })

  it('deve contar uma ação por NPC no limite', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(
      iniciativa('rolling', [npc('n-1'), npc('n-2')]),
    )

    await rolarIniciativaDosNpcs(MESTRE, 'r-1')

    expect(limiteRolagem.consumir).toHaveBeenCalledWith(MESTRE, 2)
  })

  it('deve recusar quando nenhum NPC tem rolagem pendente', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('rolling', [participante()]))

    await expect(rolarIniciativaDosNpcs(MESTRE, 'r-1')).rejects.toThrow('Nenhum NPC')
  })

  it('deve negar a quem não é o mestre', async () => {
    await expect(rolarIniciativaDosNpcs(JOGADOR, 'r-1')).rejects.toThrow(ForbiddenError)
  })
})

describe('usarInspiracao', () => {
  const rolado = participante({
    hasRolled: true,
    rollResult: 9,
    initiativeMod: 2,
    hasInspiration: true,
  })

  it('deve re-rolar, consumir a Inspiração e auditar o dado trocado', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('rolling', [rolado]))
    dado.rollDie.mockReturnValue(16)

    await usarInspiracao(JOGADOR, 'r-1')

    expect(prismaMock.initiativeParticipant.update).toHaveBeenCalledWith({
      where: { id: 'p-1' },
      data: { hasInspiration: false, rollResult: 18 },
    })
    expect(prismaMock.auditRoll.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        kind: 'inspiration',
        result: 16,
        discardedResult: 7,
        total: 18,
      }),
    })
  })

  it('deve recusar sem Inspiração', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(
      iniciativa('rolling', [{ ...rolado, hasInspiration: false }]),
    )

    await expect(usarInspiracao(JOGADOR, 'r-1')).rejects.toThrow('não tem Inspiração')
  })

  it('deve recusar antes de rolar', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(
      iniciativa('rolling', [participante({ hasInspiration: true })]),
    )

    await expect(usarInspiracao(JOGADOR, 'r-1')).rejects.toThrow('Role antes')
  })
})

describe('rolarDesempate', () => {
  const empatados = [
    participante({ id: 'p-a', hasRolled: true, rollResult: 15, initiativeMod: 2 }),
    participante({
      id: 'p-b',
      hasRolled: true,
      rollResult: 15,
      initiativeMod: 2,
      userIdResponsible: 'u-outro',
    }),
    npc('n-1', { hasRolled: true, rollResult: 15, initiativeMod: 2 }),
  ]

  beforeEach(() => {
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('ordered', empatados))
    prismaMock.initiativeParticipant.findMany.mockResolvedValue(empatados)
    dado.rollDie.mockReturnValue(11)
  })

  it('deve rolar só o desempate do próprio PJ, sem somar modificador', async () => {
    await rolarDesempate(JOGADOR, 'r-1')

    expect(prismaMock.initiativeParticipant.update).toHaveBeenCalledWith({
      where: { id: 'p-a' },
      data: { tiebreakRolls: { push: 11 } },
    })
    expect(prismaMock.auditRoll.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ kind: 'tiebreak', result: 11, modifier: 0, total: 11 })],
    })
  })

  it('deve deixar o mestre rolar os NPCs empatados', async () => {
    logarComo(MESTRE)

    await rolarDesempate(MESTRE, 'r-1')

    expect(prismaMock.initiativeParticipant.update).toHaveBeenCalledWith({
      where: { id: 'n-1' },
      data: { tiebreakRolls: { push: 11 } },
    })
  })

  it('deve recusar quem não tem desempate pendente', async () => {
    logarComo('u-sem-pj')

    await expect(rolarDesempate('u-sem-pj', 'r-1')).rejects.toThrow('não tem desempate')
  })
})
