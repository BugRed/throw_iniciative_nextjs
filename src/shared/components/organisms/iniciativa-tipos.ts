import type { AcaoFormulario } from '@/shared/lib/estado-acao'

// Dados e ações que a página entrega ao combate. Espelham a leitura do
// servidor (iniciativa.leitura.service), mas moram aqui para a UI não importar
// a camada server.

export type StatusIniciativa = 'draft' | 'rolling' | 'ordered' | 'active' | 'finished' | 'cancelled'

export type ModoRolagem = 'normal' | 'advantage' | 'disadvantage'

export type ParticipanteDados = {
  id: string
  rotulo: string
  tipo: 'pj' | 'npc'
  characterId: string | null
  total: number | null
  modificador: number
  rolou: boolean
  jogou: boolean
  modo: ModoRolagem
  inspiracao: boolean
  desempatePendente: boolean
  ehMeu: boolean
}

export type IniciativaDados = {
  status: StatusIniciativa
  rodada: number
  pausada: boolean
  participantes: ParticipanteDados[]
  daVezId: string | null
  proximoId: string | null
}

export type CandidatoDados = {
  id: string
  rotulo: string
  campo: 'characterId' | 'tempNpcId'
}

export type PainelIniciativaDados = {
  ehMestre: boolean
  atual: IniciativaDados | null
  candidatos: CandidatoDados[]
}

export type AcoesIniciativa = {
  abrir: AcaoFormulario
  avancar: AcaoFormulario
  cancelar: AcaoFormulario
  rolarMinha: AcaoFormulario
  rolarNpcs: AcaoFormulario
  usarInspiracao: AcaoFormulario
  rolarDesempate: AcaoFormulario
  concederInspiracao: AcaoFormulario
  modoRolagem: AcaoFormulario
  removerDaFila: AcaoFormulario
  marcarMorte: AcaoFormulario
  passarVez: AcaoFormulario
  finalizar: AcaoFormulario
  adicionar: AcaoFormulario
  pausar: AcaoFormulario
  retomar: AcaoFormulario
}

export const ROTULO_STATUS_INICIATIVA: Record<StatusIniciativa, string> = {
  draft: 'Preparando',
  rolling: 'Rolagens abertas',
  ordered: 'Ordem definida',
  active: 'Em combate',
  finished: 'Finalizada',
  cancelled: 'Cancelada',
}

// O botão de avançar muda de nome com a fase que ele encerra.
export const ROTULO_AVANCO: Partial<Record<StatusIniciativa, string>> = {
  draft: 'Abrir rolagens',
  rolling: 'Ordenar',
  ordered: 'Começar combate',
}

export const ROTULO_MODO: Record<ModoRolagem, string> = {
  normal: 'Normal',
  advantage: 'Vantagem',
  disadvantage: 'Desvantagem',
}
