import type { Prisma } from '@prisma/client'

import { prisma } from '@/server/db/prisma'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/server/http/errors'
import {
  exigirMembroAtivo,
  exigirMestre,
  SALA_NAO_ENCONTRADA,
  STATUS_ABERTOS,
} from '@/server/salas/salas.regras'
import { esquemaInstanciacao } from '@/server/salas/salas.schema'

// PJ ativo, NPCs persistentes e temporários do lobby (docs/negocio/salas.md).

const PERSONAGEM_NAO_ENCONTRADO = 'Personagem não encontrado.'
const SALA_ENCERRADA = 'A sala não aceita mais mudanças.'

export async function anexarPersonagem(
  userId: string,
  roomId: string,
  characterId: string,
): Promise<void> {
  const membro = await exigirMembroAtivo(userId, roomId)
  if (membro.role === 'master') throw new ForbiddenError('O mestre joga com NPCs, não com PJ.')
  if (!STATUS_ABERTOS.includes(membro.room.status)) throw new ConflictError(SALA_ENCERRADA)

  const personagem = await prisma.character.findUnique({ where: { id: characterId } })
  if (personagem?.ownerUserId !== userId || personagem.isNpc) {
    throw new NotFoundError(PERSONAGEM_NAO_ENCONTRADO)
  }
  const naSala = await prisma.roomCharacter.findUnique({
    where: { roomId_characterId: { roomId, characterId } },
  })
  if (naSala?.diedAt)
    throw new ConflictError('Este personagem morreu nesta sala e não pode voltar.')
  if (naSala?.activeForUserId === userId) return

  // Um PJ ativo por jogador: a troca desanexa o anterior (vivo) e anexa o novo.
  await prisma.$transaction([
    prisma.roomCharacter.deleteMany({ where: { roomId, activeForUserId: userId, diedAt: null } }),
    prisma.roomCharacter.upsert({
      where: { roomId_characterId: { roomId, characterId } },
      create: { roomId, characterId, activeForUserId: userId },
      update: { activeForUserId: userId },
    }),
  ])
}

export async function anexarNpcPersistente(
  mestreId: string,
  roomId: string,
  characterId: string,
): Promise<void> {
  const sala = await exigirMestre(mestreId, roomId)
  if (!STATUS_ABERTOS.includes(sala.status)) throw new ConflictError(SALA_ENCERRADA)
  // Por ora só ficha do próprio mestre (docs/negocio/salas.md).
  const npc = await prisma.character.findUnique({ where: { id: characterId } })
  if (npc?.ownerUserId !== mestreId || !npc.isNpc) {
    throw new NotFoundError(PERSONAGEM_NAO_ENCONTRADO)
  }
  const jaNaSala = await prisma.roomCharacter.findUnique({
    where: { roomId_characterId: { roomId, characterId } },
  })
  if (jaNaSala) throw new ConflictError('Este NPC já está na sala.')
  await prisma.roomCharacter.create({ data: { roomId, characterId, isNpc: true } })
}

export async function removerNpcPersistente(
  mestreId: string,
  roomId: string,
  characterId: string,
): Promise<void> {
  await exigirMestre(mestreId, roomId)
  const { count } = await prisma.roomCharacter.deleteMany({
    where: { roomId, characterId, isNpc: true },
  })
  if (count === 0) throw new NotFoundError('NPC não está na sala.')
}

// Numeração continua do maior número já usado do mesmo molde na sala, mesmo
// que instâncias antigas tenham sido removidas: "Goblin #3" nunca se repete.
async function proximoNumero(roomId: string, moldeId: string): Promise<number> {
  const ultimo = await prisma.roomTempNpc.aggregate({
    where: { roomId, npcTemplateId: moldeId },
    _max: { instanceNumber: true },
  })
  return (ultimo._max.instanceNumber ?? 0) + 1
}

export async function instanciarNpcTemporario(
  mestreId: string,
  roomId: string,
  entradaDesvalidada: unknown,
): Promise<number> {
  const parsed = esquemaInstanciacao.safeParse(entradaDesvalidada)
  if (!parsed.success) {
    throw new ValidationError(
      'Instanciação inválida.',
      parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    )
  }
  const sala = await exigirMestre(mestreId, roomId)
  if (!STATUS_ABERTOS.includes(sala.status)) throw new ConflictError(SALA_ENCERRADA)

  const { moldeId, quantidade } = parsed.data
  const molde = await prisma.npcTemplate.findFirst({
    where: { id: moldeId, OR: [{ ownerUserId: mestreId }, { isPublic: true }] },
  })
  if (!molde) throw new NotFoundError('Molde de NPC não encontrado.')

  const inicio = await proximoNumero(roomId, molde.id)
  // Copia os stats: editar o molde depois não altera instâncias vivas.
  const dados = Array.from({ length: quantidade }, (_, i) => ({
    roomId,
    npcTemplateId: molde.id,
    label: `${molde.name} #${inicio + i}`,
    instanceNumber: inicio + i,
    hpCurrent: molde.hpMax,
    hpMax: molde.hpMax,
    armorClass: molde.armorClass,
    initiativeMod: molde.initiativeMod,
    statblock: molde.statblock as Prisma.InputJsonValue,
  }))
  const { count } = await prisma.roomTempNpc.createMany({ data: dados })
  return count
}

export async function removerNpcTemporario(
  mestreId: string,
  roomId: string,
  tempNpcId: string,
): Promise<void> {
  await exigirMestre(mestreId, roomId)
  const { count } = await prisma.roomTempNpc.deleteMany({ where: { id: tempNpcId, roomId } })
  if (count === 0) throw new NotFoundError(SALA_NAO_ENCONTRADA)
}
