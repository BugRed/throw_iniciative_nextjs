import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    room: { findUnique: vi.fn() },
    roomCharacter: { findUnique: vi.fn(), update: vi.fn() },
    initiative: { findFirst: vi.fn(), update: vi.fn() },
    initiativeParticipant: { update: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(async (arg: unknown) =>
      Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: unknown) => unknown)(prismaMock),
    ),
  },
}))

vi.mock('@/server/db/prisma', () => ({ prisma: prismaMock }))

import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/server/http/errors'
import { iniciativa, participante } from '@/server/iniciativa/__fixtures__/participantes'
import {
  concederInspiracao,
  marcarModoDeRolagem,
  marcarMorteDoPersonagem,
  removerParticipante,
} from '@/server/iniciativa/iniciativa.mesa.service'

const MESTRE = 'u-mestre'
const CHAR = '11111111-1111-4111-8111-111111111111'
const npc = participante({
  id: 'n-1',
  userIdResponsible: null,
  characterId: null,
  tempNpcId: 't-1',
})

const ordenada = (atual: number, status = 'active') =>
  iniciativa(
    status,
    ['a', 'b', 'c'].map((id, i) =>
      participante({
        id,
        characterId: id === 'b' ? CHAR : id,
        hasRolled: true,
        rollResult: 20 - i,
        position: i,
      }),
    ),
    { currentPosition: atual },
  )

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.room.findUnique.mockResolvedValue({
    id: 'r-1',
    status: 'active',
    masterUserId: MESTRE,
  })
})

describe('marcarModoDeRolagem', () => {
  beforeEach(() =>
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('rolling', [participante()])),
  )

  it('deve marcar vantagem antes de o participante rolar', async () => {
    await marcarModoDeRolagem(MESTRE, 'r-1', 'p-1', 'advantage')

    expect(prismaMock.initiativeParticipant.update).toHaveBeenCalledWith({
      where: { id: 'p-1' },
      data: { rollMode: 'advantage' },
    })
  })

  it('deve recusar modo inválido', async () => {
    await expect(marcarModoDeRolagem(MESTRE, 'r-1', 'p-1', 'super')).rejects.toThrow(
      ValidationError,
    )
  })

  it('deve recusar depois de o participante rolar', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(
      iniciativa('rolling', [participante({ hasRolled: true })]),
    )

    await expect(marcarModoDeRolagem(MESTRE, 'r-1', 'p-1', 'advantage')).rejects.toThrow(
      ConflictError,
    )
  })

  it('deve negar a quem não é o mestre', async () => {
    await expect(marcarModoDeRolagem('u-x', 'r-1', 'p-1', 'normal')).rejects.toThrow(ForbiddenError)
  })
})

describe('concederInspiracao', () => {
  it('deve conceder a um PJ (binária: repetir não soma)', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(
      iniciativa('rolling', [participante({ hasInspiration: true })]),
    )

    await concederInspiracao(MESTRE, 'r-1', 'p-1')

    expect(prismaMock.initiativeParticipant.update).toHaveBeenCalledWith({
      where: { id: 'p-1' },
      data: { hasInspiration: true },
    })
  })

  it('deve recusar conceder a NPC', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('rolling', [npc]))

    await expect(concederInspiracao(MESTRE, 'r-1', 'n-1')).rejects.toThrow(
      'Só personagem de jogador',
    )
  })

  it('deve recusar participante que não está no combate', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('rolling', [participante()]))

    await expect(concederInspiracao(MESTRE, 'r-1', 'p-x')).rejects.toThrow(NotFoundError)
  })
})

describe('removerParticipante', () => {
  it('deve marcar removedAt sem apagar e reposicionar os que ficam', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(ordenada(0, 'ordered'))

    await removerParticipante(MESTRE, 'r-1', 'b')

    expect(prismaMock.initiativeParticipant.update).toHaveBeenCalledWith({
      where: { id: 'b' },
      data: { removedAt: expect.any(Date), position: null },
    })
    expect(prismaMock.initiativeParticipant.update).toHaveBeenCalledWith({
      where: { id: 'c' },
      data: { position: 1 },
    })
  })

  it('deve passar a vez ao próximo quando remove quem estava na vez', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(ordenada(1))

    await removerParticipante(MESTRE, 'r-1', 'b')

    expect(prismaMock.initiative.update).toHaveBeenCalledWith({
      where: { id: 'i-1' },
      data: { currentPosition: 1, turnStartedAt: expect.any(Date) },
    })
  })

  it('deve recuar a posição atual quando remove alguém que já jogou', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(ordenada(2))

    await removerParticipante(MESTRE, 'r-1', 'a')

    expect(prismaMock.initiative.update).toHaveBeenCalledWith({
      where: { id: 'i-1' },
      data: { currentPosition: 1 },
    })
  })
})

