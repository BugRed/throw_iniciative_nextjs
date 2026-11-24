import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSessionMock, serviceMock, srdMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  serviceMock: {
    buscarStatsMonstro: vi.fn(),
    criarMolde: vi.fn(),
    excluirMolde: vi.fn(),
    listarMoldes: vi.fn(),
  },
  srdMock: { listarMonstros: vi.fn() },
}))

vi.mock('@/server/auth/session', () => ({ getSession: getSessionMock }))
vi.mock('@/server/npcs/npcs.service', () => serviceMock)
vi.mock('@/server/srd/srd.service', () => srdMock)

import { AppError } from '@/server/http/errors'
import {
  controlarCatalogo,
  controlarCriacaoMolde,
  controlarExclusaoMolde,
  controlarMoldes,
  controlarStatsMonstro,
} from '@/server/npcs/npcs.controller'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('controllers de NPC', () => {
  it('deve exigir sessão em toda operação com 401 SEM_SESSAO', async () => {
    getSessionMock.mockResolvedValue(null)

    await expect(controlarCatalogo()).rejects.toBeInstanceOf(AppError)
    await expect(controlarStatsMonstro('x')).rejects.toMatchObject({ codigo: 'SEM_SESSAO' })
    await expect(controlarCriacaoMolde({})).rejects.toBeInstanceOf(AppError)
    await expect(controlarMoldes()).rejects.toBeInstanceOf(AppError)
    await expect(controlarExclusaoMolde('m-1')).rejects.toBeInstanceOf(AppError)
    expect(serviceMock.criarMolde).not.toHaveBeenCalled()
  })

  it('deve delegar com o id do usuário da sessão — qualquer logado cria NPC', async () => {
    getSessionMock.mockResolvedValue({ user: { id: 'u-1' } })
    srdMock.listarMonstros.mockResolvedValue([])

    await controlarCatalogo()
    await controlarStatsMonstro('goblin')
    await controlarCriacaoMolde({ nome: 'G' })
    await controlarMoldes()
    await controlarExclusaoMolde('m-1')

    expect(srdMock.listarMonstros).toHaveBeenCalledTimes(1)
    expect(serviceMock.buscarStatsMonstro).toHaveBeenCalledWith('goblin')
    expect(serviceMock.criarMolde).toHaveBeenCalledWith('u-1', { nome: 'G' })
    expect(serviceMock.listarMoldes).toHaveBeenCalledWith('u-1')
    expect(serviceMock.excluirMolde).toHaveBeenCalledWith('u-1', 'm-1')
  })
})
