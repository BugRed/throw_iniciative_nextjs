import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    character: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    srdSpecies: { findUnique: vi.fn() },
    srdClass: { findUnique: vi.fn() },
    srdBackground: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}))

vi.mock('@/server/db/prisma', () => ({
  prisma: prismaMock,
}))

import { NotFoundError, ValidationError } from '@/server/http/errors'
import {
  alternarVisibilidade,
  atualizarPersonagem,
  buscarPersonagem,
  criarPersonagem,
  listarPersonagens,
} from '@/server/personagens/personagens.service'

// Regras especificadas em docs/negocio/personagens-calculos.md: stats derivam
// no server, privacidade fecha a ficha para não-donos com 404.

const ENTRADA_FIGHTER = {
  especie: 'human',
  classe: 'fighter',
  background: 'soldier',
  atributos: {
    forca: 15,
    destreza: 14,
    constituicao: 12,
    inteligencia: 8,
    sabedoria: 10,
    carisma: 8,
  },
  pericias: ['athletics'],
  magias: [],
  equipamento: ['chain-mail'],
  feats: [] as string[],
  nome: 'Bree',
  visivelAoMestre: true,
}

const FIGHTER_CRIADO = {
  id: 'p-1',
  name: 'Bree',
  level: 1,
  isNpc: false,
  isVisibleToMaster: true,
  hpMax: 11,
  hpCurrent: 11,
  armorClass: 12,
  initiativeMod: 2,
  proficiencyBonus: 2,
  species: { name: 'Human' },
  srdClass: { name: 'Fighter' },
}

const STATS_FIGHTER_NIVEL1 = {
  hpMax: 11,
  hpCurrent: 11,
  armorClass: 12,
  initiativeMod: 2,
  proficiencyBonus: 2,
}

function mockarReferenciasSrd(hitDie = 10) {
  prismaMock.srdSpecies.findUnique.mockResolvedValue({ id: 'sp-1', slug: 'human' })
  prismaMock.srdClass.findUnique.mockResolvedValue({ id: 'cl-1', slug: 'fighter', hitDie })
  prismaMock.srdBackground.findUnique.mockResolvedValue({ id: 'bg-1', slug: 'soldier' })
}

describe('criarPersonagem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.character.create.mockResolvedValue(FIGHTER_CRIADO)
    prismaMock.auditLog.create.mockResolvedValue({})
  })

  it('deve criar nível 1 com stats derivados — Fighter CON 12 → HP 11', async () => {
    mockarReferenciasSrd(10)

    const personagem = await criarPersonagem('u-1', ENTRADA_FIGHTER)

    expect(personagem).toEqual(FIGHTER_CRIADO)
    expect(prismaMock.character.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ...STATS_FIGHTER_NIVEL1,
          ownerUserId: 'u-1',
          level: 1,
          strength: 15,
          dexterity: 14,
          constitution: 12,
          isVisibleToMaster: true,
        }),
      }),
    )
  })

  it('deve incluir o bônus de proficiência na iniciativa quando a feat Alert vem no submit', async () => {
    mockarReferenciasSrd(10)

    await criarPersonagem('u-1', { ...ENTRADA_FIGHTER, feats: ['alert'] })

    expect(prismaMock.character.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ initiativeMod: 4 }),
      }),
    )
  })

  it('deve gravar audit character_created vinculado ao dono', async () => {
    mockarReferenciasSrd(10)

    await criarPersonagem('u-1', ENTRADA_FIGHTER)

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: { action: 'character_created', entityId: 'p-1', userId: 'u-1' },
    })
  })
})

describe('criarPersonagem — rejeições', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.character.create.mockResolvedValue(FIGHTER_CRIADO)
  })

  it('deve rejeitar entrada inválida antes de tocar o banco', async () => {
    await expect(
      criarPersonagem('u-1', {
        ...ENTRADA_FIGHTER,
        atributos: { ...ENTRADA_FIGHTER.atributos, forca: 16 },
      }),
    ).rejects.toBeInstanceOf(ValidationError)
    expect(prismaMock.character.create).not.toHaveBeenCalled()
  })

  it('deve rejeitar espécie que não existe no SRD sem criar a ficha', async () => {
    prismaMock.srdSpecies.findUnique.mockResolvedValue(null)

    await expect(criarPersonagem('u-1', ENTRADA_FIGHTER)).rejects.toThrow(
      "Espécie 'human' não existe no SRD.",
    )
    expect(prismaMock.character.create).not.toHaveBeenCalled()
  })
})

describe('listarPersonagens', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve listar apenas as fichas do dono, da mais recente para a mais antiga', async () => {
    prismaMock.character.findMany.mockResolvedValue([FIGHTER_CRIADO])

    const lista = await listarPersonagens('u-1')

    expect(lista).toEqual([FIGHTER_CRIADO])
    expect(prismaMock.character.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ownerUserId: 'u-1' },
        orderBy: { createdAt: 'desc' },
      }),
    )
  })
})

