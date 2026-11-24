import { z } from 'zod'

// Molde de NPC Respawn: o stat block resumido vira colunas (o combate lê
// direto), o resto do monstro vai em `statblock` (docs/negocio/npcs.md).

export const esquemaMoldeNpc = z.object({
  nome: z.string().trim().min(1, 'Nome obrigatório.').max(50, 'Máximo 50 caracteres.'),
  hpMax: z.number().int().min(1, 'PV mínimo 1.').max(9999, 'PV máximo 9999.'),
  armorClass: z.number().int().min(0, 'CA mínima 0.').max(40, 'CA máxima 40.'),
  initiativeMod: z.number().int().min(-5, 'Mínimo -5.').max(20, 'Máximo +20.'),
  monstroSlug: z.string().min(1).optional(),
})

export type MoldeNpcEntrada = z.infer<typeof esquemaMoldeNpc>
