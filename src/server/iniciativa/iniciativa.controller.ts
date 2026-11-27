import { exigirUserId } from '@/server/auth/session'
import { ValidationError } from '@/server/http/errors'
import {
  abrirIniciativa,
  avancarIniciativa,
  cancelarIniciativa,
} from '@/server/iniciativa/iniciativa.abertura.service'
import {
  adicionarParticipante,
  finalizarIniciativa,
  passarVez,
} from '@/server/iniciativa/iniciativa.combate.service'
import {
  lerPainelIniciativa,
  type PainelIniciativa,
} from '@/server/iniciativa/iniciativa.leitura.service'
import {
  concederInspiracao,
  marcarModoDeRolagem,
  marcarMorteDoPersonagem,
  removerParticipante,
} from '@/server/iniciativa/iniciativa.mesa.service'
import {
  pausarSala,
  retomarSala,
  salaAtivaComoJogador,
  type SalaOcupada,
  solicitarPause,
} from '@/server/iniciativa/iniciativa.pausa.service'
import {
  rolarDesempate,
  rolarIniciativaDosNpcs,
  rolarMinhaIniciativa,
  usarInspiracao,
} from '@/server/iniciativa/iniciativa.rolagem.service'
import { eventBus, type TipoEventoSala } from '@/server/realtime/event-bus'
import { esquemaId } from '@/server/salas/salas.schema'

// Orquestração: sessão → validação de id → service → evento. O evento só avisa
// que algo mudou; o cliente refaz a leitura. Regras em docs/negocio/iniciativa.md.

function id(valor: string): string {
  const parsed = esquemaId.safeParse(valor)
  if (!parsed.success) throw new ValidationError('Identificador inválido.')
  return parsed.data
}

function avisar(tipo: TipoEventoSala, roomId: string, alvo?: string): void {
  eventBus.publicar({ tipo, roomId, alvo })
}

// Toda operação da iniciativa avisa a sala inteira com o mesmo evento.
async function mudarIniciativa(
  roomId: string,
  operacao: (userId: string, sala: string) => Promise<unknown>,
  evento: TipoEventoSala = 'initiative:changed',
): Promise<void> {
  const sala = id(roomId)
  await operacao(await exigirUserId(), sala)
  avisar(evento, sala)
}

export async function controlarAbertura(roomId: string, entrada: unknown): Promise<void> {
  return mudarIniciativa(roomId, (u, s) => abrirIniciativa(u, s, entrada))
}

export const controlarAvanco = (roomId: string): Promise<void> =>
  mudarIniciativa(roomId, avancarIniciativa)

export const controlarCancelamento = (roomId: string): Promise<void> =>
  mudarIniciativa(roomId, cancelarIniciativa)

export const controlarRolagemPropria = (roomId: string): Promise<void> =>
  mudarIniciativa(roomId, rolarMinhaIniciativa)

export const controlarRolagemDosNpcs = (roomId: string): Promise<void> =>
  mudarIniciativa(roomId, rolarIniciativaDosNpcs)

export const controlarInspiracaoUsada = (roomId: string): Promise<void> =>
  mudarIniciativa(roomId, usarInspiracao)

export const controlarDesempate = (roomId: string): Promise<void> =>
  mudarIniciativa(roomId, rolarDesempate)

export async function controlarConcessaoInspiracao(
  roomId: string,
  participantId: string,
): Promise<void> {
  const participante = id(participantId)
  return mudarIniciativa(roomId, (u, s) => concederInspiracao(u, s, participante))
}

export async function controlarModoRolagem(
  roomId: string,
  participantId: string,
  modo: unknown,
): Promise<void> {
  const participante = id(participantId)
  return mudarIniciativa(roomId, (u, s) => marcarModoDeRolagem(u, s, participante, modo))
}

export async function controlarRemocaoDaFila(roomId: string, participantId: string): Promise<void> {
  const participante = id(participantId)
  return mudarIniciativa(roomId, (u, s) => removerParticipante(u, s, participante))
}

export async function controlarMorte(roomId: string, characterId: string): Promise<void> {
  const personagem = id(characterId)
  await mudarIniciativa(roomId, (u, s) => marcarMorteDoPersonagem(u, s, personagem))
  avisar('character:changed', roomId)
}

export const controlarPasseDeVez = (roomId: string): Promise<void> =>
  mudarIniciativa(roomId, passarVez)

export const controlarFinalizacao = (roomId: string): Promise<void> =>
  mudarIniciativa(roomId, finalizarIniciativa)

export async function controlarEntradaNoMeio(roomId: string, entrada: unknown): Promise<void> {
  return mudarIniciativa(roomId, (u, s) => adicionarParticipante(u, s, entrada))
}

export const controlarPausa = (roomId: string): Promise<void> =>
  mudarIniciativa(roomId, pausarSala, 'room:paused')

export const controlarRetomada = (roomId: string): Promise<void> =>
  mudarIniciativa(roomId, retomarSala, 'room:resumed')

// O pedido vai à OUTRA mesa: só o mestre dela é avisado.
export async function controlarPedidoDePause(): Promise<void> {
  const { roomId, mestreId } = await solicitarPause(await exigirUserId())
  avisar('notification:new', roomId, mestreId)
}

// A mesa em que o usuário joga agora, se houver: só o próprio ocupado a vê.
export async function controlarSalaAtiva(): Promise<SalaOcupada | null> {
  return salaAtivaComoJogador(await exigirUserId())
}

// O combate da sala como a pessoa logada o vê (leitura: não avisa ninguém).
export async function controlarPainel(roomId: string): Promise<PainelIniciativa> {
  return lerPainelIniciativa(await exigirUserId(), id(roomId))
}
