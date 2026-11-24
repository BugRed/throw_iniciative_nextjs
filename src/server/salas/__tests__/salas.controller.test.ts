import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSessionMock, servicos, busMock, sseMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  servicos: {
    criarSala: vi.fn(),
    pedirEntrada: vi.fn(),
    destruirSala: vi.fn(),
    decidirPedido: vi.fn(),
    sairDaSala: vi.fn(),
    expulsarMembro: vi.fn(),
    passarCargo: vi.fn(),
    anexarPersonagem: vi.fn(),
    anexarNpcPersistente: vi.fn(),
    removerNpcPersistente: vi.fn(),
    instanciarNpcTemporario: vi.fn(),
    removerNpcTemporario: vi.fn(),
    obterLobby: vi.fn(),
    listarMinhasSalas: vi.fn(),
    statusParaAssinar: vi.fn(),
  },
  busMock: { publicar: vi.fn(), desconectar: vi.fn() },
  sseMock: { criarFluxoSse: vi.fn() },
}))

vi.mock('@/server/auth/auth', () => ({ auth: { api: { getSession: getSessionMock } } }))
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('@/server/salas/salas.service', () => servicos)
vi.mock('@/server/salas/salas.membros.service', () => servicos)
vi.mock('@/server/salas/salas.elenco.service', () => servicos)
vi.mock('@/server/salas/salas.lobby.service', () => servicos)
vi.mock('@/server/realtime/event-bus', () => ({ eventBus: busMock }))
vi.mock('@/server/realtime/sse', () => sseMock)

import { AppError, ValidationError } from '@/server/http/errors'
import {
  controlarAnexoNpc,
  controlarAnexoPersonagem,
  controlarAssinatura,
  controlarCriacaoSala,
  controlarDecisaoPedido,
  controlarDestruicao,
  controlarExpulsao,
  controlarInstanciacaoNpc,
  controlarLobby,
  controlarPassagemCargo,
  controlarPedidoEntrada,
  controlarRemocaoNpc,
  controlarRemocaoNpcTemporario,
  controlarSaida,
} from '@/server/salas/salas.controller'

const USER = '3f2b8c1e-5d4a-4b6c-9e7f-1a2b3c4d5e01'
const SALA = '3f2b8c1e-5d4a-4b6c-9e7f-1a2b3c4d5e02'
const OUTRO = '3f2b8c1e-5d4a-4b6c-9e7f-1a2b3c4d5e03'

beforeEach(() => {
  vi.clearAllMocks()
  getSessionMock.mockResolvedValue({ user: { id: USER } })
})

describe('sessão e validação', () => {
  it('deve exigir sessão antes de qualquer service ou evento', async () => {
    getSessionMock.mockResolvedValue(null)

    await expect(controlarSaida(SALA)).rejects.toMatchObject({ codigo: 'SEM_SESSAO' })
    await expect(controlarCriacaoSala({})).rejects.toBeInstanceOf(AppError)
    expect(servicos.sairDaSala).not.toHaveBeenCalled()
    expect(busMock.publicar).not.toHaveBeenCalled()
  })

  it('deve recusar id malformado antes de chegar ao service', async () => {
    await expect(controlarLobby('nao-e-uuid')).rejects.toBeInstanceOf(ValidationError)
    await expect(controlarExpulsao(SALA, 'x')).rejects.toBeInstanceOf(ValidationError)
    expect(servicos.obterLobby).not.toHaveBeenCalled()
    expect(servicos.expulsarMembro).not.toHaveBeenCalled()
  })
})