describe('removerParticipante — rodada e entrantes', () => {
  it('deve voltar ao início e avançar a rodada quando remove o último que estava na vez', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(ordenada(2))

    await removerParticipante(MESTRE, 'r-1', 'c')

    expect(prismaMock.initiative.update).toHaveBeenCalledWith({
      where: { id: 'i-1' },
      data: { currentPosition: 0, round: { increment: 1 }, turnStartedAt: expect.any(Date) },
    })
    expect(prismaMock.initiativeParticipant.updateMany).toHaveBeenCalledWith({
      where: { initiativeId: 'i-1' },
      data: { hasPlayed: false },
    })
  })

  it('não deve avançar a rodada quando remove o último que já tinha jogado', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(ordenada(1))

    await removerParticipante(MESTRE, 'r-1', 'c')

    expect(prismaMock.initiative.update).toHaveBeenCalledWith({
      where: { id: 'i-1' },
      data: { currentPosition: 1 },
    })
    expect(prismaMock.initiativeParticipant.updateMany).not.toHaveBeenCalled()
  })

  it('deve manter quem entrou sem rolar depois dos que rolaram ao reposicionar', async () => {
    const base = ordenada(0)
    const anexado = participante({ id: 'z', characterId: 'z', addedMode: 'append', position: 3 })
    prismaMock.initiative.findFirst.mockResolvedValue({
      ...base,
      participants: [...base.participants, anexado],
    })

    await removerParticipante(MESTRE, 'r-1', 'b')

    expect(prismaMock.initiativeParticipant.update).toHaveBeenCalledWith({
      where: { id: 'z' },
      data: { position: 2 },
    })
  })
})

describe('marcarMorteDoPersonagem', () => {
  const vivo = { isNpc: false, diedAt: null }

  beforeEach(() => prismaMock.roomCharacter.findUnique.mockResolvedValue(vivo))

  it('deve gravar died_at, zerar o PJ ativo e tirar da ordem', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(ordenada(0))

    await marcarMorteDoPersonagem(MESTRE, 'r-1', CHAR)

    expect(prismaMock.roomCharacter.update).toHaveBeenCalledWith({
      where: { roomId_characterId: { roomId: 'r-1', characterId: CHAR } },
      data: { diedAt: expect.any(Date), activeForUserId: null },
    })
    expect(prismaMock.initiativeParticipant.update).toHaveBeenCalledWith({
      where: { id: 'b' },
      data: { removedAt: expect.any(Date), position: null },
    })
  })

  it('deve marcar a morte mesmo sem combate em andamento', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(null)

    await marcarMorteDoPersonagem(MESTRE, 'r-1', CHAR)

    expect(prismaMock.roomCharacter.update).toHaveBeenCalled()
    expect(prismaMock.initiativeParticipant.update).not.toHaveBeenCalled()
  })

  it.each([
    ['NPC', { isNpc: true, diedAt: null }],
    ['já morto', { isNpc: false, diedAt: new Date() }],
    ['sem vínculo', null],
  ])('deve recusar quando é %s', async (_nome, vinculo) => {
    prismaMock.roomCharacter.findUnique.mockResolvedValue(vinculo)

    await expect(marcarMorteDoPersonagem(MESTRE, 'r-1', CHAR)).rejects.toThrow(NotFoundError)
    expect(prismaMock.roomCharacter.update).not.toHaveBeenCalled()
  })

  it('deve negar a quem não é o mestre', async () => {
    await expect(marcarMorteDoPersonagem('u-x', 'r-1', CHAR)).rejects.toThrow(ForbiddenError)
  })
})
