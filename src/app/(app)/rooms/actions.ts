'use server'

import { revalidatePath } from 'next/cache'

import { AppError } from '@/server/http/errors'
import {
  controlarAnexoNpc,
  controlarAnexoPersonagem,
  controlarCriacaoSala,
  controlarDecisaoPedido,
  controlarDestruicao,
  controlarExpulsao,
  controlarInstanciacaoNpc,
  controlarPassagemCargo,
  controlarPedidoEntrada,
  controlarRemocaoNpc,
  controlarRemocaoNpcTemporario,
  controlarSaida,
} from '@/server/salas/salas.controller'
import type { EstadoAcao } from '@/shared/lib/estado-acao'

// Server Actions da sala: traduzem FormData e delegam ao controller. O erro de
// domínio vira mensagem legível; qualquer outro vira texto genérico.

type Estado = EstadoAcao | null

function texto(formData: FormData, campo: string): string {
  return String(formData.get(campo) ?? '')
}

function traduz(erro: unknown): EstadoAcao {
  if (erro instanceof AppError) return { erro: erro.message }
  return { erro: 'Algo falhou. Tente de novo.' }
}

// Roda a ação e atualiza a página da sala; quem não está na sala é levado de
// volta pela própria página (404), sem a action precisar saber.
async function rodar(roomId: string, fn: () => Promise<unknown>): Promise<EstadoAcao> {
  try {
    await fn()
    revalidatePath(`/rooms/${roomId}`)
    revalidatePath('/rooms')
    return { ok: true, id: roomId }
  } catch (erro) {
    return traduz(erro)
  }
}

export async function acaoCriarSala(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  try {
    const sala = await controlarCriacaoSala({ nome: texto(formData, 'nome') })
    revalidatePath('/rooms')
    return { ok: true, id: sala.id }
  } catch (erro) {
    return traduz(erro)
  }
}

export async function acaoPedirEntrada(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  try {
    const sala = await controlarPedidoEntrada(texto(formData, 'codigo'))
    return { ok: true, id: sala.id }
  } catch (erro) {
    return traduz(erro)
  }
}

export async function acaoDecidirPedido(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  const roomId = texto(formData, 'roomId')
  const aceitar = texto(formData, 'decisao') === 'aceitar'
  return rodar(roomId, () => controlarDecisaoPedido(roomId, texto(formData, 'usuarioId'), aceitar))
}

export async function acaoSair(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  const roomId = texto(formData, 'roomId')
  return rodar(roomId, () => controlarSaida(roomId))
}

export async function acaoExpulsar(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  const roomId = texto(formData, 'roomId')
  return rodar(roomId, () => controlarExpulsao(roomId, texto(formData, 'usuarioId')))
}

export async function acaoPassarCargo(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  const roomId = texto(formData, 'roomId')
  return rodar(roomId, () => controlarPassagemCargo(roomId, texto(formData, 'usuarioId')))
}

export async function acaoDestruirSala(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  const roomId = texto(formData, 'roomId')
  return rodar(roomId, () => controlarDestruicao(roomId))
}

export async function acaoAnexarPersonagem(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  const roomId = texto(formData, 'roomId')
  return rodar(roomId, () => controlarAnexoPersonagem(roomId, texto(formData, 'characterId')))
}

export async function acaoAnexarNpc(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  const roomId = texto(formData, 'roomId')
  return rodar(roomId, () => controlarAnexoNpc(roomId, texto(formData, 'characterId')))
}

export async function acaoRemoverNpc(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  const roomId = texto(formData, 'roomId')
  const npcId = texto(formData, 'npcId')
  // O lobby mistura NPC de ficha e temporário; o tipo vem junto no form.
  const remover =
    texto(formData, 'tipo') === 'temporario' ? controlarRemocaoNpcTemporario : controlarRemocaoNpc
  return rodar(roomId, () => remover(roomId, npcId))
}

export async function acaoInstanciarNpc(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  const roomId = texto(formData, 'roomId')
  const entrada = {
    moldeId: texto(formData, 'moldeId'),
    quantidade: Number(formData.get('quantidade')),
  }
  return rodar(roomId, () => controlarInstanciacaoNpc(roomId, entrada))
}
