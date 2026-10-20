// Tipos e constantes do wizard de personagem — separados para nenhum arquivo
// estourar o limite de tamanho e para a etapa e o organismo compartilharem.

import { ATRIBUTOS } from '@/server/personagens/personagens.schema'
import type { Opcao } from '@/shared/components/organisms/etapas-wizard'

export type ClasseWizard = Opcao & {
  hitDie: number
  caster: boolean
  pericias: { escolher: number; opcoes: Opcao[] }
}

export type DadosWizard = {
  especies: Opcao[]
  classes: ClasseWizard[]
  subclasses: Array<Opcao & { classeSlug: string }>
  backgrounds: Opcao[]
  magiasNivel1: Opcao[]
  equipamentos: Opcao[]
}

export type EstadoWizard = {
  etapa: number
  especie: string
  classe: string
  background: string
  atributos: Record<(typeof ATRIBUTOS)[number], number>
  pericias: string[]
  magias: string[]
  equipamento: string[]
  nome: string
  visivel: boolean
}

export const ETAPAS = [
  { titulo: 'Espécie', curta: 'Espécie' },
  { titulo: 'Classe', curta: 'Classe' },
  { titulo: 'Subclasse', curta: 'Subclasse' },
  { titulo: 'Antecedente', curta: 'Origem' },
  { titulo: 'Atributos (point buy)', curta: 'Atributos' },
  { titulo: 'Perícias', curta: 'Perícias' },
  { titulo: 'Magias', curta: 'Magias' },
  { titulo: 'Equipamento', curta: 'Equip.' },
  { titulo: 'Feats', curta: 'Feats' },
  { titulo: 'Revisão', curta: 'Revisão' },
]

export const ATRIBUTO_INICIAL: Record<(typeof ATRIBUTOS)[number], number> = {
  forca: 8,
  destreza: 8,
  constituicao: 8,
  inteligencia: 8,
  sabedoria: 8,
  carisma: 8,
}

export const ESTADO_INICIAL: EstadoWizard = {
  etapa: 0,
  especie: '',
  classe: '',
  background: '',
  atributos: ATRIBUTO_INICIAL,
  pericias: [],
  magias: [],
  equipamento: [],
  nome: '',
  visivel: true,
}
