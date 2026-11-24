import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    srdMonster: { findUnique: vi.fn() },
    npcTemplate: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}))

vi.mock('@/server/db/prisma', () => ({ prisma: prismaMock }))

import { NotFoundError, ValidationError } from '@/server/http/errors'
import {
  buscarStatsMonstro,
  criarMolde,
  excluirMolde,
  listarMoldes,
  statsDoPayload,
} from '@/server/npcs/npcs.service'

// Regras em docs/negocio/npcs.md: respawn parte do SRD, edição vira molde do
// dono, SRD nunca é alterado.

const GOBLIN = {
  slug: 'goblin-minion',
  name: 'Goblin Minion',
  payload: { hit_points: 7, armor_class: [{ value: 12 }], dexterity: 15 },
}

describe('statsDoPayload', () => {
  it('deve extrair PV, CA e iniciativa = mod(DES) do payload do SRD', () => {
    expect(statsDoPayload(GOBLIN.payload)).toEqual({ hpMax: 7, armorClass: 12, initiativeMod: 2 })
  })

  it('deve cair em 1 PV, CA 10 e iniciativa 0 quando o payload não é legível', () => {
    expect(statsDoPayload({ armor_class: 'x' })).toEqual({
      hpMax: 1,
      armorClass: 10,
      initiativeMod: 0,
    })
    expect(statsDoPayload(null)).toEqual({ hpMax: 1, armorClass: 10, initiativeMod: 0 })
  })

  it('deve aceitar CA numérica simples', () => {
    expect(statsDoPayload({ armor_class: 15 }).armorClass).toBe(15)
  })
})

describe('buscarStatsMonstro', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deve devolver os stats do monstro', async () => {
    prismaMock.srdMonster.findUnique.mockResolvedValue(GOBLIN)

    expect(await buscarStatsMonstro('goblin-minion')).toEqual({
      slug: 'goblin-minion',
      nome: 'Goblin Minion',
      hpMax: 7,
      armorClass: 12,
      initiativeMod: 2,
    })
  })

  it('deve devolver 404 para monstro inexistente', async () => {
    prismaMock.srdMonster.findUnique.mockResolvedValue(null)

    await expect(buscarStatsMonstro('x')).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('criarMolde', () => {
  const ENTRADA = { nome: 'Goblin forte', hpMax: 12, armorClass: 13, initiativeMod: 2 }

  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.npcTemplate.create.mockResolvedValue({ id: 'm-1' })
    prismaMock.auditLog.create.mockResolvedValue({})
  })

  it('deve gravar o molde do dono com os valores editados e o stat block do SRD', async () => {
    prismaMock.srdMonster.findUnique.mockResolvedValue(GOBLIN)

    await criarMolde('u-1', { ...ENTRADA, monstroSlug: 'goblin-minion' })

    expect(prismaMock.npcTemplate.create).toHaveBeenCalledWith({
      data: {
        ownerUserId: 'u-1',
        name: 'Goblin forte',
        hpMax: 12,
        hpCurrent: 12,
        armorClass: 13,
        initiativeMod: 2,
        statblock: GOBLIN.payload,
      },
    })
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: { action: 'npc_template_created', entityId: 'm-1', userId: 'u-1' },
    })
  })

  it('deve criar molde do zero com statblock vazio, sem consultar o SRD', async () => {
    await criarMolde('u-1', ENTRADA)

    expect(prismaMock.srdMonster.findUnique).not.toHaveBeenCalled()
    expect(prismaMock.npcTemplate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ statblock: {} }),
    })
  })

  it('deve rejeitar PV menor que 1 e nome vazio', async () => {
    await expect(criarMolde('u-1', { ...ENTRADA, hpMax: 0 })).rejects.toBeInstanceOf(
      ValidationError,
    )
    await expect(criarMolde('u-1', { ...ENTRADA, nome: '  ' })).rejects.toBeInstanceOf(
      ValidationError,
    )
    expect(prismaMock.npcTemplate.create).not.toHaveBeenCalled()
  })

  it('deve devolver 404 quando o monstro informado não existe', async () => {
    prismaMock.srdMonster.findUnique.mockResolvedValue(null)

    await expect(criarMolde('u-1', { ...ENTRADA, monstroSlug: 'x' })).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })
})

describe('listarMoldes / excluirMolde', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.auditLog.create.mockResolvedValue({})
  })

  it('deve listar só os moldes do dono', async () => {
    prismaMock.npcTemplate.findMany.mockResolvedValue([])

    await listarMoldes('u-1')

    expect(prismaMock.npcTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerUserId: 'u-1' } }),
    )
  })

  it('deve excluir o molde do dono', async () => {
    prismaMock.npcTemplate.findUnique.mockResolvedValue({ id: 'm-1', ownerUserId: 'u-1' })

    await excluirMolde('u-1', 'm-1')

    expect(prismaMock.npcTemplate.delete).toHaveBeenCalledWith({ where: { id: 'm-1' } })
  })

  it('deve devolver 404 para molde de outro usuário, sem apagar', async () => {
    prismaMock.npcTemplate.findUnique.mockResolvedValue({ id: 'm-1', ownerUserId: 'u-2' })

    await expect(excluirMolde('u-1', 'm-1')).rejects.toBeInstanceOf(NotFoundError)
    expect(prismaMock.npcTemplate.delete).not.toHaveBeenCalled()
  })
})
