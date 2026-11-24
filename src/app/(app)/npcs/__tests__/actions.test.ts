import { beforeEach, describe, expect, it, vi } from 'vitest'

const { controllerMock, revalidatePathMock } = vi.hoisted(() => ({
  controllerMock: { controlarCriacaoMolde: vi.fn(), controlarExclusaoMolde: vi.fn() },
  revalidatePathMock: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }))
vi.mock('@/server/npcs/npcs.controller', () => controllerMock)

import { acaoCriarMolde, acaoExcluirMolde } from '@/app/(app)/npcs/actions'
import { AppError } from '@/server/http/errors'

beforeEach(() => {
  vi.clearAllMocks()
})

function formMolde(monstroSlug?: string) {
  const formData = new FormData()
  formData.set('nome', 'Goblin forte')
  formData.set('hpMax', '12')
  formData.set('armorClass', '13')
  formData.set('initiativeMod', '2')
  if (monstroSlug) formData.set('monstroSlug', monstroSlug)
  return formData
}

describe('acaoCriarMolde', () => {
  it('deve traduzir o form em payload numérico e revalidar a lista', async () => {
    controllerMock.controlarCriacaoMolde.mockResolvedValue({ id: 'm-1' })

    const estado = await acaoCriarMolde(null, formMolde('goblin-minion'))

    expect(estado).toEqual({ ok: true, id: 'm-1' })
    expect(controllerMock.controlarCriacaoMolde).toHaveBeenCalledWith({
      nome: 'Goblin forte',
      hpMax: 12,
      armorClass: 13,
      initiativeMod: 2,
      monstroSlug: 'goblin-minion',
    })
    expect(revalidatePathMock).toHaveBeenCalledWith('/npcs')
  })

  it('deve omitir monstroSlug quando o molde é do zero', async () => {
    controllerMock.controlarCriacaoMolde.mockResolvedValue({ id: 'm-1' })

    await acaoCriarMolde(null, formMolde())

    expect(controllerMock.controlarCriacaoMolde.mock.calls[0]?.[0]).not.toHaveProperty(
      'monstroSlug',
    )
  })

  it('deve devolver o erro de domínio e um texto genérico para falha inesperada', async () => {
    controllerMock.controlarCriacaoMolde.mockRejectedValueOnce(
      new AppError('Molde inválido.', 422, 'VALIDACAO'),
    )
    expect(await acaoCriarMolde(null, formMolde())).toEqual({ erro: 'Molde inválido.' })

    controllerMock.controlarCriacaoMolde.mockRejectedValueOnce(new Error('boom'))
    expect(await acaoCriarMolde(null, formMolde())).toEqual({
      erro: 'Algo falhou ao salvar o NPC. Tente de novo.',
    })
  })
})

describe('acaoExcluirMolde', () => {
  it('deve excluir pelo id do form e revalidar', async () => {
    const formData = new FormData()
    formData.set('id', 'm-1')

    expect(await acaoExcluirMolde(null, formData)).toEqual({ ok: true })
    expect(controllerMock.controlarExclusaoMolde).toHaveBeenCalledWith('m-1')
    expect(revalidatePathMock).toHaveBeenCalledWith('/npcs')
  })

  it('deve devolver o erro quando o molde não é do usuário', async () => {
    controllerMock.controlarExclusaoMolde.mockRejectedValue(
      new AppError('Molde de NPC não encontrado.', 404, 'NAO_ENCONTRADO'),
    )

    expect(await acaoExcluirMolde(null, new FormData())).toEqual({
      erro: 'Molde de NPC não encontrado.',
    })
  })
})
