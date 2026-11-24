import type { InitiativeParticipant, Prisma, Room } from '@prisma/client'

import { prisma } from '@/server/db/prisma'
import { ConflictError, ValidationError } from '@/server/http/errors'
import { reposicionar } from '@/server/iniciativa/iniciativa.fila'
import { exigirAtual, exigirNinguemOcupado, naFila } from '@/server/iniciativa/iniciativa.regras'
import { esquemaAbertura } from '@/server/iniciativa/iniciativa.schema'
import { exigirMestre } from '@/server/salas/salas.regras'

// Abrir, avançar e cancelar a iniciativa (docs/negocio/iniciativa.md). Só o
// mestre conduz os estados.

type NovoParticipante = Omit<Prisma.InitiativeParticipantUncheckedCreateInput, 'initiativeId'>

async function montarParticipantes(roomId: string, excluir: string[]): Promise<NovoParticipante[]> {
  const [personagens, temporarios] = await Promise.all([
    prisma.roomCharacter.findMany({
      // PJ morto ou sem jogador ativo não entra; NPC de ficha entra sempre.
      where: { roomId, OR: [{ isNpc: true }, { activeForUserId: { not: null }, diedAt: null }] },
      include: { character: true },
    }),
    prisma.roomTempNpc.findMany({ where: { roomId } }),
  ])
  const dePersonagem = personagens
    .filter((p) => !excluir.includes(p.characterId))
    .map((p) => ({
      participantType: 'character' as const,
      characterId: p.characterId,
      label: p.character.name,
      // NPC não tem responsável: quem rola é o mestre.
      userIdResponsible: p.isNpc ? null : p.activeForUserId,
      initiativeMod: p.character.initiativeMod,
    }))
  const deTemporario = temporarios
    .filter((t) => !excluir.includes(t.id))
    .map((t) => ({
      participantType: 'temp_npc' as const,
      tempNpcId: t.id,
      label: t.label,
      initiativeMod: t.initiativeMod,
    }))
  return [...dePersonagem, ...deTemporario]
}

export async function abrirIniciativa(
  mestreId: string,
  roomId: string,
  entradaDesvalidada: unknown,
): Promise<void> {
  const parsed = esquemaAbertura.safeParse(entradaDesvalidada)
  if (!parsed.success) throw new ValidationError('Abertura inválida.')
  const sala = await exigirMestre(mestreId, roomId)
  if (sala.status !== 'lobby') {
    throw new ConflictError('Só dá para abrir a iniciativa com a sala em lobby.')
  }
  const participantes = await montarParticipantes(roomId, parsed.data.excluir)
  if (participantes.length === 0) {
    throw new ConflictError('Nenhum participante: sem PJ ativo e sem NPC não há iniciativa.')
  }
  const responsaveis = participantes.flatMap((p) =>
    p.userIdResponsible ? [p.userIdResponsible] : [],
  )
  await exigirNinguemOcupado([mestreId, ...responsaveis], roomId)
  await prisma.$transaction([
    prisma.room.update({ where: { id: roomId }, data: { status: 'active' } }),
    prisma.initiative.create({ data: { roomId, participants: { create: participantes } } }),
  ])
}

async function ordenar(roomId: string, participantes: InitiativeParticipant[]): Promise<void> {
  const rolados = naFila(participantes).filter((p) => p.hasRolled)
  if (rolados.length === 0) throw new ConflictError('Ninguém rolou: não há o que ordenar.')
  const agora = new Date()
  await prisma.$transaction(async (tx) => {
    // Quem não rolou fica fora deste combate (sem rolar depois).
    await tx.initiativeParticipant.updateMany({
      where: {
        id: {
          in: naFila(participantes)
            .filter((p) => !p.hasRolled)
            .map((p) => p.id),
        },
      },
      data: { removedAt: agora },
    })
    await tx.initiative.updateMany({
      where: { roomId, status: 'rolling' },
      data: { status: 'ordered' },
    })
    await reposicionar(tx, rolados)
  })
}

export async function avancarIniciativa(mestreId: string, roomId: string): Promise<void> {
  await exigirMestre(mestreId, roomId)
  const atual = await exigirAtual(
    roomId,
    ['draft', 'rolling', 'ordered'],
    'A iniciativa já está ativa.',
  )
  if (atual.status === 'rolling') return ordenar(roomId, atual.participants)
  if (atual.status === 'ordered') {
    const pendentes = await reposicionar(prisma, atual.participants)
    if (pendentes.length > 0)
      throw new ConflictError('Há empate pendente: faltam rolagens de desempate.')
  }
  const agora = new Date()
  const ativando = atual.status === 'ordered'
  await prisma.initiative.update({
    where: { id: atual.id },
    data: {
      status: ativando ? 'active' : 'rolling',
      ...(ativando ? { startedAt: agora, turnStartedAt: agora, currentPosition: 0 } : {}),
    },
  })
}

export async function cancelarIniciativa(mestreId: string, roomId: string): Promise<Room> {
  await exigirMestre(mestreId, roomId)
  const atual = await exigirAtual(
    roomId,
    ['draft', 'rolling', 'ordered'],
    'Depois de ativa, a iniciativa só termina finalizando.',
  )
  // Cancelar descarta o combate; as rolagens ficam só na auditoria.
  const [, sala] = await prisma.$transaction([
    prisma.initiative.update({ where: { id: atual.id }, data: { status: 'cancelled' } }),
    prisma.room.update({ where: { id: roomId }, data: { status: 'lobby' } }),
  ])
  return sala
}
