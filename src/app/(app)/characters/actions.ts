'use server'

import { revalidatePath } from 'next/cache'

import { AppError } from '@/server/http/errors'
import {
  controlarCriacao,
  controlarEdicao,
  controlarToggleVisibilidade,
} from '@/server/personagens/personagens.controller'
import type { EstadoAcao } from '@/shared/lib/estado-acao'

function traduz(erro: unknown): EstadoAcao {
  if (erro instanceof AppError) return { erro: erro.message }
  return { erro: 'Algo falhou ao salvar a ficha. Tente de novo.' }
}

export async function acaoCriarPersonagem(
  _estado: EstadoAcao | null,
  formData: FormData,
): Promise<EstadoAcao> {
  const dados = {
    especie: String(formData.get('especie') ?? ''),
    classe: String(formData.get('classe') ?? ''),
    background: String(formData.get('background') ?? ''),
    atributos: {
      forca: Number(formData.get('forca')),
      destreza: Number(formData.get('destreza')),
      constituicao: Number(formData.get('constituicao')),
      inteligencia: Number(formData.get('inteligencia')),
      sabedoria: Number(formData.get('sabedoria')),
      carisma: Number(formData.get('carisma')),
    },
    pericias: formData.getAll('pericias').map(String),
    magias: formData.getAll('magias').map(String),
    equipamento: formData.getAll('equipamento').map(String),
    feats: formData.getAll('feats').map(String),
    nome: String(formData.get('nome') ?? ''),
    visivelAoMestre: formData.get('visivelAoMestre') !== 'off',
  }
  try {
    const personagem = await controlarCriacao(dados)
    revalidatePath('/characters')
    return { ok: true, id: personagem.id }
  } catch (erro) {
    return traduz(erro)
  }
}

export async function acaoEditarPersonagem(
  _estado: EstadoAcao | null,
  formData: FormData,
): Promise<EstadoAcao> {
  const id = String(formData.get('id') ?? '')
  const dados: Record<string, unknown> = {}
  if (formData.has('nome')) dados.nome = String(formData.get('nome'))
  if (formData.has('nivel')) dados.nivel = Number(formData.get('nivel'))
  try {
    await controlarEdicao(id, dados)
    revalidatePath(`/characters/${id}`)
    revalidatePath('/characters')
    return { ok: true }
  } catch (erro) {
    return traduz(erro)
  }
}

export async function acaoAlternarVisibilidade(
  _estado: EstadoAcao | null,
  formData: FormData,
): Promise<EstadoAcao> {
  const id = String(formData.get('id') ?? '')
  try {
    await controlarToggleVisibilidade(id)
    revalidatePath(`/characters/${id}`)
    return { ok: true }
  } catch (erro) {
    return traduz(erro)
  }
}
