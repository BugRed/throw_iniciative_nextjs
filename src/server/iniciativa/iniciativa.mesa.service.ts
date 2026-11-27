import type { InitiativeParticipant, RollMode } from '@prisma/client'

import { prisma } from '@/server/db/prisma'
import { ConflictError, NotFoundError, ValidationError } from '@/server/http/errors'
import { reposicionar, zerarJogadas } from '@/server/iniciativa/iniciativa.fila'
import {
  buscarAtual,
  type Cliente,
  exigirAtual,
  exigirParticipante,
  type IniciativaComParticipantes,
  naFila,
} from '@/server/iniciativa/iniciativa.regras'
import { esquemaModoRolagem } from '@/server/iniciativa/iniciativa.schema'
import { exigirMestre } from '@/server/salas/salas.regras'
import { esquemaId } from '@/server/salas/salas.schema'

// O que só o mestre faz com a mesa em andamento: modo de rolagem, Inspiração,
// remoção da fila e morte do PJ (docs/negocio/iniciativa.md).

export async function marcarModoDeRolagem(
  mestreId: string,
  roomId: string,
  participantId: string,
  modoBruto: unknown,
): Promise<void> {
  const modo = esquemaModoRolagem.safeParse(modoBruto)
  if (!modo.success) throw new ValidationError('Modo de rolagem inválido.')
  await exigirMestre(mestreId, roomId)
  const atual = await exigirAtual(roomId, ['draft', 'rolling'], 'O modo se marca antes de rolar.')
  const alvo = exigirParticipante(atual, participantId)
  if (alvo.hasRolled) throw new ConflictError('Esse participante já rolou.')
  await prisma.initiativeParticipant.update({
    where: { id: alvo.id },
    data: { rollMode: modo.data as RollMode },
  })
}

// Binária (SRD 5.2.1): conceder a quem já tem não soma. Só PJ recebe.
export async function concederInspiracao(
  mestreId: string,
  roomId: string,
  participantId: string,
): Promise<void> {
  await exigirMestre(mestreId, roomId)
  const atual = await exigirAtual(roomId, ['draft', 'rolling'], 'A Inspiração vale nas rolagens.')
  const alvo = exigirParticipante(atual, participantId)
  if (!alvo.userIdResponsible)
    throw new ConflictError('Só personagem de jogador recebe Inspiração.')
  await prisma.initiativeParticipant.update({
    where: { id: alvo.id },
    data: { hasInspiration: true },
  })
}

// Tira da fila sem apagar a linha (a auditoria fica). Se era a vez dele, ela
// passa ao próximo; a posição de quem vem depois recua uma casa.
async function retirarDaFila(
  cliente: Cliente,
  atual: IniciativaComParticipantes,
  alvo: InitiativeParticipant,
): Promise<void> {
  await cliente.initiativeParticipant.update({
    where: { id: alvo.id },
    data: { removedAt: new Date(), position: null },
  })
  const restantes = naFila(atual.participants).filter((p) => p.id !== alvo.id)
  if (atual.status === 'ordered' || atual.status === 'active')
    await reposicionar(cliente, restantes)
  if (atual.status !== 'active' || alvo.position === null) return
  const eraAntes = alvo.position < atual.currentPosition
  const proxima = eraAntes ? atual.currentPosition - 1 : atual.currentPosition
  // Era a vez do último: a vez volta ao topo e a rodada avança, como ao passar.
  const virou = restantes.length > 0 && proxima >= restantes.length
  await cliente.initiative.update({
    where: { id: atual.id },
    data: {
      currentPosition: virou ? 0 : proxima,
      ...(virou ? { round: { increment: 1 } } : {}),
      ...(alvo.position === atual.currentPosition ? { turnStartedAt: new Date() } : {}),
    },
  })
  if (virou) await zerarJogadas(cliente, atual.id)
}

export async function removerParticipante(
  mestreId: string,
  roomId: string,
  participantId: string,
): Promise<void> {
  await exigirMestre(mestreId, roomId)
  const atual = await exigirAtual(roomId, ['draft', 'rolling', 'ordered', 'active'], '')
  const alvo = exigirParticipante(atual, participantId)
  await prisma.$transaction((tx) => retirarDaFila(tx, atual, alvo))
}

// Só o mestre marca, vale só naquela sala e não há desfazer (por ora). O ponto
// único de escrita facilita o "reviver" futuro.
export async function marcarMorteDoPersonagem(
  mestreId: string,
  roomId: string,
  characterId: string,
): Promise<void> {
  if (!esquemaId.safeParse(characterId).success) throw new ValidationError('Personagem inválido.')
  await exigirMestre(mestreId, roomId)
  const vinculo = await prisma.roomCharacter.findUnique({
    where: { roomId_characterId: { roomId, characterId } },
  })
  if (!vinculo || vinculo.isNpc || vinculo.diedAt) {
    throw new NotFoundError('Personagem de jogador vivo não encontrado nesta sala.')
  }
  const atual = await buscarAtual(roomId)
  const naOrdem = atual && naFila(atual.participants).find((p) => p.characterId === characterId)
  await prisma.$transaction(async (tx) => {
    await tx.roomCharacter.update({
      where: { roomId_characterId: { roomId, characterId } },
      // Zera o PJ ativo, senão a UNIQUE bloquearia o próximo PJ do jogador.
      data: { diedAt: new Date(), activeForUserId: null },
    })
    if (atual && naOrdem) await retirarDaFila(tx, atual, naOrdem)
  })
}
