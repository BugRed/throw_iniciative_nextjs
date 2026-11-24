import type { NpcTemplate, Prisma } from '@prisma/client'

import { prisma } from '@/server/db/prisma'
import { NotFoundError, ValidationError } from '@/server/http/errors'
import { esquemaMoldeNpc } from '@/server/npcs/npcs.schema'
import { modificadorDeAtributo } from '@/server/personagens/calculos'

// Regras vigentes em docs/negocio/npcs.md. O SRD é somente leitura: editar um
// monstro gera sempre um molde do usuário, nunca altera srd_monsters.

const MOLDE_NAO_ENCONTRADO = 'Molde de NPC não encontrado.'
const MONSTRO_NAO_ENCONTRADO = 'Monstro não encontrado no SRD.'

export type StatsMonstro = {
  slug: string
  nome: string
  hpMax: number
  armorClass: number
  initiativeMod: number
}

type PayloadMonstro = {
  hit_points?: unknown
  armor_class?: unknown
  dexterity?: unknown
}

function numeroOu(valor: unknown, padrao: number): number {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : padrao
}

// Extrai do payload do SRD o stat block resumido; o formato de CA varia
// ([{value}] no 5.2), então a leitura é tolerante e cai em CA 10 / 1 PV.
export function statsDoPayload(payload: unknown): Omit<StatsMonstro, 'slug' | 'nome'> {
  const p = (payload ?? {}) as PayloadMonstro
  const ca = Array.isArray(p.armor_class)
    ? numeroOu((p.armor_class[0] as { value?: unknown } | undefined)?.value, 10)
    : numeroOu(p.armor_class, 10)
  return {
    hpMax: Math.max(1, numeroOu(p.hit_points, 1)),
    armorClass: ca,
    initiativeMod: modificadorDeAtributo(numeroOu(p.dexterity, 10)),
  }
}

export async function buscarStatsMonstro(slug: string): Promise<StatsMonstro> {
  const monstro = await prisma.srdMonster.findUnique({ where: { slug } })
  if (!monstro) throw new NotFoundError(MONSTRO_NAO_ENCONTRADO)
  return { slug: monstro.slug, nome: monstro.name, ...statsDoPayload(monstro.payload) }
}

export async function criarMolde(
  userId: string,
  entradaDesvalidada: unknown,
): Promise<NpcTemplate> {
  const parsed = esquemaMoldeNpc.safeParse(entradaDesvalidada)
  if (!parsed.success) {
    throw new ValidationError(
      'Molde inválido.',
      parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    )
  }
  const { nome, hpMax, armorClass, initiativeMod, monstroSlug } = parsed.data
  const monstro = monstroSlug
    ? await prisma.srdMonster.findUnique({ where: { slug: monstroSlug } })
    : null
  if (monstroSlug && !monstro) throw new NotFoundError(MONSTRO_NAO_ENCONTRADO)

  const molde = await prisma.npcTemplate.create({
    data: {
      ownerUserId: userId,
      name: nome,
      hpMax,
      hpCurrent: hpMax,
      armorClass,
      initiativeMod,
      statblock: (monstro?.payload ?? {}) as Prisma.InputJsonValue,
    },
  })
  await prisma.auditLog.create({
    data: { action: 'npc_template_created', entityId: molde.id, userId },
  })
  return molde
}

export async function listarMoldes(userId: string): Promise<NpcTemplate[]> {
  return prisma.npcTemplate.findMany({
    where: { ownerUserId: userId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function excluirMolde(userId: string, id: string): Promise<void> {
  const molde = await prisma.npcTemplate.findUnique({ where: { id } })
  if (!molde || molde.ownerUserId !== userId) throw new NotFoundError(MOLDE_NAO_ENCONTRADO)
  await prisma.npcTemplate.delete({ where: { id } })
  await prisma.auditLog.create({ data: { action: 'npc_template_deleted', entityId: id, userId } })
}
