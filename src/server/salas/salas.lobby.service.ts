import type { Room } from '@prisma/client'

import { prisma } from '@/server/db/prisma'
import { NotFoundError } from '@/server/http/errors'
import { exigirMembroAtivo, pedidoExpirou, SALA_NAO_ENCONTRADA } from '@/server/salas/salas.regras'

// Leitura do lobby (docs/negocio/salas.md). O que cada papel vê é decidido
// aqui, no servidor: o jogador nunca recebe stats de NPC, nem no payload.

export type MembroLobby = {
  userId: string
  nome: string
  papel: 'master' | 'player'
  pj: { nome: string; classe: string; nivel: number } | null
}

export type NpcLobby = {
  id: string
  rotulo: string
  tipo: 'persistente' | 'temporario'
  // Só o mestre recebe os números.
  stats?: { hpMax: number; armorClass: number; initiativeMod: number }
}

export type LobbyView = {
  sala: Pick<Room, 'id' | 'name' | 'status'> & { codigo: string | null }
  ehMestre: boolean
  membros: MembroLobby[]
  pedidos: { userId: string; nome: string }[]
  npcs: NpcLobby[]
}

async function listarNpcs(roomId: string, ehMestre: boolean): Promise<NpcLobby[]> {
  const [persistentes, temporarios] = await Promise.all([
    prisma.roomCharacter.findMany({
      where: { roomId, isNpc: true },
      include: { character: true },
    }),
    prisma.roomTempNpc.findMany({ where: { roomId }, orderBy: { createdAt: 'asc' } }),
  ])
  return [
    ...persistentes.map((p) => ({
      id: p.characterId,
      rotulo: p.character.name,
      tipo: 'persistente' as const,
      stats: ehMestre
        ? {
            hpMax: p.character.hpMax,
            armorClass: p.character.armorClass,
            initiativeMod: p.character.initiativeMod,
          }
        : undefined,
    })),
    ...temporarios.map((t) => ({
      id: t.id,
      rotulo: t.label,
      tipo: 'temporario' as const,
      stats: ehMestre
        ? { hpMax: t.hpMax, armorClass: t.armorClass, initiativeMod: t.initiativeMod }
        : undefined,
    })),
  ]
}

async function listarMembros(roomId: string): Promise<MembroLobby[]> {
  const [membros, pjs] = await Promise.all([
    prisma.roomMember.findMany({
      where: { roomId, status: 'active' },
      include: { user: { select: { name: true } } },
      orderBy: { joinedAt: 'asc' },
    }),
    prisma.roomCharacter.findMany({
      where: { roomId, isNpc: false, diedAt: null, activeForUserId: { not: null } },
      include: { character: { include: { srdClass: { select: { name: true } } } } },
    }),
  ])
  const pjDoUsuario = new Map(pjs.map((p) => [p.activeForUserId, p.character]))
  return membros.map((m) => {
    const pj = pjDoUsuario.get(m.userId)
    return {
      userId: m.userId,
      nome: m.user.name,
      papel: m.role,
      pj: pj ? { nome: pj.name, classe: pj.srdClass.name, nivel: pj.level } : null,
    }
  })
}

async function listarPedidos(roomId: string): Promise<LobbyView['pedidos']> {
  const pendentes = await prisma.roomMember.findMany({
    where: { roomId, status: 'pending' },
    include: { user: { select: { name: true } } },
    orderBy: { statusChangedAt: 'asc' },
  })
  return pendentes
    .filter((p) => !pedidoExpirou(p.statusChangedAt))
    .map((p) => ({ userId: p.userId, nome: p.user.name }))
}

export async function obterLobby(userId: string, roomId: string): Promise<LobbyView> {
  const membro = await exigirMembroAtivo(userId, roomId)
  const ehMestre = membro.role === 'master'
  const [membros, npcs, pedidos] = await Promise.all([
    listarMembros(roomId),
    listarNpcs(roomId, ehMestre),
    ehMestre ? listarPedidos(roomId) : Promise.resolve([]),
  ])
  const { id, name, status, code } = membro.room
  return {
    sala: { id, name, status, codigo: ehMestre ? code : null },
    ehMestre,
    membros,
    pedidos,
    npcs,
  }
}

export async function listarMinhasSalas(
  userId: string,
): Promise<Pick<Room, 'id' | 'name' | 'status'>[]> {
  const vinculos = await prisma.roomMember.findMany({
    where: { userId, status: 'active', room: { status: { not: 'destroyed' } } },
    include: { room: { select: { id: true, name: true, status: true } } },
    orderBy: { joinedAt: 'desc' },
  })
  return vinculos.map((v) => v.room)
}

// Quem pode assinar o stream da sala: membro ativo, ou o pedido pendente (que só
// recebe o resultado do próprio pedido). Qualquer outro vínculo é "não existe".
export async function statusParaAssinar(
  userId: string,
  roomId: string,
): Promise<'active' | 'pending'> {
  const membro = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
    include: { room: { select: { status: true } } },
  })
  if (!membro || membro.room.status === 'destroyed') throw new NotFoundError(SALA_NAO_ENCONTRADA)
  if (membro.status === 'active' || membro.status === 'pending') return membro.status
  throw new NotFoundError(SALA_NAO_ENCONTRADA)
}
