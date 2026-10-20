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
  listarClassesParaWizard,
  listarEquipamentos,
  listarEspecies,
  listarFeats,
  listarMagias,
  listarMonstros,
  listarSubclasses,
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

describe('Subclasses para o wizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lista todas as subclasses com o slug da classe para agrupar no wizard', async () => {
    prismaMock.srdSubclass.findMany.mockResolvedValue([
      {
        id: '1',
        slug: 'champion',
        name: 'Champion',
        levelGained: 3,
        srdClass: { slug: 'fighter' },
      },
    ])

    const subclasses = await listarSubclasses()

    expect(subclasses[0]).toMatchObject({ slug: 'champion', classeSlug: 'fighter' })
    expect(prismaMock.srdSubclass.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ srdClass: { select: { slug: true } } }),
      }),
    )
  })
})

const CLASSE_FIGHTER_ESPERADA = {
  slug: 'fighter',
  name: 'Fighter',
  hitDie: 10,
  caster: false,
  pericias: {
    escolher: 2,
    opcoes: [
      { slug: 'acrobatics', name: 'Acrobatics' },
      { slug: 'athletics', name: 'Athletics' },
    ],
  },
}

describe('Classes para o wizard de criação', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const PAYLOAD_FIGHTER = {
    proficiency_choices: [
      {
        choose: 2,
        from: {
          options: [
            { item: { name: 'Skill: Acrobatics', index: 'skill-acrobatics' } },
            { item: { name: 'Skill: Athletics', index: 'skill-athletics' } },
          ],
        },
      },
    ],
  }

  it('deve limpar as perícias do payload ("Skill: Acrobatics" → "Acrobatics")', async () => {
    prismaMock.srdClass.findMany.mockResolvedValue([
      { slug: 'fighter', name: 'Fighter', hitDie: 10, payload: PAYLOAD_FIGHTER },
    ])

    const classes = await listarClassesParaWizard()

    expect(classes[0]).toEqual(CLASSE_FIGHTER_ESPERADA)
    expect(prismaMock.srdClass.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: expect.objectContaining({ payload: true }) }),
    )
  })

  it('deve marcar como caster a classe com spellcasting no payload', async () => {
    prismaMock.srdClass.findMany.mockResolvedValue([
      { slug: 'wizard', name: 'Wizard', hitDie: 6, payload: { spellcasting: { level: 1 } } },
    ])

    const classes = await listarClassesParaWizard()

    expect(classes[0]?.caster).toBe(true)
  })

  it('deve tolerar payload nulo com padrão de 2 perícias e sem caster', async () => {
    prismaMock.srdClass.findMany.mockResolvedValue([
      { slug: 'npc', name: 'NPC', hitDie: 8, payload: null },
    ])

    const classes = await listarClassesParaWizard()

    expect(classes[0]).toMatchObject({ caster: false, pericias: { escolher: 2, opcoes: [] } })
  })
})
