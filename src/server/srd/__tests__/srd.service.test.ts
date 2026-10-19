import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    srdSpecies: { findMany: vi.fn(), findUnique: vi.fn() },
    srdClass: { findMany: vi.fn(), findUnique: vi.fn() },
    srdSubclass: { findMany: vi.fn() },
    srdBackground: { findMany: vi.fn() },
    srdFeat: { findMany: vi.fn(), findUnique: vi.fn() },
    srdSpell: { findMany: vi.fn() },
    srdEquipment: { findMany: vi.fn() },
    srdMonster: { findMany: vi.fn() },
  },
}))

vi.mock('@/server/db/prisma', () => ({
  prisma: prismaMock,
}))

import {
  buscarClassePorSlug,
  buscarEspeciePorSlug,
  buscarFeatPorSlug,
  listarBackgrounds,
  listarClasses,
  listarEquipamentos,
  listarEspecies,
  listarFeats,
  listarMagias,
  listarMonstros,
  listarSubclassesPorClasse,
} from '@/server/srd/srd.service'

describe('Listas do wizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lista espécies com seleção mínima e ordem alfabética', async () => {
    prismaMock.srdSpecies.findMany.mockResolvedValue([{ id: '1', slug: 'dwarf', name: 'Dwarf' }])

    await listarEspecies()

    expect(prismaMock.srdSpecies.findMany).toHaveBeenCalledWith({
      select: { id: true, slug: true, name: true },
      orderBy: { name: 'asc' },
    })
  })

  it('lista classes trazendo o hit_die para o cálculo de HP', async () => {
    prismaMock.srdClass.findMany.mockResolvedValue([
      { id: '1', slug: 'barbarian', name: 'Barbarian', hitDie: 12 },
    ])

    const classes = await listarClasses()

    expect(classes[0]?.hitDie).toBe(12)
    expect(prismaMock.srdClass.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: { id: true, slug: true, name: true, hitDie: true } }),
    )
  })

  it('filtra subclasses pela classe escolhida no wizard', async () => {
    prismaMock.srdSubclass.findMany.mockResolvedValue([])

    await listarSubclassesPorClasse('classe-uuid')

    expect(prismaMock.srdSubclass.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { srdClassId: 'classe-uuid' } }),
    )
  })

  it('lista equipamentos com categoria para agrupamento da UI', async () => {
    prismaMock.srdEquipment.findMany.mockResolvedValue([
      { id: '1', slug: 'club', name: 'Club', category: 'Melee Weapons, Simple Weapons' },
    ])

    const itens = await listarEquipamentos()

    expect(itens[0]?.category).toContain('Melee Weapons')
  })
})

describe('Listagem de magias', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sem filtro: busca tudo sem where', async () => {
    prismaMock.srdSpell.findMany.mockResolvedValue([])

    await listarMagias()

    expect(prismaMock.srdSpell.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    )
  })

  it('com nível máximo: where level lte', async () => {
    prismaMock.srdSpell.findMany.mockResolvedValue([])

    await listarMagias({ nivelMaximo: 3 })

    expect(prismaMock.srdSpell.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { level: { lte: 3 } } }),
    )
  })

  it('nível máximo 0 é filtro válido (truques), não "sem filtro"', async () => {
    prismaMock.srdSpell.findMany.mockResolvedValue([])

    await listarMagias({ nivelMaximo: 0 })

    expect(prismaMock.srdSpell.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { level: { lte: 0 } } }),
    )
  })
})

describe('Listas de apoio e busca por slug', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lista monstros ordenados por CR crescente', async () => {
    prismaMock.srdMonster.findMany.mockResolvedValue([])

    await listarMonstros()

    expect(prismaMock.srdMonster.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ challengeRating: 'asc' }, { name: 'asc' }] }),
    )
  })

  it('busca por slug devolve null quando não existe', async () => {
    prismaMock.srdClass.findUnique.mockResolvedValue(null)

    await expect(buscarClassePorSlug('inexistente')).resolves.toBeNull()
    expect(prismaMock.srdClass.findUnique).toHaveBeenCalledWith({ where: { slug: 'inexistente' } })
  })

  it('busca espécie e feat pelos seus slugs', async () => {
    prismaMock.srdSpecies.findUnique.mockResolvedValue({ id: '1', slug: 'elf', name: 'Elf' })
    prismaMock.srdFeat.findUnique.mockResolvedValue({ id: '2', slug: 'alert', name: 'Alert' })

    await expect(buscarEspeciePorSlug('elf')).resolves.toMatchObject({ slug: 'elf' })
    await expect(buscarFeatPorSlug('alert')).resolves.toMatchObject({ slug: 'alert' })
    expect(prismaMock.srdSpecies.findUnique).toHaveBeenCalledWith({ where: { slug: 'elf' } })
    expect(prismaMock.srdFeat.findUnique).toHaveBeenCalledWith({ where: { slug: 'alert' } })
  })

  it('listas de backgrounds e feats usam a mesma seleção mínima', async () => {
    prismaMock.srdBackground.findMany.mockResolvedValue([])
    prismaMock.srdFeat.findMany.mockResolvedValue([])

    await listarBackgrounds()
    await listarFeats()

    expect(prismaMock.srdBackground.findMany).toHaveBeenCalledWith({
      select: { id: true, slug: true, name: true },
      orderBy: { name: 'asc' },
    })
    expect(prismaMock.srdFeat.findMany).toHaveBeenCalledWith({
      select: { id: true, slug: true, name: true },
      orderBy: { name: 'asc' },
    })
  })
})
