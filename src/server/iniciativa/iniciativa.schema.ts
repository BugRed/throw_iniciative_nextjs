import { z } from 'zod'

import { esquemaId } from '@/server/salas/salas.schema'

// Regras vigentes em docs/negocio/iniciativa.md.

// Quem o mestre desmarcou: id do personagem (PJ ou NPC de ficha) ou do NPC temporário.
export const esquemaAbertura = z.object({
  excluir: z.array(esquemaId).max(100).default([]),
})

export const esquemaModoRolagem = z.enum(['normal', 'advantage', 'disadvantage'])

// Quem entra no meio: um personagem da sala (PJ ou NPC de ficha) ou um NPC temporário.
export const esquemaEntrante = z.union([
  z.object({ characterId: esquemaId }).strict(),
  z.object({ tempNpcId: esquemaId }).strict(),
])

export type AberturaEntrada = z.infer<typeof esquemaAbertura>
