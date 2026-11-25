import type { Initiative, InitiativeParticipant, InitiativeStatus, Prisma } from '@prisma/client'

import { prisma } from '@/server/db/prisma'
import { ConflictError, NotFoundError } from '@/server/http/errors'

// Guardas e leituras compartilhadas pelos services da iniciativa
// (docs/negocio/iniciativa.md).

export const SEM_INICIATIVA = 'Não há iniciativa em andamento nesta sala.'

export const STATUS_EM_ANDAMENTO: InitiativeStatus[] = ['draft', 'rolling', 'ordered', 'active']

export type IniciativaComParticipantes = Initiative & { participants: InitiativeParticipant[] }

// Cliente do Prisma ou de uma transação: os helpers servem aos dois.
export type Cliente = Prisma.TransactionClient

export async function buscarAtual(
  roomId: string,
  cliente: Cliente = prisma,
): Promise<IniciativaComParticipantes | null> {
  return cliente.initiative.findFirst({
    where: { roomId, status: { in: STATUS_EM_ANDAMENTO } },
    include: { participants: { orderBy: { createdAt: 'asc' } } },
  })
}

// Só pode haver uma não-finalizada por sala (guardado aqui, não por UNIQUE).
export async function exigirAtual(
  roomId: string,
  permitidos: InitiativeStatus[],
  mensagem: string,
): Promise<IniciativaComParticipantes> {
  const atual = await buscarAtual(roomId)
  if (!atual) throw new NotFoundError(SEM_INICIATIVA)
  if (!permitidos.includes(atual.status)) throw new ConflictError(mensagem)
  return atual
}

export function naFila(participantes: InitiativeParticipant[]): InitiativeParticipant[] {
  return participantes.filter((p) => !p.removedAt)
}

export function exigirParticipante(
  atual: IniciativaComParticipantes,
  participantId: string,
): InitiativeParticipant {
  const participante = naFila(atual.participants).find((p) => p.id === participantId)
  if (!participante) throw new NotFoundError('Participante não encontrado neste combate.')
  return participante
}

export type Ocupado = { userId: string; nome: string }

// Quem, entre `userIds`, já está numa sala `active` que não é esta — como mestre
// ou como jogador. `paused` e `lobby` não ocupam ninguém (docs/negocio/salas.md).
export async function ocupadosEmOutraSala(
  userIds: string[],
  roomId: string,
  cliente: Cliente = prisma,
): Promise<Ocupado[]> {
  const ocupados = await cliente.user.findMany({
    where: {
      id: { in: userIds },
      OR: [
        { masteredRooms: { some: { status: 'active', id: { not: roomId } } } },
        {
          roomMemberships: {
            some: { status: 'active', room: { status: 'active', id: { not: roomId } } },
          },
        },
      ],
    },
    select: { id: true, name: true },
  })
  return ocupados.map((u) => ({ userId: u.id, nome: u.name }))
}

export async function exigirNinguemOcupado(userIds: string[], roomId: string): Promise<void> {
  const ocupados = await ocupadosEmOutraSala(userIds, roomId)
  if (ocupados.length === 0) return
  // O mestre vê quem está ocupado, nunca a mesa: só o próprio ocupado a vê.
  throw new ConflictError('Há quem já esteja em outra sala ativa.', { ocupados })
}
