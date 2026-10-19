// import { prisma } from '../prisma'

// ARQUIVO DE EXEMPLO — um seeder por domínio.
//
// Copie este arquivo com o nome do seu domínio (ex.: `user.seeder.ts`),
// registre-o no `index.ts` e apague este `example.seeder.ts`.
//
// Regras:
//   • Use `upsert` (não `create`) para o seed ser idempotente — rodar duas
//     vezes não deve duplicar dados nem quebrar.
//   • Se outros seeders dependem do que este cria, retorne os registros para o
//     orquestrador repassar adiante (ex.: seções precisam do id da área).

export async function seedExample() {
  // const example = await prisma.example.upsert({
  //   where: { name: 'exemplo' },
  //   update: {},
  //   create: { name: 'exemplo' },
  // })
  // return example

  console.log('  ↳ example.seeder: substitua pelo seed do seu domínio')
}