describe('buscarPersonagem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const FICHA_COMPLETA = {
    ...FIGHTER_CRIADO,
    ownerUserId: 'u-1',
    species: { name: 'Human' },
    srdClass: { name: 'Fighter', hitDie: 10 },
    subclass: null,
    background: { name: 'Soldier' },
  }

  it('deve retornar a ficha completa para o dono mesmo fechada ao mestre', async () => {
    prismaMock.character.findUnique.mockResolvedValue({
      ...FICHA_COMPLETA,
      isVisibleToMaster: false,
    })

    const ficha = await buscarPersonagem('p-1', 'u-1')

    expect(ficha.isVisibleToMaster).toBe(false)
  })

  it('deve retornar ficha aberta para quem não é o dono', async () => {
    prismaMock.character.findUnique.mockResolvedValue(FICHA_COMPLETA)

    await expect(buscarPersonagem('p-1', 'u-2')).resolves.toBeDefined()
  })

  it('deve devolver 404 para não-dono quando a ficha está fechada (não vaza existência)', async () => {
    prismaMock.character.findUnique.mockResolvedValue({
      ...FICHA_COMPLETA,
      isVisibleToMaster: false,
    })

    await expect(buscarPersonagem('p-1', 'u-2')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('deve devolver 404 para ficha inexistente', async () => {
    prismaMock.character.findUnique.mockResolvedValue(null)

    await expect(buscarPersonagem('p-404', 'u-1')).rejects.toBeInstanceOf(NotFoundError)
  })
})

const FICHA_ATUAL = {
  id: 'p-1',
  ownerUserId: 'u-1',
  level: 1,
  constitution: 12,
  dexterity: 14,
  hpCurrent: 11,
  feats: [],
  srdClass: { hitDie: 10 },
}

describe('atualizarPersonagem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve recusar edição de quem não é o dono com 404', async () => {
    prismaMock.character.findUnique.mockResolvedValue(FICHA_ATUAL)

    await expect(atualizarPersonagem('u-2', 'p-1', { nome: 'Outro' })).rejects.toBeInstanceOf(
      NotFoundError,
    )
    expect(prismaMock.character.update).not.toHaveBeenCalled()
  })

  it('deve recusar edição inválida antes de buscar a ficha atual', async () => {
    await expect(atualizarPersonagem('u-1', 'p-1', { nivel: 0 })).rejects.toBeInstanceOf(
      ValidationError,
    )
    expect(prismaMock.character.findUnique).not.toHaveBeenCalled()
  })
})

describe('atualizarPersonagem — recálculo de stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve recalcular HP e proficiência ao subir de nível (d10 CON 12: 1→3 dá 25)', async () => {
    prismaMock.character.findUnique.mockResolvedValue(FICHA_ATUAL)
    prismaMock.character.update.mockResolvedValue(FIGHTER_CRIADO)

    await atualizarPersonagem('u-1', 'p-1', { nivel: 3 })

    expect(prismaMock.character.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          level: 3,
          hpMax: 25,
          hpCurrent: 11,
          proficiencyBonus: 2,
          initiativeMod: 2,
        }),
      }),
    )
  })
})

describe('atualizarPersonagem — limites', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve nunca matar por edição: hp_current limitado ao novo máximo ao descer de nível', async () => {
    prismaMock.character.findUnique.mockResolvedValue({
      ...FICHA_ATUAL,
      level: 3,
      hpCurrent: 20,
    })
    prismaMock.character.update.mockResolvedValue(FIGHTER_CRIADO)

    await atualizarPersonagem('u-1', 'p-1', { nivel: 1 })

    expect(prismaMock.character.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ level: 1, hpMax: 11, hpCurrent: 11 }),
      }),
    )
  })

  it('deve recalcular iniciativa quando feats passam a incluir Alert sem mudar nível', async () => {
    prismaMock.character.findUnique.mockResolvedValue(FICHA_ATUAL)
    prismaMock.character.update.mockResolvedValue(FIGHTER_CRIADO)

    await atualizarPersonagem('u-1', 'p-1', { feats: ['alert'] })

    expect(prismaMock.character.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ feats: ['alert'], initiativeMod: 4 }),
      }),
    )
  })

  it('deve gravar audit character_updated', async () => {
    prismaMock.character.findUnique.mockResolvedValue(FICHA_ATUAL)
    prismaMock.character.update.mockResolvedValue(FIGHTER_CRIADO)

    await atualizarPersonagem('u-1', 'p-1', { nome: 'Bree II' })

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: { action: 'character_updated', entityId: 'p-1', userId: 'u-1' },
    })
  })
})

describe('alternarVisibilidade', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve inverter is_visible_to_master do dono', async () => {
    prismaMock.character.findUnique.mockResolvedValue({
      id: 'p-1',
      ownerUserId: 'u-1',
      isVisibleToMaster: true,
    })
    prismaMock.character.update.mockResolvedValue({ ...FIGHTER_CRIADO, isVisibleToMaster: false })

    const personagem = await alternarVisibilidade('u-1', 'p-1')

    expect(personagem.isVisibleToMaster).toBe(false)
    expect(prismaMock.character.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isVisibleToMaster: false } }),
    )
  })

  it('deve devolver 404 para quem não é o dono ou ficha inexistente', async () => {
    prismaMock.character.findUnique.mockResolvedValue(null)

    await expect(alternarVisibilidade('u-1', 'p-404')).rejects.toBeInstanceOf(NotFoundError)
  })
})
