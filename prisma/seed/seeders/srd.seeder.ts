import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { prisma } from '../prisma'

// Seeder do SRD 5.2 (fonte: 5e-bits/5e-database, pasta 2024, baixada por
// `yarn srd:fetch`). Tolerante a item ruim: cada item é upsertado por `slug`
// em try/catch próprio; o relatório final diz quem falhou e por quê —
// um campo inesperado na fonte não derruba a importação inteira
// (mitigação do risco "fonte muda formato" do plano).

type Ref = { index: string; name?: string }
type Relatorio = { tabela: string; ok: number; falha: Array<[string, string]> }

const DIRETORIO = path.join('prisma', 'seed', 'srd-data')

async function lerJson(nome: string): Promise<Array<Record<string, unknown>>> {
  const texto = await readFile(path.join(DIRETORIO, `${nome}.json`), 'utf-8')
  return JSON.parse(texto) as Array<Record<string, unknown>>
}

// O nível chega como objeto nível-do-API ("barbarian-1" / nome "Barbarian 1");
// o número é o sufixo do index.
function nivelDaFeature(level: Ref | undefined): number {
  if (!level?.index) return 1
  const sufixo = level.index.split('-').pop()
  const nivel = Number.parseInt(sufixo ?? '1', 10)
  return Number.isNaN(nivel) ? 1 : nivel
}

function nomeDeCategorias(categorias: Array<Ref> | undefined): string {
  return (categorias ?? []).map((c) => c.name ?? c.index).join(', ')
}

async function upsertTolerante<T>(
  relatorio: Relatorio,
  slug: string,
  operacao: () => Promise<T>,
): Promise<void> {
  try {
    await operacao()
    relatorio.ok += 1
  } catch (erro) {
    relatorio.falha.push([
      slug || '(sem index)',
      erro instanceof Error ? erro.message : String(erro),
    ])
  }
}

