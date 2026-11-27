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
    salaAtivaComoJogador: vi.fn(),
    rolarDesempate: vi.fn(),
    rolarIniciativaDosNpcs: vi.fn(),
    rolarMinhaIniciativa: vi.fn(),
    usarInspiracao: vi.fn(),
    passarVez: vi.fn(),
    finalizarIniciativa: vi.fn(),
    adicionarParticipante: vi.fn(),
    lerPainelIniciativa: vi.fn(),
  },
  busMock: { publicar: vi.fn() },
}))

vi.mock('@/server/auth/auth', () => ({ auth: { api: { getSession: getSessionMock } } }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/server/iniciativa/iniciativa.abertura.service', () => servicos)
vi.mock('@/server/iniciativa/iniciativa.combate.service', () => servicos)
vi.mock('@/server/iniciativa/iniciativa.leitura.service', () => servicos)
vi.mock('@/server/iniciativa/iniciativa.mesa.service', () => servicos)
vi.mock('@/server/iniciativa/iniciativa.pausa.service', () => servicos)
vi.mock('@/server/iniciativa/iniciativa.rolagem.service', () => servicos)
vi.mock('@/server/realtime/event-bus', () => ({ eventBus: busMock }))

import { AppError, ValidationError } from '@/server/http/errors'
import {
  controlarAbertura,
  controlarAvanco,
  controlarCancelamento,
  controlarConcessaoInspiracao,
  controlarDesempate,
  controlarEntradaNoMeio,
  controlarFinalizacao,
  controlarInspiracaoUsada,
  controlarModoRolagem,
  controlarMorte,
  controlarPainel,
  controlarPasseDeVez,
  controlarPausa,
  controlarPedidoDePause,
  controlarRemocaoDaFila,
  controlarRetomada,
  controlarRolagemDosNpcs,
  controlarRolagemPropria,
  controlarSalaAtiva,
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

describe('demais operações do jogador e do mestre', () => {
  it.each([
    ['cancelar', controlarCancelamento, 'cancelarIniciativa'],
    ['usar Inspiração', controlarInspiracaoUsada, 'usarInspiracao'],
    ['rolar desempate', controlarDesempate, 'rolarDesempate'],
    ['passar a vez', controlarPasseDeVez, 'passarVez'],
    ['finalizar', controlarFinalizacao, 'finalizarIniciativa'],
  ] as const)('deve delegar %s com o usuário da sessão', async (_nome, operacao, service) => {
    await operacao(SALA)

    expect(servicos[service]).toHaveBeenCalledWith('u-1', SALA)
    expect(busMock.publicar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'initiative:changed' }),
    )
  })

  it('deve delegar a remoção da fila validando o participante', async () => {
    await controlarRemocaoDaFila(SALA, ALVO)

    expect(servicos.removerParticipante).toHaveBeenCalledWith('u-1', SALA, ALVO)
    await expect(controlarRemocaoDaFila(SALA, 'x')).rejects.toThrow(ValidationError)
  })

  it('deve repassar a entrada no meio ao service sem interpretá-la', async () => {
    const entrada = { tempNpcId: ALVO }

    await controlarEntradaNoMeio(SALA, entrada)

    expect(servicos.adicionarParticipante).toHaveBeenCalledWith('u-1', SALA, entrada)
    expect(busMock.publicar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'initiative:changed', roomId: SALA }),
    )
  })

  it('deve devolver a mesa em que o usuário joga agora', async () => {
    servicos.salaAtivaComoJogador.mockResolvedValue({
      id: 'r-9',
      nome: 'Mesa 9',
      masterUserId: 'm',
    })

    expect(await controlarSalaAtiva()).toEqual({ id: 'r-9', nome: 'Mesa 9', masterUserId: 'm' })
    expect(servicos.salaAtivaComoJogador).toHaveBeenCalledWith('u-1')
  })
})

describe('leitura do painel', () => {
  it('deve ler como o usuário da sessão e não avisar a sala', async () => {
    const painel = { ehMestre: false, atual: null, candidatos: [] }
    servicos.lerPainelIniciativa.mockResolvedValue(painel)

    expect(await controlarPainel(SALA)).toBe(painel)
    expect(servicos.lerPainelIniciativa).toHaveBeenCalledWith('u-1', SALA)
    expect(busMock.publicar).not.toHaveBeenCalled()
  })

  it('deve recusar id malformado sem ler nada', async () => {
    await expect(controlarPainel('x')).rejects.toThrow(ValidationError)
    expect(servicos.lerPainelIniciativa).not.toHaveBeenCalled()
  })
})
