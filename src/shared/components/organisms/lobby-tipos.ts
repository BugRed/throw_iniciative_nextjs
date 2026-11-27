import type { OpcaoSelect } from '@/shared/components/atoms/Select'
import type { AcaoFormulario } from '@/shared/lib/estado-acao'

// Dados e ações que a página entrega ao lobby. Os tipos espelham a leitura do
// servidor, mas moram aqui para a UI não importar a camada server.

export type MembroLobbyDados = {
  userId: string
  nome: string
  papel: 'master' | 'player'
  pj: { nome: string; classe: string; nivel: number } | null
}

export type NpcLobbyDados = {
  id: string
  rotulo: string
  tipo: 'persistente' | 'temporario'
  stats?: { hpMax: number; armorClass: number; initiativeMod: number }
}

export type LobbyDados = {
  sala: { id: string; name: string; status: string; codigo: string | null }
  ehMestre: boolean
  membros: MembroLobbyDados[]
  pedidos: { userId: string; nome: string }[]
  npcs: NpcLobbyDados[]
}

export type AcoesLobby = {
  decidirPedido: AcaoFormulario
  expulsar: AcaoFormulario
  passarCargo: AcaoFormulario
  sair: AcaoFormulario
  destruir: AcaoFormulario
  anexarPersonagem: AcaoFormulario
  anexarNpc: AcaoFormulario
  removerNpc: AcaoFormulario
  instanciarNpc: AcaoFormulario
}

// O que cada papel pode escolher nos seletores: PJs próprios (jogador) e
// NPCs/moldes próprios (mestre).
export type OpcoesLobby = {
  personagens: OpcaoSelect[]
  npcsFicha: OpcaoSelect[]
  moldes: OpcaoSelect[]
}

export const ROTULO_STATUS_SALA: Record<string, string> = {
  lobby: 'Lobby',
  active: 'Em andamento',
  paused: 'Pausada',
  finished: 'Encerrada',
}
