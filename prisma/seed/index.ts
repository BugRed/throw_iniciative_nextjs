import { access } from 'node:fs/promises'
import path from 'node:path'

import { prisma } from './prisma'
import { seedSrd } from './seeders/srd.seeder'

// Orquestrador do seed.
//
// Padrão modular: cada domínio tem o seu arquivo em `seeders/`, e aqui a gente
// só decide a ORDEM de execução (importante quando um seeder depende de outro).
// Ao criar um seeder novo, importe-o acima e chame-o dentro de `main()`.

async function main() {
  console.log('🌱 Iniciando o seed do banco de dados...')

  const srdPresente = await access(path.join('prisma', 'seed', 'srd-data')).then(
    () => true,
    () => false,
  )
  if (srdPresente) {
    await seedSrd()
  } else {
    console.warn('⚠ prisma/seed/srd-data ausente — SRD não semeado. Rode: yarn srd:fetch')
  }

  console.log('🎉 Seed concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
