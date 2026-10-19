import { PrismaClient } from '@prisma/client'

import { env } from '@/shared/lib/env'

// Singleton do Prisma Client para o app (rotas/servidor). Em dev o hot-reload do
// Next reavalia os módulos a cada mudança; sem cache global isso abriria uma nova
// conexão por reload e esgotaria o pool do Postgres. Guardamos a instância no
// globalThis fora de produção. O import de env valida o ambiente no boot do
// acesso a banco (ponto único de validação do repo).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
