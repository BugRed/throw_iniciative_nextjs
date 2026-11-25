import type { InitiativeParticipant, Prisma } from '@prisma/client'

import { prisma } from '@/server/db/prisma'
import { ConflictError, ForbiddenError } from '@/server/http/errors'
import { rolarD20, rollDie } from '@/server/iniciativa/iniciativa.dado'
import { reposicionar } from '@/server/iniciativa/iniciativa.fila'
import { limiteRolagem } from '@/server/iniciativa/iniciativa.limite'
import {
  exigirAtual,
  type IniciativaComParticipantes,
  naFila,
} from '@/server/iniciativa/iniciativa.regras'
import { exigirMembroAtivo, exigirMestre } from '@/server/salas/salas.regras'

// Rolagens autoritativas (docs/negocio/iniciativa.md): o resultado nasce aqui,
// nunca no cliente, e toda rolagem grava `audit_rolls`.

const FASE_ROLAGEM = 'As rolagens não estão abertas.'

type Auditoria = Prisma.AuditRollUncheckedCreateInput

function auditar(
  atual: IniciativaComParticipantes,
  p: InitiativeParticipant,
  userId: string,
  dados: Pick<Auditoria, 'kind' | 'result' | 'discardedResult'>,
): Auditoria {
  return {
    roomId: atual.roomId,
    userId,
    characterId: p.characterId,
    initiativeId: atual.id,
    participantId: p.id,
    modifier: p.initiativeMod,
    total: dados.result + p.initiativeMod,
    ...dados,
  }
}

function rolarInicial(atual: IniciativaComParticipantes, p: InitiativeParticipant, userId: string) {
  const { resultado, descartado } = rolarD20(p.rollMode)
  return {
    atualizar: prisma.initiativeParticipant.update({
      where: { id: p.id },
      data: { hasRolled: true, rollResult: resultado + p.initiativeMod },
    }),
    auditoria: auditar(atual, p, userId, {
      kind: 'initiative',
      result: resultado,
      discardedResult: descartado,
    }),
  }
}

async function gravarRolagens(rolagens: ReturnType<typeof rolarInicial>[]): Promise<void> {
  await prisma.$transaction([
    ...rolagens.map((r) => r.atualizar),
    prisma.auditRoll.createMany({ data: rolagens.map((r) => r.auditoria) }),
  ])
}

// Cada jogador rola o próprio d20, uma vez. O mestre não rola por jogador.
export async function rolarMinhaIniciativa(userId: string, roomId: string): Promise<void> {
  await exigirMembroAtivo(userId, roomId)
  const atual = await exigirAtual(roomId, ['rolling'], FASE_ROLAGEM)
  const meu = naFila(atual.participants).find((p) => p.userIdResponsible === userId)
  if (!meu) throw new ForbiddenError('Você não participa deste combate.')
  if (meu.hasRolled) throw new ConflictError('Você já rolou a iniciativa.')
  limiteRolagem.consumir(userId)
  await gravarRolagens([rolarInicial(atual, meu, userId)])
}

// Um clique, um d20 independente por NPC; o lote conta uma ação por NPC.
export async function rolarIniciativaDosNpcs(mestreId: string, roomId: string): Promise<void> {
  await exigirMestre(mestreId, roomId)
  const atual = await exigirAtual(roomId, ['rolling'], FASE_ROLAGEM)
  const npcs = naFila(atual.participants).filter((p) => !p.userIdResponsible && !p.hasRolled)
  if (npcs.length === 0) throw new ConflictError('Nenhum NPC com rolagem pendente.')
  limiteRolagem.consumir(mestreId, npcs.length)
  await gravarRolagens(npcs.map((p) => rolarInicial(atual, p, mestreId)))
}

// Inspiração (SRD 5.2.1): depois de rolar, re-rola o d20; o novo resultado vale.
export async function usarInspiracao(userId: string, roomId: string): Promise<void> {
  await exigirMembroAtivo(userId, roomId)
  const atual = await exigirAtual(roomId, ['rolling'], 'A Inspiração se usa durante as rolagens.')
  const meu = naFila(atual.participants).find((p) => p.userIdResponsible === userId)
  if (!meu?.hasInspiration) throw new ConflictError('Você não tem Inspiração.')
  if (!meu.hasRolled || meu.rollResult === null) throw new ConflictError('Role antes de usar.')
  limiteRolagem.consumir(userId)
  const novo = rollDie(20)
  await prisma.$transaction([
    prisma.initiativeParticipant.update({
      where: { id: meu.id },
      data: { hasInspiration: false, rollResult: novo + meu.initiativeMod },
    }),
    prisma.auditRoll.create({
      data: auditar(atual, meu, userId, {
        kind: 'inspiration',
        result: novo,
        discardedResult: meu.rollResult - meu.initiativeMod,
      }),
    }),
  ])
}

// Desempate: cada empatado rola o próprio d20 (jogador pelo PJ, mestre pelos NPCs),
// sem vantagem. Repete até desempatar.
export async function rolarDesempate(userId: string, roomId: string): Promise<void> {
  const sala = await exigirMembroAtivo(userId, roomId)
  const atual = await exigirAtual(roomId, ['ordered'], 'Não há desempate a rolar agora.')
  const pendentes = await reposicionar(prisma, atual.participants)
  const eMestre = sala.room.masterUserId === userId
  const meus = naFila(atual.participants).filter(
    (p) =>
      pendentes.includes(p.id) && (eMestre ? !p.userIdResponsible : p.userIdResponsible === userId),
  )
  if (meus.length === 0) throw new ConflictError('Você não tem desempate a rolar.')
  limiteRolagem.consumir(userId, meus.length)
  const rolagens = meus.map((p) => ({ p, d20: rollDie(20) }))
  await prisma.$transaction(async (tx) => {
    for (const { p, d20 } of rolagens) {
      await tx.initiativeParticipant.update({
        where: { id: p.id },
        data: { tiebreakRolls: { push: d20 } },
      })
    }
    await tx.auditRoll.createMany({
      data: rolagens.map(({ p, d20 }) => ({
        // O d20 de desempate é puro: não soma modificador.
        ...auditar(atual, p, userId, { kind: 'tiebreak', result: d20, discardedResult: null }),
        modifier: 0,
        total: d20,
      })),
    })
    const depois = await tx.initiativeParticipant.findMany({ where: { initiativeId: atual.id } })
    await reposicionar(tx, depois)
  })
}
