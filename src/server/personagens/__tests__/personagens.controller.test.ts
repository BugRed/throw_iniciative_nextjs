import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSessionMock, serviceMock, srdMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  serviceMock: {
    criarPersonagem: vi.fn(),
    listarPersonagens: vi.fn(),
    buscarPersonagem: vi.fn(),
    atualizarPersonagem: vi.fn(),
    alternarVisibilidade: vi.fn(),
  },
  srdMock: {
    listarEspecies: vi.fn(),
    listarClassesParaWizard: vi.fn(),
    listarSubclasses: vi.fn(),
    listarBackgrounds: vi.fn(),
    listarMagias: vi.fn(),
    listarEquipamentos: vi.fn(),
  },
}))

vi.mock('@/server/auth/session', () => ({
  getSession: getSessionMock,
}))
vi.mock('@/server/personagens/personagens.service', () => serviceMock)
vi.mock('@/server/srd/srd.service', () => srdMock)

import { AppError } from '@/server/http/errors'
import {
  controlarBusca,
  controlarCriacao,
  controlarDadosWizard,
  controlarEdicao,
  controlarListagem,
  controlarToggleVisibilidade,
} from '@/server/personagens/personagens.controller'

// Orquestração: sem sessão é 401; com sessão o service recebe o id do usuário.

const SESSAO = { user: { id: 'u-1' } }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('controllers de personagem', () => {
  it('deve exigir sessão em toda operação de ficha com AppError 401 SEM_SESSAO', async () => {
    getSessionMock.mockResolvedValue(null)

    await expect(controlarCriacao({})).rejects.toMatchObject({
      status: 401,
      codigo: 'SEM_SESSAO',
    })
    await expect(controlarListagem()).rejects.toBeInstanceOf(AppError)
    await expect(controlarBusca('p-1')).rejects.toBeInstanceOf(AppError)
    await expect(controlarEdicao('p-1', {})).rejects.toBeInstanceOf(AppError)
    await expect(controlarToggleVisibilidade('p-1')).rejects.toBeInstanceOf(AppError)
    expect(serviceMock.criarPersonagem).not.toHaveBeenCalled()
  })

  it('deve delegar ao service com o id do usuário da sessão', async () => {
    getSessionMock.mockResolvedValue(SESSAO)
    serviceMock.criarPersonagem.mockResolvedValue({ id: 'p-1' })
    serviceMock.listarPersonagens.mockResolvedValue([])
    serviceMock.buscarPersonagem.mockResolvedValue({ id: 'p-1' })
    serviceMock.atualizarPersonagem.mockResolvedValue({ id: 'p-1' })
    serviceMock.alternarVisibilidade.mockResolvedValue({ id: 'p-1' })

    await controlarCriacao({ nome: 'Bree' })
    await controlarListagem()
    await controlarBusca('p-1')
    await controlarEdicao('p-1', { nivel: 2 })
    await controlarToggleVisibilidade('p-1')

    expect(serviceMock.criarPersonagem).toHaveBeenCalledWith('u-1', { nome: 'Bree' })
    expect(serviceMock.listarPersonagens).toHaveBeenCalledWith('u-1')
    expect(serviceMock.buscarPersonagem).toHaveBeenCalledWith('p-1', 'u-1')
    expect(serviceMock.atualizarPersonagem).toHaveBeenCalledWith('u-1', 'p-1', { nivel: 2 })
    expect(serviceMock.alternarVisibilidade).toHaveBeenCalledWith('u-1', 'p-1')
  })
})

describe('controlarDadosWizard', () => {
  it('deve compor as consultas do SRD e modelar o que a página desce por prop', async () => {
    srdMock.listarEspecies.mockResolvedValue([{ id: '1', slug: 'human', name: 'Human' }])
    srdMock.listarClassesParaWizard.mockResolvedValue([
      {
        slug: 'fighter',
        name: 'Fighter',
        hitDie: 10,
        caster: false,
        pericias: { escolher: 2, opcoes: [{ slug: 'athletics', name: 'Athletics' }] },
      },
    ])
    srdMock.listarSubclasses.mockResolvedValue([
      { id: '2', slug: 'champion', name: 'Champion', levelGained: 3, classeSlug: 'fighter' },
    ])
    srdMock.listarBackgrounds.mockResolvedValue([{ id: '3', slug: 'soldier', name: 'Soldier' }])
    srdMock.listarMagias.mockResolvedValue([
      { id: '4', slug: 'fire-bolt', name: 'Fire Bolt', level: 0, school: 'evocation' },
      { id: '5', slug: 'magic-missile', name: 'Magic Missile', level: 1, school: 'evocation' },
    ])
    srdMock.listarEquipamentos.mockResolvedValue([
      { id: '6', slug: 'longsword', name: 'Longsword', category: 'Martial Weapons' },
    ])

    const dados = await controlarDadosWizard()

    expect(srdMock.listarMagias).toHaveBeenCalledWith({ nivelMaximo: 1 })
    expect(dados.especies).toEqual([{ slug: 'human', name: 'Human' }])
    expect(dados.classes).toEqual([
      {
        slug: 'fighter',
        name: 'Fighter',
        hitDie: 10,
        caster: false,
        pericias: { escolher: 2, opcoes: [{ slug: 'athletics', name: 'Athletics' }] },
      },
    ])
    expect(dados.subclasses).toEqual([
      { slug: 'champion', name: 'Champion', classeSlug: 'fighter' },
    ])
    expect(dados.magiasNivel1.map((m) => m.extra)).toEqual(['truque', 'nv 1'])
    expect(dados.equipamentos).toEqual([{ slug: 'longsword', name: 'Longsword' }])
  })
})
