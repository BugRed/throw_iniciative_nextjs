// Baixa os 9 JSON do SRD 5.2 (pasta 2024 do repo 5e-bits/5e-database) para
// prisma/seed/srd-data/. O commit é PINADO: mesma versão dos dados para sempre,
// independentemente do que o upstream fizer. Para atualizar, mude o SHA e rode
// de novo (o seeder re-upserta por slug).
//
// Conteúdo CC-BY 4.0 (Wizards of the Coast) — a atribuição obrigatória está no
// rodapé da landing e em docs/contexto.md.

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const COMMIT = 'a6212beb4b278917c2cff41c2b04c4ef4f3e0d6f'
const BASE = `https://raw.githubusercontent.com/5e-bits/5e-database/${COMMIT}/src/2024/en`
const DESTINO = path.join('prisma', 'seed', 'srd-data')

const ARQUIVOS = [
  'Species',
  'Classes',
  'Subclasses',
  'Features',
  'Backgrounds',
  'Feats',
  'Spells',
  'Equipment',
  'Monsters',
]

await mkdir(DESTINO, { recursive: true })

for (const nome of ARQUIVOS) {
  const url = `${BASE}/5e-SRD-${nome}.json`
  const resposta = await fetch(url)
  if (!resposta.ok) {
    console.error(`✗ ${nome}: HTTP ${resposta.status} em ${url}`)
    console.error('  Confira a rede e tente de novo: yarn srd:fetch')
    process.exit(1)
  }
  const texto = await resposta.text()
  // Falha cedo se a resposta não é JSON válido (proxy/HTML de erro etc.).
  JSON.parse(texto)
  const destino = path.join(DESTINO, `${nome}.json`)
  await writeFile(destino, texto)
  console.log(`✓ ${destino} (${(texto.length / 1024).toFixed(0)} KB)`)
}

console.log(`\nSRD 5.2 baixado (commit ${COMMIT.slice(0, 8)}). Rode yarn db:seed para popular.`)
