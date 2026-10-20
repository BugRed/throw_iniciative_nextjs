import { z } from 'zod'

// Validação da ficha de personagem — um esquema por step do wizard + o esquema
// final que o service revalida (o client valida cedo, mas a fonte da verdade do
// cálculo é o server; ver docs/negocio/personagens-calculos.md).

const MSG_MIN = 'Mínimo 8 no point buy.'
const MSG_MAX = 'Máximo 15 no point buy.'

export const esquemaStepEspecie = z.object({
  especie: z.string().min(1, 'Escolha uma espécie.'),
})

export const esquemaStepClasse = z.object({
  classe: z.string().min(1, 'Escolha uma classe.'),
})

export const esquemaStepBackground = z.object({
  background: z.string().min(1, 'Escolha um antecedente.'),
})

export const esquemaAtributos = z.object({
  forca: z.number().int().min(8, MSG_MIN).max(15, MSG_MAX),
  destreza: z.number().int().min(8, MSG_MIN).max(15, MSG_MAX),
  constituicao: z.number().int().min(8, MSG_MIN).max(15, MSG_MAX),
  inteligencia: z.number().int().min(8, MSG_MIN).max(15, MSG_MAX),
  sabedoria: z.number().int().min(8, MSG_MIN).max(15, MSG_MAX),
  carisma: z.number().int().min(8, MSG_MIN).max(15, MSG_MAX),
})

export const esquemaStepPericias = z.object({
  pericias: z.array(z.string()).default([]),
})

export const esquemaStepMagias = z.object({
  magias: z.array(z.string()).default([]),
})

export const esquemaStepEquipamento = z.object({
  equipamento: z.array(z.string()).default([]),
})

export const esquemaStepFeats = z.object({
  feats: z.array(z.string()).default([]),
})

export const esquemaStepRevisao = z.object({
  nome: z.string().trim().min(1, 'Nome obrigatório.').max(50, 'Máximo 50 caracteres.'),
  visivelAoMestre: z.boolean().default(true),
})

export const esquemaPersonagemNovo = z
  .object({
    ...esquemaStepEspecie.shape,
    ...esquemaStepClasse.shape,
    ...esquemaStepBackground.shape,
    atributos: esquemaAtributos,
    ...esquemaStepPericias.shape,
    ...esquemaStepMagias.shape,
    ...esquemaStepEquipamento.shape,
    ...esquemaStepFeats.shape,
    ...esquemaStepRevisao.shape,
  })
  .superRefine((dados, ctx) => {
    if (custoTotalPointBuy(dados.atributos) > 27) {
      ctx.addIssue({
        code: 'custom',
        path: ['atributos'],
        message: 'Custo total dos atributos passa de 27 pontos.',
      })
    }
  })

export type PersonagemNovo = z.infer<typeof esquemaPersonagemNovo>

export const esquemaEdicaoPersonagem = z.object({
  nome: z.string().trim().min(1).max(50).optional(),
  nivel: z.number().int().min(1).max(20).optional(),
  visivelAoMestre: z.boolean().optional(),
  feats: z.array(z.string()).optional(),
})

export type EdicaoPersonagem = z.infer<typeof esquemaEdicaoPersonagem>

export const ATRIBUTOS = [
  'forca',
  'destreza',
  'constituicao',
  'inteligencia',
  'sabedoria',
  'carisma',
] as const

// Point buy oficial: custo individual por valor (8 é grátis) — ver regra de negócio.
const CUSTOS_POINT_BUY: Record<number, number> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
}

export function custoPointBuy(valor: number): number {
  return CUSTOS_POINT_BUY[valor] ?? Number.POSITIVE_INFINITY
}

export function custoTotalPointBuy(atributos: Record<(typeof ATRIBUTOS)[number], number>): number {
  return ATRIBUTOS.reduce((total, chave) => total + custoPointBuy(atributos[chave]), 0)
}
