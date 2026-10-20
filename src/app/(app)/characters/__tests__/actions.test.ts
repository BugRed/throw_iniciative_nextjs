import { beforeEach, describe, expect, it, vi } from 'vitest'

const { controllerMock, revalidatePathMock } = vi.hoisted(() => ({
  controllerMock: {
    controlarCriacao: vi.fn(),
    controlarEdicao: vi.fn(),
    controlarToggleVisibilidade: vi.fn(),
  },
  revalidatePathMock: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: revalidatePathMock,
}))
vi.mock('@/server/personagens/personagens.controller', () => controllerMock)

import {
  acaoAlternarVisibilidade,
  acaoCriarPersonagem,
  acaoEditarPersonagem,
} from '@/app/(app)/characters/actions'
import { AppError } from '@/server/http/errors'

// A action é a borda: traduz FormData em payload tipado e erro em texto legível.

beforeEach(() => {
  vi.clearAllMocks()
})

function formDeCriacao(visivelAoMestre?: string) {
  const formData = new FormData()
  formData.set('especie', 'human')
  formData.set('classe', 'fighter')
  formData.set('background', 'soldier')
  formData.set('forca', '15')
  formData.set('destreza', '14')
  formData.set('constituicao', '12')
  formData.set('inteligencia', '8')
  formData.set('sabedoria', '10')
  formData.set('carisma', '8')
  formData.append('pericias', 'athletics')
  formData.append('equipamento', 'chain-mail')
  formData.set('nome', 'Bree')
  if (visivelAoMestre !== undefined) formData.set('visivelAoMestre', visivelAoMestre)
  return formData
}

describe('acaoCriarPersonagem', () => {
  it('deve traduzir FormData em payload tipado e devolver ok com id', async () => {
    controllerMock.controlarCriacao.mockResolvedValue({ id: 'p-1' })

    const estado = await acaoCriarPersonagem(null, formDeCriacao('on'))

    expect(estado).toEqual({ ok: true, id: 'p-1' })
    expect(controllerMock.controlarCriacao).toHaveBeenCalledWith({
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
      feats: [],
      nome: 'Bree',
      visivelAoMestre: true,
    })
    expect(revalidatePathMock).toHaveBeenCalledWith('/characters')
  })

  it('deve tratar visivelAoMestre off como ficha fechada', async () => {
    controllerMock.controlarCriacao.mockResolvedValue({ id: 'p-2' })

    await acaoCriarPersonagem(null, formDeCriacao('off'))

    expect(controllerMock.controlarCriacao).toHaveBeenCalledWith(
      expect.objectContaining({ visivelAoMestre: false }),
    )
  })

  it('deve devolver a mensagem do AppError como erro legível', async () => {
    controllerMock.controlarCriacao.mockRejectedValue(
      new AppError("Classe 'warlock' não existe no SRD.", 422, 'VALIDACAO'),
    )

    const estado = await acaoCriarPersonagem(null, formDeCriacao())

    expect(estado).toEqual({ erro: "Classe 'warlock' não existe no SRD." })
  })

  it('deve mascarar erro inesperado com mensagem genérica', async () => {
    controllerMock.controlarCriacao.mockRejectedValue(new Error('boom'))

    const estado = await acaoCriarPersonagem(null, formDeCriacao())

    expect(estado).toEqual({ erro: 'Algo falhou ao salvar a ficha. Tente de novo.' })
  })
})

describe('acaoEditarPersonagem', () => {
  it('deve enviar só os campos presentes no form e revalidar ficha e lista', async () => {
    controllerMock.controlarEdicao.mockResolvedValue({ id: 'p-1' })
    const formData = new FormData()
    formData.set('id', 'p-1')
    formData.set('nome', 'Bree II')
    formData.set('nivel', '3')

    const estado = await acaoEditarPersonagem(null, formData)

    expect(estado).toEqual({ ok: true })
    expect(controllerMock.controlarEdicao).toHaveBeenCalledWith('p-1', {
      nome: 'Bree II',
      nivel: 3,
    })
    expect(revalidatePathMock).toHaveBeenCalledWith('/characters/p-1')
    expect(revalidatePathMock).toHaveBeenCalledWith('/characters')
  })

  it('deve omitir nível ausente do payload de edição', async () => {
    controllerMock.controlarEdicao.mockResolvedValue({ id: 'p-1' })
    const formData = new FormData()
    formData.set('id', 'p-1')
    formData.set('nome', 'Bree II')

    await acaoEditarPersonagem(null, formData)

    expect(controllerMock.controlarEdicao).toHaveBeenCalledWith('p-1', { nome: 'Bree II' })
  })

  it('deve mascarar erro inesperado da edição com mensagem genérica', async () => {
    controllerMock.controlarEdicao.mockRejectedValue(new Error('boom'))
    const formData = new FormData()
    formData.set('id', 'p-1')

    const estado = await acaoEditarPersonagem(null, formData)

    expect(estado).toEqual({ erro: 'Algo falhou ao salvar a ficha. Tente de novo.' })
  })
})

describe('acaoAlternarVisibilidade', () => {
  it('deve repassar o id e revalidar a ficha', async () => {
    controllerMock.controlarToggleVisibilidade.mockResolvedValue({ id: 'p-1' })
    const formData = new FormData()
    formData.set('id', 'p-1')

    const estado = await acaoAlternarVisibilidade(null, formData)

    expect(estado).toEqual({ ok: true })
    expect(controllerMock.controlarToggleVisibilidade).toHaveBeenCalledWith('p-1')
    expect(revalidatePathMock).toHaveBeenCalledWith('/characters/p-1')
  })

  it('deve devolver a mensagem do AppError como erro legível', async () => {
    controllerMock.controlarToggleVisibilidade.mockRejectedValue(
      new AppError('Ficha não encontrada.', 404, 'NAO_ENCONTRADO'),
    )
    const formData = new FormData()
    formData.set('id', 'p-404')

    const estado = await acaoAlternarVisibilidade(null, formData)

    expect(estado).toEqual({ erro: 'Ficha não encontrada.' })
  })
})