export async function seedSrd(): Promise<void> {
  const [
    dadosSpecies,
    dadosClasses,
    dadosSubclasses,
    dadosFeatures,
    dadosBackgrounds,
    dadosFeats,
    dadosSpells,
    dadosEquipment,
    dadosMonsters,
  ] = await Promise.all([
    lerJson('Species'),
    lerJson('Classes'),
    lerJson('Subclasses'),
    lerJson('Features'),
    lerJson('Backgrounds'),
    lerJson('Feats'),
    lerJson('Spells'),
    lerJson('Equipment'),
    lerJson('Monsters'),
  ])

  // classes primeiro: subclasses e features penduram nelas por FK
  const classes: Relatorio = { tabela: 'srd_classes', ok: 0, falha: [] }
  const slugParaIdClasse = new Map<string, string>()
  for (const item of dadosClasses) {
    const slug = String(item.index ?? '')
    await upsertTolerante(classes, slug, () =>
      prisma.srdClass.upsert({
        where: { slug },
        update: {
          name: String(item.name ?? slug),
          hitDie: Number(item.hit_die ?? 8),
          payload: item as object,
        },
        create: {
          slug,
          name: String(item.name ?? slug),
          hitDie: Number(item.hit_die ?? 8),
          payload: item as object,
        },
      }),
    )
    const registro = await prisma.srdClass.findUnique({ where: { slug }, select: { id: true } })
    if (registro) slugParaIdClasse.set(slug, registro.id)
  }
  const idDaClasse = (slug: string | undefined): string | null =>
    slug ? (slugParaIdClasse.get(slug) ?? null) : null

  const especies: Relatorio = { tabela: 'srd_species', ok: 0, falha: [] }
  for (const item of dadosSpecies) {
    const slug = String(item.index ?? '')
    const dados = { slug, name: String(item.name ?? slug), payload: item as object }
    await upsertTolerante(especies, slug, () =>
      prisma.srdSpecies.upsert({ where: { slug }, update: dados, create: dados }),
    )
  }

  const subclasses: Relatorio = { tabela: 'srd_subclasses', ok: 0, falha: [] }
  const slugParaIdSubclass = new Map<string, string>()
  for (const item of dadosSubclasses) {
    const slug = String(item.index ?? '')
    const srdClassId = idDaClasse((item.class as Ref | undefined)?.index)
    if (!srdClassId) {
      subclasses.falha.push([
        slug,
        `classe '${String((item.class as Ref | undefined)?.index)}' não importada`,
      ])
      continue
    }
    const dados = {
      slug,
      name: String(item.name ?? slug),
      levelGained: null,
      payload: item as object,
      srdClassId,
    }
    await upsertTolerante(subclasses, slug, () =>
      prisma.srdSubclass.upsert({ where: { slug }, update: dados, create: dados }),
    )
    const registro = await prisma.srdSubclass.findUnique({ where: { slug }, select: { id: true } })
    if (registro) slugParaIdSubclass.set(slug, registro.id)
  }

  const features: Relatorio = { tabela: 'srd_class_features', ok: 0, falha: [] }
  for (const item of dadosFeatures) {
    const slug = String(item.index ?? '')
    const srdClassId = idDaClasse((item.class as Ref | undefined)?.index)
    if (!srdClassId) {
      features.falha.push([
        slug,
        `classe '${String((item.class as Ref | undefined)?.index)}' não importada`,
      ])
      continue
    }
    const subclassSlug = (item.subclass as Ref | undefined)?.index
    const dados = {
      slug,
      name: String(item.name ?? slug),
      level: nivelDaFeature(item.level as Ref | undefined),
      payload: item as object,
      srdClassId,
      srdSubclassId: subclassSlug ? (slugParaIdSubclass.get(subclassSlug) ?? null) : null,
    }
    await upsertTolerante(features, slug, () =>
      prisma.srdClassFeature.upsert({ where: { slug }, update: dados, create: dados }),
    )
  }

  const backgrounds: Relatorio = { tabela: 'srd_backgrounds', ok: 0, falha: [] }
  for (const item of dadosBackgrounds) {
    const slug = String(item.index ?? '')
    const dados = { slug, name: String(item.name ?? slug), payload: item as object }
    await upsertTolerante(backgrounds, slug, () =>
      prisma.srdBackground.upsert({ where: { slug }, update: dados, create: dados }),
    )
  }

  const feats: Relatorio = { tabela: 'srd_feats', ok: 0, falha: [] }
  for (const item of dadosFeats) {
    const slug = String(item.index ?? '')
    const dados = { slug, name: String(item.name ?? slug), payload: item as object }
    await upsertTolerante(feats, slug, () =>
      prisma.srdFeat.upsert({ where: { slug }, update: dados, create: dados }),
    )
  }

  const spells: Relatorio = { tabela: 'srd_spells', ok: 0, falha: [] }
  for (const item of dadosSpells) {
    const slug = String(item.index ?? '')
    const dados = {
      slug,
      name: String(item.name ?? slug),
      level: Number(item.level ?? 0),
      school: String((item.school as Ref | undefined)?.index ?? 'none'),
      payload: item as object,
    }
    await upsertTolerante(spells, slug, () =>
      prisma.srdSpell.upsert({ where: { slug }, update: dados, create: dados }),
    )
  }

  const equipamentos: Relatorio = { tabela: 'srd_equipment', ok: 0, falha: [] }
  for (const item of dadosEquipment) {
    const slug = String(item.index ?? '')
    const dados = {
      slug,
      name: String(item.name ?? slug),
      category: nomeDeCategorias(item.equipment_categories as Array<Ref> | undefined),
      payload: item as object,
    }
    await upsertTolerante(equipamentos, slug, () =>
      prisma.srdEquipment.upsert({ where: { slug }, update: dados, create: dados }),
    )
  }

  const monstros: Relatorio = { tabela: 'srd_monsters', ok: 0, falha: [] }
  for (const item of dadosMonsters) {
    const slug = String(item.index ?? '')
    const dados = {
      slug,
      name: String(item.name ?? slug),
      challengeRating: item.challenge_rating === undefined ? null : Number(item.challenge_rating),
      type: item.type ? String(item.type) : null,
      payload: item as object,
    }
    await upsertTolerante(monstros, slug, () =>
      prisma.srdMonster.upsert({ where: { slug }, update: dados, create: dados }),
    )
  }

  const relatorios = [
    especies,
    classes,
    subclasses,
    features,
    backgrounds,
    feats,
    spells,
    equipamentos,
    monstros,
  ]
  console.log('📚 SRD 5.2 — relatório por tabela:')
  for (const r of relatorios) {
    const falhas = r.falha.length
      ? ` · ${r.falha.length} falha(s): ${r.falha
          .slice(0, 3)
          .map(([slug, msg]) => `${slug} (${msg})`)
          .join('; ')}${r.falha.length > 3 ? '…' : ''}`
      : ''
    console.log(`  ${r.tabela}: ${r.ok} ok${falhas}`)
  }
  const totalFalhas = relatorios.reduce((soma, r) => soma + r.falha.length, 0)
  if (totalFalhas > 0) {
    console.warn(`⚠ ${totalFalhas} item(ns) do SRD falharam — ver relatório acima`)
  }
}
