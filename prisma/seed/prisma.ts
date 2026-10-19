import { PrismaClient } from '@prisma/client'

// Instância única do PrismaClient para o processo de seed.
// Cada seeder importa daqui em vez de criar o seu próprio client.
export const prisma = new PrismaClient()
