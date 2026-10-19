import path from 'node:path'

import { defineConfig } from 'prisma/config'

// Com `prisma.config.ts`, o Prisma NÃO carrega o `.env` automaticamente — a gente
// carrega aqui. `process.loadEnvFile` é nativo do Node (>= 20.12) e evita depender
// de pacotes extras. Carrega `.env` e depois `.env.local` (este tem precedência);
// ignora se o arquivo não existir — no fluxo Docker as variáveis podem já vir
// injetadas no ambiente do container.
for (const file of ['.env', '.env.local']) {
  try {
    process.loadEnvFile(file)
  } catch {
    // arquivo ausente — segue com o que já estiver em process.env
  }
}

// Configuração do Prisma (substitui o bloco `prisma` do package.json, que foi
// descontinuado). Dois pontos importam para o padrão modular do boilerplate:
//
//   • `schema` aponta para a PASTA `prisma/schema/` — habilita o schema em
//     múltiplos arquivos (um por domínio).
//   • `migrations.seed` define o comando do seed modular em `prisma/seed/`.
//     Usa `tsx` para rodar o TypeScript direto (dependência de dev).
export default defineConfig({
  schema: path.join('prisma', 'schema'),
  migrations: {
    seed: 'tsx prisma/seed/index.ts',
  },
})
