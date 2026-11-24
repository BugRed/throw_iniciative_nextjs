import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSessionMock, servicos, busMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  servicos: {
    abrirIniciativa: vi.fn(),
    avancarIniciativa: vi.fn(),
    cancelarIniciativa: vi.fn(),
    concederInspiracao: vi.fn(),
    marcarModoDeRolagem: vi.fn(),
    marcarMorteDoPersonagem: vi.fn(),
    removerParticipante: vi.fn(),
    pausarSala: vi.fn(),
    retomarSala: vi.fn(),
    solicitarPause: vi.fn(),
    rolarDesempate: vi.fn(),
    rolarIniciativaDosNpcs: vi.fn(),
    rolarMinhaIniciativa: vi.fn(),
    usarInspiracao: vi.fn(),
  },
  busMock: { publicar: vi.fn() },
}))

vi.mock('@/server/auth/auth', () => ({ auth: { api: { getSession: getSessionMock } } }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/server/iniciativa/iniciativa.abertura.service', () => servicos)
vi.mock('@/server/iniciativa/iniciativa.mesa.service', () => servicos)
vi.mock('@/server/iniciativa/iniciativa.pausa.service', () => servicos)
vi.mock('@/server/iniciativa/iniciativa.rolagem.service', () => servicos)
vi.mock('@/server/realtime/event-bus', () => ({ eventBus: busMock }))

import { AppError, ValidationError } from '@/server/http/errors'
import {
  controlarAbertura,
  controlarAvanco,
  controlarConcessaoInspiracao,
  controlarModoRolagem,
  controlarMorte,
  controlarPausa,
  controlarPedidoDePause,
  controlarRetomada,
  controlarRolagemDosNpcs,
  controlarRolagemPropria,
} from '@/server/iniciativa/iniciativa.controller'

const SALA = '11111111-1111-4111-8111-111111111111'
const ALVO = '22222222-2222-4222-8222-222222222222'

beforeEach(() => {
  vi.clearAllMocks()
  getSessionMock.mockResolvedValue({ user: { id: 'u-1' } })
})

describe('sessão e validação', () => {
  it('deve recusar sem sessão e não chamar o service', async () => {
    getSessionMock.mockResolvedValue(null)

    await expect(controlarAvanco(SALA)).rejects.toThrow(AppError)
    expect(servicos.avancarIniciativa).not.toHaveBeenCalled()
  })

  it('deve recusar id malformado antes de qualquer service', async () => {
    await expect(controlarAvanco('nao-e-uuid')).rejects.toThrow(ValidationError)
    await expect(controlarConcessaoInspiracao(SALA, 'x')).rejects.toThrow(ValidationError)
    expect(servicos.avancarIniciativa).not.toHaveBeenCalled()
  })
})

describe('operações da iniciativa', () => {
  it('deve delegar a abertura com o usuário da sessão e avisar a sala', async () => {
    await controlarAbertura(SALA, { excluir: [] })

    expect(servicos.abrirIniciativa).toHaveBeenCalledWith('u-1', SALA, { excluir: [] })
    expect(busMock.publicar).toHaveBeenCalledWith({
      tipo: 'initiative:changed',
      roomId: SALA,
      alvo: undefined,
    })
  })

  it('deve delegar rolagem própria e a dos NPCs', async () => {
    await controlarRolagemPropria(SALA)
    await controlarRolagemDosNpcs(SALA)

    expect(servicos.rolarMinhaIniciativa).toHaveBeenCalledWith('u-1', SALA)
    expect(servicos.rolarIniciativaDosNpcs).toHaveBeenCalledWith('u-1', SALA)
  })

  it('deve repassar participante e modo ao service', async () => {
    await controlarModoRolagem(SALA, ALVO, 'advantage')
    await controlarConcessaoInspiracao(SALA, ALVO)

    expect(servicos.marcarModoDeRolagem).toHaveBeenCalledWith('u-1', SALA, ALVO, 'advantage')
    expect(servicos.concederInspiracao).toHaveBeenCalledWith('u-1', SALA, ALVO)
  })

  it('não deve avisar ninguém quando o service falha', async () => {
    servicos.avancarIniciativa.mockRejectedValue(new AppError('x', 409, 'CONFLITO'))

    await expect(controlarAvanco(SALA)).rejects.toThrow(AppError)
    expect(busMock.publicar).not.toHaveBeenCalled()
  })

  it('deve avisar character:changed além do combate ao marcar a morte', async () => {
    await controlarMorte(SALA, ALVO)

    expect(servicos.marcarMorteDoPersonagem).toHaveBeenCalledWith('u-1', SALA, ALVO)
    expect(busMock.publicar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'initiative:changed' }),
    )
    expect(busMock.publicar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'character:changed' }),
    )
  })
})

describe('pausa', () => {
  it('deve publicar room:paused e room:resumed', async () => {
    await controlarPausa(SALA)
    await controlarRetomada(SALA)

    expect(busMock.publicar).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'room:paused' }))
    expect(busMock.publicar).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'room:resumed' }))
  })

  it('deve avisar só o mestre da outra mesa ao pedir pause', async () => {
    servicos.solicitarPause.mockResolvedValue({ roomId: 'r-9', mestreId: 'u-m9' })

    await controlarPedidoDePause()

    expect(busMock.publicar).toHaveBeenCalledWith({
      tipo: 'notification:new',
      roomId: 'r-9',
      alvo: 'u-m9',
    })
  })
})
