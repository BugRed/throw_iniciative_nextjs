import type { SrdClass, SrdFeat, SrdSpecies } from '@prisma/client'

import { prisma } from '@/server/db/prisma'

// Consulta pura de referência do SRD 5.2 — sem regra de negócio, sem mutação.
// As tabelas srd_* são somente leitura por construção: nenhum service escreve.

export type SrdItemResumo = {
  id: string
  slug: string
  name: string
}

export type SrdClasseResumo = SrdItemResumo & {
  hitDie: number
}

export type SrdSubclassResumo = SrdItemResumo & {
  levelGained: number | null
}

export type SrdMagiaResumo = SrdItemResumo & {
  level: number
  school: string
}

export type SrdMonstroResumo = SrdItemResumo & {
  challengeRating: number | null
  type: string | null
}

export async function listarEspecies(): Promise<SrdItemResumo[]> {
  return prisma.srdSpecies.findMany({
    select: { id: true, slug: true, name: true },
    orderBy: { name: 'asc' },
  })
}

export async function listarClasses(): Promise<SrdClasseResumo[]> {
  return prisma.srdClass.findMany({
    select: { id: true, slug: true, name: true, hitDie: true },
    orderBy: { name: 'asc' },
  })
}

export async function listarSubclassesPorClasse(srdClassId: string): Promise<SrdSubclassResumo[]> {
  return prisma.srdSubclass.findMany({
    where: { srdClassId },
    select: { id: true, slug: true, name: true, levelGained: true },
    orderBy: { name: 'asc' },
  })
}

// Todas as subclasses com a classe delas — o wizard agrupa client-side para
// mostrar as opções futuras da classe escolhida.
export async function listarSubclasses(): Promise<
  Array<SrdSubclassResumo & { classeSlug: string }>
> {
  const subclasses = await prisma.srdSubclass.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      levelGained: true,
      srdClass: { select: { slug: true } },
    },
    orderBy: { name: 'asc' },
  })
  return subclasses.map((s) => ({
    id: s.id,
    slug: s.slug,
    name: s.name,
    levelGained: s.levelGained,
    classeSlug: s.srdClass.slug,
  }))
}

type PayloadClasseWizard = {
  spellcasting?: unknown
  proficiency_choices?: Array<{
    choose?: number
    from?: { options?: Array<{ item?: { name?: string; index?: string } }> }
  }>
}

// Classe no shape que o wizard de criação consome: se conjura e quais perícias
// pode escolher, lidos do payload do SRD ("Skill: Acrobatics" → "Acrobatics").
export type SrdClasseWizard = {
  slug: string
  name: string
  hitDie: number
  caster: boolean
  pericias: { escolher: number; opcoes: Array<{ slug: string; name: string }> }
}

export async function listarClassesParaWizard(): Promise<SrdClasseWizard[]> {
  const classes = await prisma.srdClass.findMany({
    select: { slug: true, name: true, hitDie: true, payload: true },
    orderBy: { name: 'asc' },
  })
  return classes.map((classe) => {
    const payload = (classe.payload ?? {}) as PayloadClasseWizard
    const escolha = payload.proficiency_choices?.[0]
    const opcoes = (escolha?.from?.options ?? [])
      .map((o) => o.item)
      .filter((i): i is { name: string; index: string } => Boolean(i?.name && i?.index))
      .map((i) => ({ slug: i.index.replace(/^skill-/, ''), name: i.name.replace(/^Skill: /, '') }))
    return {
      slug: classe.slug,
      name: classe.name,
      hitDie: classe.hitDie,
      caster: payload.spellcasting !== undefined,
      pericias: { escolher: escolha?.choose ?? 2, opcoes },
    }
  })
}

export async function listarBackgrounds(): Promise<SrdItemResumo[]> {
  return prisma.srdBackground.findMany({
    select: { id: true, slug: true, name: true },
    orderBy: { name: 'asc' },
  })
}

export async function listarFeats(): Promise<SrdItemResumo[]> {
  return prisma.srdFeat.findMany({
    select: { id: true, slug: true, name: true },
    orderBy: { name: 'asc' },
  })
}

export async function listarMagias(filtro?: { nivelMaximo?: number }): Promise<SrdMagiaResumo[]> {
  return prisma.srdSpell.findMany({
    where: filtro?.nivelMaximo === undefined ? undefined : { level: { lte: filtro.nivelMaximo } },
    select: { id: true, slug: true, name: true, level: true, school: true },
    orderBy: [{ level: 'asc' }, { name: 'asc' }],
  })
}

export async function listarEquipamentos(): Promise<Array<SrdItemResumo & { category: string }>> {
  return prisma.srdEquipment.findMany({
    select: { id: true, slug: true, name: true, category: true },
    orderBy: { name: 'asc' },
  })
}

export async function listarMonstros(): Promise<SrdMonstroResumo[]> {
  return prisma.srdMonster.findMany({
    select: { id: true, slug: true, name: true, challengeRating: true, type: true },
    orderBy: [{ challengeRating: 'asc' }, { name: 'asc' }],
  })
}

export async function buscarEspeciePorSlug(slug: string): Promise<SrdSpecies | null> {
  return prisma.srdSpecies.findUnique({ where: { slug } })
}

export async function buscarClassePorSlug(slug: string): Promise<SrdClass | null> {
  return prisma.srdClass.findUnique({ where: { slug } })
}

export async function buscarFeatPorSlug(slug: string): Promise<SrdFeat | null> {
  return prisma.srdFeat.findUnique({ where: { slug } })
}
