import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    roomMember: { findUnique: vi.fn() },
    roomCharacter: { findMany: vi.fn() },
    roomTempNpc: { findMany: vi.fn() },
    initiative: { findFirst: vi.fn() },
  },
}))

vi.mock('@/server/db/prisma', () => ({ prisma: prismaMock }))

import { NotFoundError } from '@/server/http/errors'
import { iniciativa, participante } from '@/server/iniciativa/__fixtures__/participantes'
import { lerPainelIniciativa } from '@/server/iniciativa/iniciativa.leitura.service'

const MESTRE = 'u-mestre'
const JOGADOR = 'u-jogador'

function membro(userId: string, statusSala = 'active') {
  return {
    userId,
    status: 'active',
    role: userId === MESTRE ? 'master' : 'player',
    room: { id: 'r-1', status: statusSala, masterUserId: MESTRE },
  }
}

// a (PJ do JOGADOR, 1º) · b (NPC, 2º) · c (PJ de outro, 3º) · x (removido).
const ordenada = () => [
  participante({ id: 'c', characterId: 'c', userIdResponsible: 'u-outro', position: 2 }),
  participante({ id: 'a', characterId: 'a', position: 0, rollResult: 18, hasRolled: true }),
  participante({ id: 'b', characterId: null, userIdResponsible: null, position: 1 }),
  participante({ id: 'x', characterId: 'x', position: null, removedAt: new Date() }),
]

beforeEach(() => {
  vi.clearAllMocks()
  prismaMock.roomMember.findUnique.mockResolvedValue(membro(JOGADOR))
  prismaMock.initiative.findFirst.mockResolvedValue(null)
  prismaMock.roomCharacter.findMany.mockResolvedValue([])
  prismaMock.roomTempNpc.findMany.mockResolvedValue([])
})

describe('lerPainelIniciativa — fila', () => {
  it('deve mostrar a fila pela posição, sem os removidos, com os totais (mesa aberta)', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('active', ordenada()))

    const { atual } = await lerPainelIniciativa(JOGADOR, 'r-1')

    expect(atual?.participantes.map((p) => p.id)).toEqual(['a', 'b', 'c'])
    expect(atual?.participantes[0]).toMatchObject({ total: 18, tipo: 'pj', ehMeu: true })
    expect(atual?.participantes[1]).toMatchObject({ tipo: 'npc', ehMeu: false })
  })

  it('deve apontar a vez e o próximo, voltando ao topo depois do último', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(
      iniciativa('active', ordenada(), { currentPosition: 2, round: 3 }),
    )

    const { atual } = await lerPainelIniciativa(JOGADOR, 'r-1')

    expect(atual).toMatchObject({ daVezId: 'c', proximoId: 'a', rodada: 3 })
  })

  it('não deve ter próximo quando só há um na fila', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(
      iniciativa('active', [participante({ id: 'a', position: 0 })]),
    )

    const { atual } = await lerPainelIniciativa(JOGADOR, 'r-1')

    expect(atual).toMatchObject({ daVezId: 'a', proximoId: null })
  })

  it('não deve ter vez antes de o combate começar', async () => {
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('rolling', ordenada()))

    const { atual } = await lerPainelIniciativa(JOGADOR, 'r-1')

    expect(atual).toMatchObject({ daVezId: null, proximoId: null })
  })
})

describe('lerPainelIniciativa — papel, pausa e desempate', () => {
  it('deve dar ao mestre os NPCs como "seus"', async () => {
    prismaMock.roomMember.findUnique.mockResolvedValue(membro(MESTRE))
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('active', ordenada()))

    const { atual, ehMestre } = await lerPainelIniciativa(MESTRE, 'r-1')

    expect(ehMestre).toBe(true)
    expect(atual?.participantes.filter((p) => p.ehMeu).map((p) => p.id)).toEqual(['b'])
  })

  it('deve refletir a sala pausada', async () => {
    prismaMock.roomMember.findUnique.mockResolvedValue(membro(JOGADOR, 'paused'))
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('active', ordenada()))

    const { atual } = await lerPainelIniciativa(JOGADOR, 'r-1')

    expect(atual?.pausada).toBe(true)
  })

  it('deve marcar quem ainda deve o desempate em `ordered`', async () => {
    const empatados = [
      participante({ id: 'a', hasRolled: true, rollResult: 15, initiativeMod: 2 }),
      participante({ id: 'b', hasRolled: true, rollResult: 15, initiativeMod: 2 }),
      participante({ id: 'c', hasRolled: true, rollResult: 9 }),
    ]
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('ordered', empatados))

    const { atual } = await lerPainelIniciativa(JOGADOR, 'r-1')

    expect(atual?.participantes.filter((p) => p.desempatePendente).map((p) => p.id)).toEqual([
      'a',
      'b',
    ])
  })
})

describe('lerPainelIniciativa — candidatos e acesso', () => {
  beforeEach(() => {
    prismaMock.roomMember.findUnique.mockResolvedValue(membro(MESTRE))
    prismaMock.roomCharacter.findMany.mockResolvedValue([
      { characterId: 'a', character: { name: 'Aria' } },
      { characterId: 'novo', character: { name: 'Bran' } },
    ])
    prismaMock.roomTempNpc.findMany.mockResolvedValue([{ id: 't-1', label: 'Goblin 1' }])
  })

  it('deve oferecer na abertura todos os elegíveis da sala', async () => {
    const { candidatos } = await lerPainelIniciativa(MESTRE, 'r-1')

    expect(candidatos).toEqual([
      { id: 'a', rotulo: 'Aria', campo: 'characterId' },
      { id: 'novo', rotulo: 'Bran', campo: 'characterId' },
      { id: 't-1', rotulo: 'Goblin 1', campo: 'tempNpcId' },
    ])
  })

  it('não deve oferecer no meio quem já esteve no combate, nem o removido', async () => {
    const fila = [
      participante({ id: 'p-a', characterId: 'a' }),
      participante({ id: 'p-t', characterId: null, tempNpcId: 't-1', removedAt: new Date() }),
    ]
    prismaMock.initiative.findFirst.mockResolvedValue(iniciativa('active', fila))

    const { candidatos } = await lerPainelIniciativa(MESTRE, 'r-1')

    expect(candidatos.map((c) => c.id)).toEqual(['novo'])
  })

  it('não deve dar candidatos ao jogador, nem consultá-los', async () => {
    prismaMock.roomMember.findUnique.mockResolvedValue(membro(JOGADOR))

    const { candidatos } = await lerPainelIniciativa(JOGADOR, 'r-1')

    expect(candidatos).toEqual([])
    expect(prismaMock.roomCharacter.findMany).not.toHaveBeenCalled()
  })

  it('deve tratar quem não é membro como sala inexistente', async () => {
    prismaMock.roomMember.findUnique.mockResolvedValue(null)

    await expect(lerPainelIniciativa('u-estranho', 'r-1')).rejects.toThrow(NotFoundError)
  })
})
