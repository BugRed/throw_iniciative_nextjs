import type { InitiativeParticipant, Room } from '@prisma/client'

import { prisma } from '@/server/db/prisma'
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/server/http/errors'
import {
  deTemporario,
  deVinculo,
  type NovoParticipante,
  vinculoElegivel,
} from '@/server/iniciativa/iniciativa.entrantes'
import { zerarJogadas } from '@/server/iniciativa/iniciativa.fila'
import {
  exigirAtual,
  exigirNinguemOcupado,
  naFila,
  STATUS_EM_ANDAMENTO,
} from '@/server/iniciativa/iniciativa.regras'
import { esquemaEntrante } from '@/server/iniciativa/iniciativa.schema'
import { exigirMestre, SALA_NAO_ENCONTRADA } from '@/server/salas/salas.regras'

// O combate em curso: passar a vez, entrada no meio e finalizar
// (docs/negocio/iniciativa.md).

const SALA_PAUSADA = 'A sala está pausada: o mestre retoma antes.'

function exigirNaoPausada(sala: Room): void {
  if (sala.status === 'paused') throw new ConflictError(SALA_PAUSADA)
}

export async function passarVez(userId: string, roomId: string): Promise<void> {
  const sala = await prisma.room.findUnique({ where: { id: roomId } })
  if (!sala) throw new NotFoundError(SALA_NAO_ENCONTRADA)
  exigirNaoPausada(sala)
  const atual = await exigirAtual(roomId, ['active'], 'O combate ainda não começou.')
  const fila = naFila(atual.participants)
  const daVez = fila.find((p) => p.position === atual.currentPosition)
  if (!daVez) throw new ConflictError('Não há ninguém na vez.')
  // Vez de NPC (sem responsável) só o mestre passa.
  if (sala.masterUserId !== userId && daVez.userIdResponsible !== userId) {
    throw new ForbiddenError('Só quem está na vez, ou o mestre, passa a vez.')
  }
  const virou = atual.currentPosition + 1 >= fila.length
  await prisma.$transaction(async (tx) => {
    // Trava otimista: dois cliques leem a mesma vez, e só o primeiro ainda a
    // encontra no lugar — o segundo não pula ninguém.
    const { count } = await tx.initiative.updateMany({
      where: {
        id: atual.id,
        status: 'active',
        currentPosition: atual.currentPosition,
        round: atual.round,
      },
      data: {
        currentPosition: virou ? 0 : atual.currentPosition + 1,
        turnStartedAt: new Date(),
        ...(virou ? { round: { increment: 1 } } : {}),
      },
    })
    if (count === 0) throw new ConflictError('A vez já passou.')
    if (virou) return zerarJogadas(tx, atual.id)
    await tx.initiativeParticipant.update({ where: { id: daVez.id }, data: { hasPlayed: true } })
  })
}

async function montarEntrante(roomId: string, entradaBruta: unknown): Promise<NovoParticipante> {
  const entrada = esquemaEntrante.safeParse(entradaBruta)
  if (!entrada.success) throw new ValidationError('Participante inválido.')
  if ('tempNpcId' in entrada.data) {
    const temporario = await prisma.roomTempNpc.findFirst({
      where: { id: entrada.data.tempNpcId, roomId },
    })
    if (!temporario) throw new NotFoundError('NPC não encontrado nesta sala.')
    return deTemporario(temporario)
  }
  const vinculo = await prisma.roomCharacter.findUnique({
    where: { roomId_characterId: { roomId, characterId: entrada.data.characterId } },
    include: { character: true },
  })
  if (!vinculo) throw new NotFoundError('Personagem não encontrado nesta sala.')
  if (!vinculoElegivel(vinculo)) {
    throw new ConflictError('PJ morto ou sem jogador ativo não entra no combate.')
  }
  return deVinculo(vinculo)
}

// Removido (kick) não volta: a linha dele continua no combate.
function jaParticipou(participantes: InitiativeParticipant[], novo: NovoParticipante): boolean {
  return participantes.some(
    (p) =>
      (novo.characterId && p.characterId === novo.characterId) ||
      (novo.tempNpcId && p.tempNpcId === novo.tempNpcId),
  )
}

export async function adicionarParticipante(
  mestreId: string,
  roomId: string,
  entradaBruta: unknown,
): Promise<void> {
  const novo = await montarEntrante(roomId, entradaBruta)
  exigirNaoPausada(await exigirMestre(mestreId, roomId))
  const atual = await exigirAtual(roomId, STATUS_EM_ANDAMENTO, '')
  if (jaParticipou(atual.participants, novo)) {
    throw new ConflictError('Esse participante já está, ou já esteve, neste combate.')
  }
  // Uma sala `active` por usuário vale também para quem entra no meio.
  if (novo.userIdResponsible) await exigirNinguemOcupado([novo.userIdResponsible], roomId)
  // Antes de ordenar, entra e rola como os demais; depois, vai ao fim sem rolar.
  const noFim = atual.status === 'ordered' || atual.status === 'active'
  await prisma.initiativeParticipant.create({
    data: {
      ...novo,
      initiativeId: atual.id,
      ...(noFim ? { addedMode: 'append', position: naFila(atual.participants).length } : {}),
    },
  })
}

// Vale em `active` e em `paused` (a sala), sempre com o combate já ativo: antes
// disso, cancela-se. A Inspiração não gasta morre com o combate.
export async function finalizarIniciativa(mestreId: string, roomId: string): Promise<void> {
  await exigirMestre(mestreId, roomId)
  const atual = await exigirAtual(
    roomId,
    ['active'],
    'Antes de o combate começar, a iniciativa se cancela.',
  )
  await prisma.$transaction([
    prisma.initiative.update({
      where: { id: atual.id },
      data: { status: 'finished', finishedAt: new Date(), pausedAt: null },
    }),
    prisma.room.update({ where: { id: roomId }, data: { status: 'lobby' } }),
  ])
}
