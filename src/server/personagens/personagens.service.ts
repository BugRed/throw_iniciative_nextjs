import type { Prisma } from '@prisma/client'

import { prisma } from '@/server/db/prisma'
import { NotFoundError, ValidationError } from '@/server/http/errors'
import {
  classeDeArmadura,
  hpMaximo,
  modificadorDeIniciativa,
  proficienciaPorNivel,
} from '@/server/personagens/calculos'
import {
  esquemaEdicaoPersonagem,
  esquemaPersonagemNovo,
  type PersonagemNovo,
} from '@/server/personagens/personagens.schema'

// Regras vigentes em docs/negocio/personagens-calculos.md — o service é a
// fonte autoritativa dos cálculos; nada que chegue do client é confiado.

const FICHA_NAO_ENCONTRADA = 'Ficha não encontrada.'

export type PersonagemCompleto = Prisma.CharacterGetPayload<{
  include: { species: true; srdClass: true; subclass: true; background: true }
}>

const SELECT_RESUMO = {
  id: true,
  name: true,
  level: true,
  isNpc: true,
  isVisibleToMaster: true,
  hpMax: true,
  hpCurrent: true,
  armorClass: true,
  initiativeMod: true,
  proficiencyBonus: true,
  species: { select: { name: true } },
  srdClass: { select: { name: true } },
} as const

export type PersonagemResumo = {
  id: string
  name: string
  level: number
  isNpc: boolean
  isVisibleToMaster: boolean
  hpMax: number
  hpCurrent: number
  armorClass: number
  initiativeMod: number
  proficiencyBonus: number
  species: { name: string } | null
  srdClass: { name: string }
}

async function resolverReferencias(entrada: PersonagemNovo) {
  const [especie, classe, background] = await Promise.all([
    prisma.srdSpecies.findUnique({ where: { slug: entrada.especie } }),
    prisma.srdClass.findUnique({ where: { slug: entrada.classe } }),
    prisma.srdBackground.findUnique({ where: { slug: entrada.background } }),
  ])
  if (!especie) throw new ValidationError(`Espécie '${entrada.especie}' não existe no SRD.`)
  if (!classe) throw new ValidationError(`Classe '${entrada.classe}' não existe no SRD.`)
  if (!background)
    throw new ValidationError(`Antecedente '${entrada.background}' não existe no SRD.`)
  return { especie, classe, background }
}

function statsDerivados(entrada: PersonagemNovo, hitDie: number, nivel = 1) {
  const { constituicao, destreza } = entrada.atributos
  const temAlert = entrada.feats.includes('alert')
  return {
    hpMax: hpMaximo(hitDie, constituicao, nivel),
    hpCurrent: hpMaximo(hitDie, constituicao, nivel),
    armorClass: classeDeArmadura(destreza),
    initiativeMod: modificadorDeIniciativa(destreza, temAlert, nivel),
    proficiencyBonus: proficienciaPorNivel(nivel),
  }
}

export async function criarPersonagem(
  userId: string,
  entradaDesvalidada: unknown,
): Promise<PersonagemResumo> {
  const parsed = esquemaPersonagemNovo.safeParse(entradaDesvalidada)
  if (!parsed.success) {
    throw new ValidationError(
      'Ficha inválida.',
      parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    )
  }
  const entrada = parsed.data
  const { especie, classe, background } = await resolverReferencias(entrada)

  const personagem = await prisma.character.create({
    data: {
      ownerUserId: userId,
      name: entrada.nome,
      level: 1,
      speciesId: especie.id,
      classId: classe.id,
      backgroundId: background.id,
      strength: entrada.atributos.forca,
      dexterity: entrada.atributos.destreza,
      constitution: entrada.atributos.constituicao,
      intelligence: entrada.atributos.inteligencia,
      wisdom: entrada.atributos.sabedoria,
      charisma: entrada.atributos.carisma,
      skillProficiencies: entrada.pericias,
      preparedSpells: entrada.magias,
      equipment: entrada.equipamento,
      feats: entrada.feats,
      isVisibleToMaster: entrada.visivelAoMestre,
      ...statsDerivados(entrada, classe.hitDie),
    },
    select: SELECT_RESUMO,
  })
  await prisma.auditLog.create({
    data: { action: 'character_created', entityId: personagem.id, userId },
  })
  return personagem as PersonagemResumo
}

