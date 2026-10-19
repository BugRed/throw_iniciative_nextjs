import { prisma } from './prisma'
import { seedExample } from './seeders/example.seeder'

// Orquestrador do seed.
//
// Padrão modular: cada domínio tem o seu arquivo em `seeders/`, e aqui a gente
// só decide a ORDEM de execução (importante quando um seeder depende de outro).
// Ao criar um seeder novo, importe-o acima e chame-o dentro de `main()`.

async function main() {
  console.log('🌱 Iniciando o seed do banco de dados...')

  await seedExample()

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
