'use server'

import { revalidatePath } from 'next/cache'

import { AppError } from '@/server/http/errors'
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
  controlarPasseDeVez,
  controlarPausa,
  controlarPedidoDePause,
  controlarRemocaoDaFila,
  controlarRetomada,
  controlarRolagemDosNpcs,
  controlarRolagemPropria,
} from '@/server/iniciativa/iniciativa.controller'
import type { EstadoAcao } from '@/shared/lib/estado-acao'

// Server Actions da iniciativa: traduzem FormData e delegam ao controller.
// Regras em docs/negocio/iniciativa.md.

type Estado = EstadoAcao | null

// O mestre vê QUEM está ocupado em outra sala ativa, nunca qual mesa.
function mensagem(erro: unknown): string {
  if (!(erro instanceof AppError)) return 'Algo falhou. Tente de novo.'
  const ocupados = (erro.detalhes as { ocupados?: { nome: string }[] } | undefined)?.ocupados
  if (!ocupados?.length) return erro.message
  return `${erro.message} Ocupados: ${ocupados.map((o) => o.nome).join(', ')}.`
}

function campo(formData: FormData, nome: string): string {
  return String(formData.get(nome) ?? '')
}

// Toda operação da mesa: roda no controller, recarrega a sala e traduz o erro.
async function naSala(
  formData: FormData,
  operacao: (roomId: string) => Promise<unknown>,
): Promise<EstadoAcao> {
  const roomId = campo(formData, 'roomId')
  try {
    await operacao(roomId)
    revalidatePath(`/rooms/${roomId}`)
    return { ok: true, id: roomId }
  } catch (erro) {
    return { erro: mensagem(erro) }
  }
}

// A tela manda todos os candidatos e os que ficaram marcados; fora fica o resto.
export async function acaoAbrirIniciativa(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  const incluidos = new Set(formData.getAll('incluir').map(String))
  const excluir = formData
    .getAll('candidato')
    .map(String)
    .filter((id) => !incluidos.has(id))
  return naSala(formData, (roomId) => controlarAbertura(roomId, { excluir }))
}

export async function acaoAvancarIniciativa(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  return naSala(formData, controlarAvanco)
}

export async function acaoCancelarIniciativa(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  return naSala(formData, controlarCancelamento)
}

export async function acaoRolarMinha(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  return naSala(formData, controlarRolagemPropria)
}

export async function acaoRolarNpcs(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  return naSala(formData, controlarRolagemDosNpcs)
}

export async function acaoUsarInspiracao(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  return naSala(formData, controlarInspiracaoUsada)
}

export async function acaoRolarDesempate(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  return naSala(formData, controlarDesempate)
}

export async function acaoConcederInspiracao(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  const participante = campo(formData, 'participantId')
  return naSala(formData, (roomId) => controlarConcessaoInspiracao(roomId, participante))
}

export async function acaoModoRolagem(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  const participante = campo(formData, 'participantId')
  const modo = campo(formData, 'modo')
  return naSala(formData, (roomId) => controlarModoRolagem(roomId, participante, modo))
}

export async function acaoRemoverDaFila(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  const participante = campo(formData, 'participantId')
  return naSala(formData, (roomId) => controlarRemocaoDaFila(roomId, participante))
}

export async function acaoMarcarMorte(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  const personagem = campo(formData, 'characterId')
  return naSala(formData, (roomId) => controlarMorte(roomId, personagem))
}

export async function acaoPassarVez(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  return naSala(formData, controlarPasseDeVez)
}

export async function acaoFinalizarIniciativa(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  return naSala(formData, controlarFinalizacao)
}

// O seletor junta tipo e id num valor só ("characterId:<id>" ou "tempNpcId:<id>");
// o schema do servidor valida o objeto resultante.
export async function acaoAdicionarParticipante(
  _e: Estado,
  formData: FormData,
): Promise<EstadoAcao> {
  const [chave, id] = campo(formData, 'entrante').split(':')
  return naSala(formData, (roomId) => controlarEntradaNoMeio(roomId, { [chave]: id }))
}

export async function acaoPausarSala(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  return naSala(formData, controlarPausa)
}

export async function acaoRetomarSala(_e: Estado, formData: FormData): Promise<EstadoAcao> {
  return naSala(formData, controlarRetomada)
}

export async function acaoSolicitarPause(_e: Estado): Promise<EstadoAcao> {
  try {
    await controlarPedidoDePause()
    return { ok: true, id: 'pause' }
  } catch (erro) {
    return { erro: mensagem(erro) }
  }
}
