import { beforeEach, describe, expect, it, vi } from 'vitest'

const { c, revalidatePathMock } = vi.hoisted(() => ({
  c: {
    controlarAnexoNpc: vi.fn(),
    controlarAnexoPersonagem: vi.fn(),
    controlarCriacaoSala: vi.fn(),
    controlarDecisaoPedido: vi.fn(),
    controlarDestruicao: vi.fn(),
    controlarExpulsao: vi.fn(),
    controlarInstanciacaoNpc: vi.fn(),
    controlarPassagemCargo: vi.fn(),
    controlarPedidoEntrada: vi.fn(),
    controlarRemocaoNpc: vi.fn(),
    controlarRemocaoNpcTemporario: vi.fn(),
    controlarSaida: vi.fn(),
  },
  revalidatePathMock: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }))
vi.mock('@/server/salas/salas.controller', () => c)

import {
  acaoAnexarNpc,
  acaoAnexarPersonagem,
  acaoCriarSala,
  acaoDecidirPedido,
  acaoDestruirSala,
  acaoExpulsar,
  acaoInstanciarNpc,
  acaoPassarCargo,
  acaoPedirEntrada,
  acaoRemoverNpc,
  acaoSair,
} from '@/app/(app)/rooms/actions'
import { AppError } from '@/server/http/errors'

function form(campos: Record<string, string>): FormData {
  const formData = new FormData()
  for (const [nome, valor] of Object.entries(campos)) formData.set(nome, valor)
  return formData
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('acaoCriarSala', () => {
  it('deve criar a sala e devolver o id para a UI navegar', async () => {
    c.controlarCriacaoSala.mockResolvedValue({ id: 'r-1' })

    const estado = await acaoCriarSala(null, form({ nome: 'Mesa' }))

    expect(c.controlarCriacaoSala).toHaveBeenCalledWith({ nome: 'Mesa' })
    expect(estado).toEqual({ ok: true, id: 'r-1' })
    expect(revalidatePathMock).toHaveBeenCalledWith('/rooms')
  })

  it('deve traduzir erro de domínio em mensagem legível', async () => {
    c.controlarCriacaoSala.mockRejectedValue(
      new AppError('Você já tem 5 salas abertas.', 409, 'CONFLITO'),
    )

    expect(await acaoCriarSala(null, form({ nome: 'Mesa' }))).toEqual({
      erro: 'Você já tem 5 salas abertas.',
    })
  })

  it('deve esconder erro inesperado atrás de uma mensagem genérica', async () => {
    c.controlarCriacaoSala.mockRejectedValue(new Error('connection refused :5432'))

    expect(await acaoCriarSala(null, form({ nome: 'Mesa' }))).toEqual({
      erro: 'Algo falhou. Tente de novo.',
    })
  })
})

describe('acaoPedirEntrada', () => {
  it('deve devolver o id da sala para a UI esperar a decisão do mestre', async () => {
    c.controlarPedidoEntrada.mockResolvedValue({ id: 'r-1' })

    expect(await acaoPedirEntrada(null, form({ codigo: 'AB2CD3' }))).toEqual({
      ok: true,
      id: 'r-1',
    })
    expect(c.controlarPedidoEntrada).toHaveBeenCalledWith('AB2CD3')
  })
})

describe('ações do mestre e do jogador sobre a sala', () => {
  it.each([
    ['aceitar', true],
    ['recusar', false],
  ])('deve mapear a decisão "%s" para o booleano do controller', async (decisao, aceitar) => {
    await acaoDecidirPedido(null, form({ roomId: 'r-1', usuarioId: 'u-2', decisao }))

    expect(c.controlarDecisaoPedido).toHaveBeenCalledWith('r-1', 'u-2', aceitar)
  })

  it('deve atualizar a página da sala depois de uma ação bem-sucedida', async () => {
    const estado = await acaoSair(null, form({ roomId: 'r-1' }))

    expect(c.controlarSaida).toHaveBeenCalledWith('r-1')
    expect(estado).toEqual({ ok: true, id: 'r-1' })
    expect(revalidatePathMock).toHaveBeenCalledWith('/rooms/r-1')
  })

  it('não deve revalidar quando o controller recusa', async () => {
    c.controlarExpulsao.mockRejectedValue(
      new AppError('Só o mestre pode fazer isso.', 403, 'PROIBIDO'),
    )

    const estado = await acaoExpulsar(null, form({ roomId: 'r-1', usuarioId: 'u-2' }))

    expect(estado).toEqual({ erro: 'Só o mestre pode fazer isso.' })
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })

  it('deve encerrar a sala pelo id do form', async () => {
    await acaoDestruirSala(null, form({ roomId: 'r-1' }))

    expect(c.controlarDestruicao).toHaveBeenCalledWith('r-1')
  })
})

describe('NPCs da sala', () => {
  it('deve remover NPC de ficha e NPC temporário por caminhos diferentes', async () => {
    await acaoRemoverNpc(null, form({ roomId: 'r-1', npcId: 'n-1', tipo: 'persistente' }))
    await acaoRemoverNpc(null, form({ roomId: 'r-1', npcId: 't-1', tipo: 'temporario' }))

    expect(c.controlarRemocaoNpc).toHaveBeenCalledWith('r-1', 'n-1')
    expect(c.controlarRemocaoNpcTemporario).toHaveBeenCalledWith('r-1', 't-1')
  })

  it('deve converter a quantidade do form em número ao instanciar', async () => {
    await acaoInstanciarNpc(null, form({ roomId: 'r-1', moldeId: 'm-1', quantidade: '4' }))

    expect(c.controlarInstanciacaoNpc).toHaveBeenCalledWith('r-1', {
      moldeId: 'm-1',
      quantidade: 4,
    })
  })
})

describe('cargo e elenco', () => {
  it('deve passar o cargo ao usuário escolhido', async () => {
    const estado = await acaoPassarCargo(null, form({ roomId: 'r-1', usuarioId: 'u-2' }))

    expect(c.controlarPassagemCargo).toHaveBeenCalledWith('r-1', 'u-2')
    expect(estado).toEqual({ ok: true, id: 'r-1' })
  })

  it('deve anexar o PJ escolhido pelo jogador', async () => {
    await acaoAnexarPersonagem(null, form({ roomId: 'r-1', characterId: 'c-1' }))

    expect(c.controlarAnexoPersonagem).toHaveBeenCalledWith('r-1', 'c-1')
  })

  it('deve devolver o motivo quando o PJ não pode voltar à sala', async () => {
    c.controlarAnexoPersonagem.mockRejectedValue(
      new AppError('Este personagem morreu nesta sala e não pode voltar.', 409, 'CONFLITO'),
    )

    expect(await acaoAnexarPersonagem(null, form({ roomId: 'r-1', characterId: 'c-1' }))).toEqual({
      erro: 'Este personagem morreu nesta sala e não pode voltar.',
    })
  })

  it('deve anexar o NPC de ficha escolhido pelo mestre', async () => {
    await acaoAnexarNpc(null, form({ roomId: 'r-1', characterId: 'n-1' }))

    expect(c.controlarAnexoNpc).toHaveBeenCalledWith('r-1', 'n-1')
  })
})
