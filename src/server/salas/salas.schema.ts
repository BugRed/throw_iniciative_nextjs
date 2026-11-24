import { z } from 'zod'

// Regras vigentes em docs/negocio/salas.md.

export const esquemaNovaSala = z.object({
  nome: z.string().trim().min(1, 'Nome obrigatório.').max(50, 'Máximo 50 caracteres.'),
})

export const esquemaInstanciacao = z.object({
  moldeId: z.string().uuid('Molde inválido.'),
  quantidade: z.number().int().min(1, 'Mínimo 1.').max(20, 'Máximo 20 por vez.'),
})

export type NovaSalaEntrada = z.infer<typeof esquemaNovaSala>
export type InstanciacaoEntrada = z.infer<typeof esquemaInstanciacao>

// Todo id que chega de fora é validado antes do Prisma: um uuid malformado
// viraria erro 500 do banco em vez de 404/422.
export const esquemaId = z.string().uuid('Identificador inválido.')
