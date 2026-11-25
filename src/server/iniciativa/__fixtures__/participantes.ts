import type { InitiativeParticipant } from '@prisma/client'

// Fábrica de participantes para os testes dos services da iniciativa.
export function participante(
  sobrescritas: Partial<InitiativeParticipant> = {},
): InitiativeParticipant {
  return {
    id: 'p-1',
    initiativeId: 'i-1',
    participantType: 'character',
    characterId: 'c-1',
    tempNpcId: null,
    label: 'Aria',
    userIdResponsible: 'u-jogador',
    initiativeMod: 2,
    rollResult: null,
    position: null,
    hasRolled: false,
    hasPlayed: false,
    addedMode: 'roll',
    rollMode: 'normal',
    hasInspiration: false,
    tiebreakRolls: [],
    removedAt: null,
    createdAt: new Date('2026-11-24T10:00:00Z'),
    ...sobrescritas,
  }
}

export function iniciativa(
  status: string,
  participants: InitiativeParticipant[],
  extra: Record<string, unknown> = {},
) {
  return {
    id: 'i-1',
    roomId: 'r-1',
    status,
    currentPosition: 0,
    turnStartedAt: null,
    pausedAt: null,
    startedAt: null,
    finishedAt: null,
    participants,
    ...extra,
  }
}