export async function listarPersonagens(userId: string): Promise<PersonagemResumo[]> {
  const lista = await prisma.character.findMany({
    where: { ownerUserId: userId },
    select: SELECT_RESUMO,
    orderBy: { createdAt: 'desc' },
  })
  return lista as PersonagemResumo[]
}

// Privacidade (docs/negocio): ficha fechada para não-dono é 404 — não vaza
// nem a existência.
export async function buscarPersonagem(id: string, viewerId: string): Promise<PersonagemCompleto> {
  const personagem = await prisma.character.findUnique({
    where: { id },
    include: { species: true, srdClass: true, subclass: true, background: true },
  })
  if (!personagem || (personagem.ownerUserId !== viewerId && !personagem.isVisibleToMaster)) {
    throw new NotFoundError(FICHA_NAO_ENCONTRADA)
  }
  return personagem
}

export async function atualizarPersonagem(
  userId: string,
  id: string,
  entradaDesvalidada: unknown,
): Promise<PersonagemResumo> {
  const parsed = esquemaEdicaoPersonagem.safeParse(entradaDesvalidada)
  if (!parsed.success) {
    throw new ValidationError(
      'Edição inválida.',
      parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    )
  }
  const edicao = parsed.data
  const atual = await prisma.character.findUnique({ where: { id }, include: { srdClass: true } })
  if (!atual || atual.ownerUserId !== userId) throw new NotFoundError(FICHA_NAO_ENCONTRADA)

  const dados: Prisma.CharacterUncheckedUpdateInput = {}
  if (edicao.nome !== undefined) dados.name = edicao.nome
  if (edicao.visivelAoMestre !== undefined) dados.isVisibleToMaster = edicao.visivelAoMestre
  if (edicao.feats !== undefined) dados.feats = edicao.feats

  if (edicao.nivel !== undefined && edicao.nivel !== atual.level) {
    const temAlert = (edicao.feats ?? (atual.feats as string[])).includes('alert')
    const hpMaxNovo = hpMaximo(atual.srdClass.hitDie, atual.constitution, edicao.nivel)
    dados.level = edicao.nivel
    dados.hpMax = hpMaxNovo
    dados.hpCurrent = Math.min(atual.hpCurrent, hpMaxNovo)
    dados.initiativeMod = modificadorDeIniciativa(atual.dexterity, temAlert, edicao.nivel)
    dados.proficiencyBonus = proficienciaPorNivel(edicao.nivel)
  } else if (edicao.feats !== undefined) {
    const temAlert = edicao.feats.includes('alert')
    dados.initiativeMod = modificadorDeIniciativa(atual.dexterity, temAlert, atual.level)
  }

  const personagem = await prisma.character.update({
    where: { id },
    data: dados,
    select: SELECT_RESUMO,
  })
  await prisma.auditLog.create({ data: { action: 'character_updated', entityId: id, userId } })
  return personagem as PersonagemResumo
}

export async function alternarVisibilidade(userId: string, id: string): Promise<PersonagemResumo> {
  const atual = await prisma.character.findUnique({ where: { id } })
  if (!atual || atual.ownerUserId !== userId) throw new NotFoundError(FICHA_NAO_ENCONTRADA)
  const personagem = await prisma.character.update({
    where: { id },
    data: { isVisibleToMaster: !atual.isVisibleToMaster },
    select: SELECT_RESUMO,
  })
  return personagem as PersonagemResumo
}