describe('eventos publicados depois do service', () => {
  it('deve avisar só o mestre quando chega um pedido de entrada', async () => {
    servicos.pedirEntrada.mockResolvedValue({ id: SALA, masterUserId: OUTRO })

    await controlarPedidoEntrada('AB2CD3')

    expect(servicos.pedirEntrada).toHaveBeenCalledWith(USER, 'AB2CD3')
    expect(busMock.publicar).toHaveBeenCalledWith({
      tipo: 'member:requested',
      roomId: SALA,
      alvo: OUTRO,
    })
  })

  it('deve avisar a sala e o aceito quando o pedido é aceito', async () => {
    await controlarDecisaoPedido(SALA, OUTRO, true)

    expect(servicos.decidirPedido).toHaveBeenCalledWith(USER, SALA, OUTRO, true)
    expect(busMock.publicar).toHaveBeenCalledWith({
      tipo: 'member:joined',
      roomId: SALA,
      alvo: undefined,
    })
    expect(busMock.publicar).toHaveBeenCalledWith({
      tipo: 'member:joined',
      roomId: SALA,
      alvo: OUTRO,
    })
  })

  it('deve avisar só o recusado quando o pedido é recusado', async () => {
    await controlarDecisaoPedido(SALA, OUTRO, false)

    expect(busMock.publicar).toHaveBeenCalledTimes(1)
    expect(busMock.publicar).toHaveBeenCalledWith({
      tipo: 'member:rejected',
      roomId: SALA,
      alvo: OUTRO,
    })
  })
})

describe('eventos publicados: saída, cargo e elenco', () => {
  it('deve desconectar quem saiu e quem foi expulso, depois de avisar a sala', async () => {
    await controlarSaida(SALA)
    await controlarExpulsao(SALA, OUTRO)

    expect(busMock.desconectar).toHaveBeenNthCalledWith(1, SALA, USER)
    expect(busMock.desconectar).toHaveBeenNthCalledWith(2, SALA, OUTRO)
    expect(busMock.publicar).toHaveBeenCalledWith({
      tipo: 'member:left',
      roomId: SALA,
      alvo: undefined,
    })
    expect(busMock.publicar).toHaveBeenCalledWith({
      tipo: 'member:kicked',
      roomId: SALA,
      alvo: undefined,
    })
  })

  it.each([
    ['passagem de cargo', () => controlarPassagemCargo(SALA, OUTRO), 'master:transferred'],
    ['destruição', () => controlarDestruicao(SALA), 'room:destroyed'],
    ['troca de PJ', () => controlarAnexoPersonagem(SALA, OUTRO), 'character:changed'],
    ['NPC anexado', () => controlarAnexoNpc(SALA, OUTRO), 'npc:added'],
    ['NPC removido', () => controlarRemocaoNpc(SALA, OUTRO), 'npc:removed'],
    ['NPC temporário removido', () => controlarRemocaoNpcTemporario(SALA, OUTRO), 'npc:removed'],
    ['instanciação', () => controlarInstanciacaoNpc(SALA, {}), 'npc:added'],
  ])('deve publicar o evento certo na %s', async (_nome, acao, tipo) => {
    await acao()

    expect(busMock.publicar).toHaveBeenCalledWith({ tipo, roomId: SALA, alvo: undefined })
  })

  it('não deve publicar nada quando o service recusa a ação', async () => {
    servicos.expulsarMembro.mockRejectedValue(new AppError('Sem permissão.', 403, 'PROIBIDO'))

    await expect(controlarExpulsao(SALA, OUTRO)).rejects.toMatchObject({ codigo: 'PROIBIDO' })

    expect(busMock.publicar).not.toHaveBeenCalled()
    expect(busMock.desconectar).not.toHaveBeenCalled()
  })
})

describe('controlarAssinatura', () => {
  it('deve abrir o stream como ativo para membro ativo e como inativo para pendente', async () => {
    const signal = new AbortController().signal
    servicos.statusParaAssinar.mockResolvedValueOnce('active').mockResolvedValueOnce('pending')

    await controlarAssinatura(SALA, signal)
    await controlarAssinatura(SALA, signal)

    expect(sseMock.criarFluxoSse).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ roomId: SALA, userId: USER, ativo: true, signal }),
    )
    expect(sseMock.criarFluxoSse).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ ativo: false }),
    )
  })

  it('não deve abrir stream quando o vínculo não existe', async () => {
    servicos.statusParaAssinar.mockRejectedValue(
      new AppError('Sala não encontrada.', 404, 'NAO_ENCONTRADO'),
    )

    await expect(controlarAssinatura(SALA, new AbortController().signal)).rejects.toMatchObject({
      status: 404,
    })
    expect(sseMock.criarFluxoSse).not.toHaveBeenCalled()
  })
})
