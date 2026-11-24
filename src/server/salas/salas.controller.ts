import type { Room } from '@prisma/client'

import { exigirUserId } from '@/server/auth/session'
import { ValidationError } from '@/server/http/errors'
import { eventBus, type TipoEventoSala } from '@/server/realtime/event-bus'
import { criarFluxoSse } from '@/server/realtime/sse'
import {
  anexarNpcPersistente,
  anexarPersonagem,
  instanciarNpcTemporario,
  removerNpcPersistente,
  removerNpcTemporario,
} from '@/server/salas/salas.elenco.service'
import {
  listarMinhasSalas,
  type LobbyView,
  obterLobby,
  statusParaAssinar,
} from '@/server/salas/salas.lobby.service'
import {
  decidirPedido,
  expulsarMembro,
  passarCargo,
  sairDaSala,
} from '@/server/salas/salas.membros.service'
import { esquemaId } from '@/server/salas/salas.schema'
import { criarSala, destruirSala, pedirEntrada } from '@/server/salas/salas.service'

// Orquestração: sessão → validação de id → service → evento. O evento sai
// depois do commit (o service já retornou), então quem recebe e refaz a leitura
// enxerga o estado novo. Regras em docs/negocio/salas.md.

function id(valor: string): string {
  const parsed = esquemaId.safeParse(valor)
  if (!parsed.success) throw new ValidationError('Identificador inválido.')
  return parsed.data
}

function avisar(tipo: TipoEventoSala, roomId: string, alvo?: string): void {
  eventBus.publicar({ tipo, roomId, alvo })
}

export async function controlarCriacaoSala(entrada: unknown): Promise<Room> {
  return criarSala(await exigirUserId(), entrada)
}

export async function controlarPedidoEntrada(codigo: string): Promise<Room> {
  const sala = await pedirEntrada(await exigirUserId(), codigo)
  // Só o mestre é avisado do pedido; os demais membros não precisam saber.
  if (sala.masterUserId) avisar('member:requested', sala.id, sala.masterUserId)
  return sala
}

export async function controlarDecisaoPedido(
  roomId: string,
  usuarioId: string,
  aceitar: boolean,
): Promise<void> {
  const [sala, usuario] = [id(roomId), id(usuarioId)]
  await decidirPedido(await exigirUserId(), sala, usuario, aceitar)
  // O aceito ainda era `pending` na hora do commit: recebe o evento endereçado a ele;
  // os membros ativos recebem o aviso geral de que a sala ganhou alguém.
  if (aceitar) avisar('member:joined', sala)
  avisar(aceitar ? 'member:joined' : 'member:rejected', sala, usuario)
}

export async function controlarSaida(roomId: string): Promise<void> {
  const [sala, userId] = [id(roomId), await exigirUserId()]
  await sairDaSala(userId, sala)
  avisar('member:left', sala)
  eventBus.desconectar(sala, userId)
}

export async function controlarExpulsao(roomId: string, usuarioId: string): Promise<void> {
  const [sala, usuario] = [id(roomId), id(usuarioId)]
  await expulsarMembro(await exigirUserId(), sala, usuario)
  avisar('member:kicked', sala)
  eventBus.desconectar(sala, usuario)
}

export async function controlarPassagemCargo(roomId: string, novoMestreId: string): Promise<void> {
  const [sala, novo] = [id(roomId), id(novoMestreId)]
  await passarCargo(await exigirUserId(), sala, novo)
  avisar('master:transferred', sala)
}

export async function controlarDestruicao(roomId: string): Promise<void> {
  const sala = id(roomId)
  await destruirSala(await exigirUserId(), sala)
  avisar('room:destroyed', sala)
}

export async function controlarAnexoPersonagem(roomId: string, characterId: string): Promise<void> {
  const [sala, personagem] = [id(roomId), id(characterId)]
  await anexarPersonagem(await exigirUserId(), sala, personagem)
  avisar('character:changed', sala)
}

export async function controlarAnexoNpc(roomId: string, characterId: string): Promise<void> {
  const [sala, personagem] = [id(roomId), id(characterId)]
  await anexarNpcPersistente(await exigirUserId(), sala, personagem)
  avisar('npc:added', sala)
}

export async function controlarRemocaoNpc(roomId: string, characterId: string): Promise<void> {
  const [sala, personagem] = [id(roomId), id(characterId)]
  await removerNpcPersistente(await exigirUserId(), sala, personagem)
  avisar('npc:removed', sala)
}

export async function controlarInstanciacaoNpc(roomId: string, entrada: unknown): Promise<number> {
  const sala = id(roomId)
  const criados = await instanciarNpcTemporario(await exigirUserId(), sala, entrada)
  avisar('npc:added', sala)
  return criados
}

export async function controlarRemocaoNpcTemporario(
  roomId: string,
  tempNpcId: string,
): Promise<void> {
  const [sala, npc] = [id(roomId), id(tempNpcId)]
  await removerNpcTemporario(await exigirUserId(), sala, npc)
  avisar('npc:removed', sala)
}

export async function controlarLobby(roomId: string): Promise<LobbyView> {
  return obterLobby(await exigirUserId(), id(roomId))
}

export async function controlarMinhasSalas(): Promise<Pick<Room, 'id' | 'name' | 'status'>[]> {
  return listarMinhasSalas(await exigirUserId())
}

export async function controlarAssinatura(
  roomId: string,
  signal: AbortSignal,
): Promise<ReadableStream<Uint8Array>> {
  const [sala, userId] = [id(roomId), await exigirUserId()]
  const status = await statusParaAssinar(userId, sala)
  return criarFluxoSse({ bus: eventBus, roomId: sala, userId, ativo: status === 'active', signal })
}
