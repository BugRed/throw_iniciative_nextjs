import type { InitiativeParticipant, InitiativeStatus, RollMode } from '@prisma/client'

import { prisma } from '@/server/db/prisma'
import { ONDE_ELEGIVEL } from '@/server/iniciativa/iniciativa.entrantes'
import { ordenarIniciativa } from '@/server/iniciativa/iniciativa.ordem'
import {
  buscarAtual,
  type IniciativaComParticipantes,
  naFila,
} from '@/server/iniciativa/iniciativa.regras'
import { exigirMembroAtivo } from '@/server/salas/salas.regras'

// Leitura do combate para a tela (docs/negocio/iniciativa.md, "O que cada um
// vê"). Mesa aberta: todos veem a ordem e os totais, inclusive durante a
// rolagem. Quem saiu da fila (kick, morte, não rolou) não aparece.

export type ParticipanteView = {
  id: string
  rotulo: string
  tipo: 'pj' | 'npc'
  characterId: string | null
  total: number | null
  modificador: number
  rolou: boolean
  jogou: boolean
  modo: RollMode
  inspiracao: boolean
  desempatePendente: boolean
  // Do jogador: o próprio PJ. Do mestre: os NPCs, que ele rola e passa.
  ehMeu: boolean
}

export type IniciativaView = {
  status: InitiativeStatus
  rodada: number
  pausada: boolean
  participantes: ParticipanteView[]
  daVezId: string | null
  proximoId: string | null
}

// Quem o mestre pode pôr no combate: na abertura (todos os elegíveis) ou no
// meio (os elegíveis que ainda não estiveram nele).
export type CandidatoView = {
  id: string
  rotulo: string
  campo: 'characterId' | 'tempNpcId'
}

export type PainelIniciativa = {
  ehMestre: boolean
  atual: IniciativaView | null
  candidatos: CandidatoView[]
}

function emOrdem(fila: InitiativeParticipant[]): InitiativeParticipant[] {
  // Antes de ordenar não há posição: fica a ordem de entrada (createdAt).
  return [...fila].sort(
    (a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER),
  )
}

function pendentesDeDesempate(atual: IniciativaComParticipantes): Set<string> {
  if (atual.status !== 'ordered') return new Set()
  const rolados = naFila(atual.participants).filter(
    (p) => p.addedMode !== 'append' && p.rollResult !== null,
  )
  const { pendentesDesempate } = ordenarIniciativa(
    rolados.map((p) => ({ ...p, rollResult: p.rollResult as number })),
  )
  return new Set(pendentesDesempate)
}

function vezEProximo(atual: IniciativaComParticipantes, fila: InitiativeParticipant[]) {
  if (atual.status !== 'active' || fila.length === 0) return { daVezId: null, proximoId: null }
  const daVez = fila.find((p) => p.position === atual.currentPosition) ?? null
  // Depois do último vem o topo, na rodada seguinte.
  const proximo = fila.find((p) => p.position === (atual.currentPosition + 1) % fila.length)
  return {
    daVezId: daVez?.id ?? null,
    proximoId: proximo && proximo.id !== daVez?.id ? proximo.id : null,
  }
}

function montarView(
  atual: IniciativaComParticipantes,
  userId: string,
  ehMestre: boolean,
  pausada: boolean,
): IniciativaView {
  const fila = emOrdem(naFila(atual.participants))
  const pendentes = pendentesDeDesempate(atual)
  return {
    status: atual.status,
    rodada: atual.round,
    pausada,
    ...vezEProximo(atual, fila),
    participantes: fila.map((p) => ({
      id: p.id,
      rotulo: p.label,
      tipo: p.userIdResponsible ? 'pj' : 'npc',
      characterId: p.characterId,
      total: p.rollResult,
      modificador: p.initiativeMod,
      rolou: p.hasRolled,
      jogou: p.hasPlayed,
      modo: p.rollMode,
      inspiracao: p.hasInspiration,
      desempatePendente: pendentes.has(p.id),
      ehMeu: ehMestre ? !p.userIdResponsible : p.userIdResponsible === userId,
    })),
  }
}

async function listarCandidatos(
  roomId: string,
  atual: IniciativaComParticipantes | null,
): Promise<CandidatoView[]> {
  const [personagens, temporarios] = await Promise.all([
    prisma.roomCharacter.findMany({
      where: { roomId, ...ONDE_ELEGIVEL },
      include: { character: { select: { name: true } } },
      orderBy: { character: { name: 'asc' } },
    }),
    prisma.roomTempNpc.findMany({ where: { roomId }, orderBy: { createdAt: 'asc' } }),
  ])
  // Quem já esteve no combate não volta, nem removido (kick é definitivo).
  const jaEsteve = new Set(atual?.participants.flatMap((p) => [p.characterId, p.tempNpcId]) ?? [])
  return [
    ...personagens.map((p) => ({
      id: p.characterId,
      rotulo: p.character.name,
      campo: 'characterId' as const,
    })),
    ...temporarios.map((t) => ({ id: t.id, rotulo: t.label, campo: 'tempNpcId' as const })),
  ].filter((c) => !jaEsteve.has(c.id))
}

export async function lerPainelIniciativa(
  userId: string,
  roomId: string,
): Promise<PainelIniciativa> {
  const membro = await exigirMembroAtivo(userId, roomId)
  const ehMestre = membro.room.masterUserId === userId
  const atual = await buscarAtual(roomId)
  const pausada = membro.room.status === 'paused'
  return {
    ehMestre,
    atual: atual ? montarView(atual, userId, ehMestre, pausada) : null,
    candidatos: ehMestre ? await listarCandidatos(roomId, atual) : [],
  }
}
