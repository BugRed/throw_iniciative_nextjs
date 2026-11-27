import { beforeEach, describe, expect, it, vi } from 'vitest'

const { c, revalidatePathMock } = vi.hoisted(() => ({
  c: {
    controlarAbertura: vi.fn(),
    controlarPedidoDePause: vi.fn(),
    controlarAvanco: vi.fn(),
    controlarCancelamento: vi.fn(),
    controlarRolagemPropria: vi.fn(),
    controlarRolagemDosNpcs: vi.fn(),
    controlarInspiracaoUsada: vi.fn(),
    controlarDesempate: vi.fn(),
    controlarConcessaoInspiracao: vi.fn(),
    controlarModoRolagem: vi.fn(),
    controlarRemocaoDaFila: vi.fn(),
    controlarMorte: vi.fn(),
    controlarPasseDeVez: vi.fn(),
    controlarFinalizacao: vi.fn(),
    controlarEntradaNoMeio: vi.fn(),
    controlarPausa: vi.fn(),
    controlarRetomada: vi.fn(),
  },
  revalidatePathMock: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }))
vi.mock('@/server/iniciativa/iniciativa.controller', () => c)

import {
  acaoAbrirIniciativa,
  acaoAdicionarParticipante,
  acaoAvancarIniciativa,
  acaoCancelarIniciativa,
  acaoConcederInspiracao,
  acaoFinalizarIniciativa,
  acaoMarcarMorte,
  acaoModoRolagem,
  acaoPassarVez,
  acaoPausarSala,
  acaoRemoverDaFila,
  acaoRetomarSala,
  acaoRolarDesempate,
  acaoRolarMinha,
  acaoRolarNpcs,
  acaoSolicitarPause,
  acaoUsarInspiracao,
} from '@/app/(app)/rooms/iniciativa-actions'
import { ConflictError } from '@/server/http/errors'

function form(campos: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(campos)) f.set(k, v)
  return f
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('acaoAbrirIniciativa', () => {
  it('deve abrir a iniciativa da sala e atualizar a página', async () => {
    const r = await acaoAbrirIniciativa(null, form({ roomId: 'r-1' }))

    expect(c.controlarAbertura).toHaveBeenCalledWith('r-1', { excluir: [] })
    expect(revalidatePathMock).toHaveBeenCalledWith('/rooms/r-1')
    expect(r).toEqual({ ok: true, id: 'r-1' })
  })

  it('deve mostrar ao mestre QUEM está ocupado, sem revelar a mesa', async () => {
    c.controlarAbertura.mockRejectedValue(
      new ConflictError('Há quem já esteja em outra sala ativa.', {
        ocupados: [{ userId: 'u-1', nome: 'Bia' }],
      }),
    )

    const r = await acaoAbrirIniciativa(null, form({ roomId: 'r-1' }))

    expect(r).toEqual({ erro: 'Há quem já esteja em outra sala ativa. Ocupados: Bia.' })
  })

  it('deve esconder erro inesperado atrás de texto genérico', async () => {
    c.controlarAbertura.mockRejectedValue(new Error('segredo do banco'))

    const r = await acaoAbrirIniciativa(null, form({ roomId: 'r-1' }))

    expect(r).toEqual({ erro: 'Algo falhou. Tente de novo.' })
  })
})

describe('acaoSolicitarPause', () => {
  it('deve pedir o pause e confirmar', async () => {
    expect(await acaoSolicitarPause(null)).toEqual({ ok: true, id: 'pause' })
    expect(c.controlarPedidoDePause).toHaveBeenCalledTimes(1)
  })

  it('deve devolver a recusa de pedido repetido', async () => {
    c.controlarPedidoDePause.mockRejectedValue(
      new ConflictError('Você já pediu para pausar: aguarde o mestre.'),
    )

    expect(await acaoSolicitarPause(null)).toEqual({
      erro: 'Você já pediu para pausar: aguarde o mestre.',
    })
  })
})

describe('acaoAbrirIniciativa — desmarcados', () => {
  it('deve excluir quem era candidato e ficou desmarcado', async () => {
    const f = form({ roomId: 'r-1' })
    for (const id of ['c-1', 'c-2', 't-1']) f.append('candidato', id)
    for (const id of ['c-1', 't-1']) f.append('incluir', id)

    await acaoAbrirIniciativa(null, f)

    expect(c.controlarAbertura).toHaveBeenCalledWith('r-1', { excluir: ['c-2'] })
  })
})

describe('operações da mesa', () => {
  it.each([
    ['avançar', acaoAvancarIniciativa, 'controlarAvanco'],
    ['cancelar', acaoCancelarIniciativa, 'controlarCancelamento'],
    ['rolar a própria', acaoRolarMinha, 'controlarRolagemPropria'],
    ['rolar os NPCs', acaoRolarNpcs, 'controlarRolagemDosNpcs'],
    ['usar Inspiração', acaoUsarInspiracao, 'controlarInspiracaoUsada'],
    ['desempatar', acaoRolarDesempate, 'controlarDesempate'],
    ['passar a vez', acaoPassarVez, 'controlarPasseDeVez'],
    ['finalizar', acaoFinalizarIniciativa, 'controlarFinalizacao'],
    ['pausar', acaoPausarSala, 'controlarPausa'],
    ['retomar', acaoRetomarSala, 'controlarRetomada'],
  ] as const)('deve %s na sala do formulário e recarregar a página', async (_n, acao, ctrl) => {
    const r = await acao(null, form({ roomId: 'r-1' }))

    expect(c[ctrl]).toHaveBeenCalledWith('r-1')
    expect(revalidatePathMock).toHaveBeenCalledWith('/rooms/r-1')
    expect(r).toEqual({ ok: true, id: 'r-1' })
  })

  it('deve levar o participante a conceder, remover e marcar o modo', async () => {
    const f = form({ roomId: 'r-1', participantId: 'p-1', modo: 'advantage' })

    await acaoConcederInspiracao(null, f)
    await acaoRemoverDaFila(null, f)
    await acaoModoRolagem(null, f)

    expect(c.controlarConcessaoInspiracao).toHaveBeenCalledWith('r-1', 'p-1')
    expect(c.controlarRemocaoDaFila).toHaveBeenCalledWith('r-1', 'p-1')
    expect(c.controlarModoRolagem).toHaveBeenCalledWith('r-1', 'p-1', 'advantage')
  })

  it('deve marcar a morte pelo personagem, não pelo participante', async () => {
    await acaoMarcarMorte(null, form({ roomId: 'r-1', characterId: 'c-9' }))

    expect(c.controlarMorte).toHaveBeenCalledWith('r-1', 'c-9')
  })

  it.each([
    ['characterId:c-1', { characterId: 'c-1' }],
    ['tempNpcId:t-1', { tempNpcId: 't-1' }],
  ])('deve traduzir o entrante "%s" no objeto que o schema valida', async (valor, esperado) => {
    await acaoAdicionarParticipante(null, form({ roomId: 'r-1', entrante: valor }))

    expect(c.controlarEntradaNoMeio).toHaveBeenCalledWith('r-1', esperado)
  })

  it('deve devolver a recusa do servidor sem recarregar a página', async () => {
    c.controlarPasseDeVez.mockRejectedValue(new ConflictError('A vez já passou.'))

    const r = await acaoPassarVez(null, form({ roomId: 'r-1' }))

    expect(r).toEqual({ erro: 'A vez já passou.' })
    expect(revalidatePathMock).not.toHaveBeenCalled()
  })
})
