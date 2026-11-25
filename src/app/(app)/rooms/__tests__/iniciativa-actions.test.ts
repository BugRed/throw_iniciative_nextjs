import { beforeEach, describe, expect, it, vi } from 'vitest'

const { c, revalidatePathMock } = vi.hoisted(() => ({
  c: { controlarAbertura: vi.fn(), controlarPedidoDePause: vi.fn() },
  revalidatePathMock: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }))
vi.mock('@/server/iniciativa/iniciativa.controller', () => c)

import { acaoAbrirIniciativa, acaoSolicitarPause } from '@/app/(app)/rooms/iniciativa-actions'
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

    expect(c.controlarAbertura).toHaveBeenCalledWith('r-1', {})
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
