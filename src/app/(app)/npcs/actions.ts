'use server'

import { revalidatePath } from 'next/cache'

import { AppError } from '@/server/http/errors'
import { controlarCriacaoMolde, controlarExclusaoMolde } from '@/server/npcs/npcs.controller'
import type { EstadoAcao } from '@/shared/lib/estado-acao'

function traduz(erro: unknown): EstadoAcao {
  if (erro instanceof AppError) return { erro: erro.message }
  return { erro: 'Algo falhou ao salvar o NPC. Tente de novo.' }
}

export async function acaoCriarMolde(
  _estado: EstadoAcao | null,
  formData: FormData,
): Promise<EstadoAcao> {
  const monstroSlug = String(formData.get('monstroSlug') ?? '')
  try {
    const molde = await controlarCriacaoMolde({
      nome: String(formData.get('nome') ?? ''),
      hpMax: Number(formData.get('hpMax')),
      armorClass: Number(formData.get('armorClass')),
      initiativeMod: Number(formData.get('initiativeMod')),
      ...(monstroSlug ? { monstroSlug } : {}),
    })
    revalidatePath('/npcs')
    return { ok: true, id: molde.id }
  } catch (erro) {
    return traduz(erro)
  }
}

export async function acaoExcluirMolde(
  _estado: EstadoAcao | null,
  formData: FormData,
): Promise<EstadoAcao> {
  try {
    await controlarExclusaoMolde(String(formData.get('id') ?? ''))
    revalidatePath('/npcs')
    return { ok: true }
  } catch (erro) {
    return traduz(erro)
  }
}
