import type { Character, Prisma, RoomCharacter, RoomTempNpc } from '@prisma/client'

// Como um PJ, NPC de ficha ou NPC temporário da sala vira participante — na
// abertura e na entrada no meio (docs/negocio/iniciativa.md).

export type NovoParticipante = Omit<
  Prisma.InitiativeParticipantUncheckedCreateInput,
  'initiativeId'
>

// PJ morto ou sem jogador ativo não entra; NPC de ficha entra sempre.
export function vinculoElegivel(vinculo: RoomCharacter): boolean {
  return vinculo.isNpc || (vinculo.activeForUserId !== null && vinculo.diedAt === null)
}

export function deVinculo(vinculo: RoomCharacter & { character: Character }): NovoParticipante {
  return {
    participantType: 'character',
    characterId: vinculo.characterId,
    label: vinculo.character.name,
    // NPC não tem responsável: quem rola é o mestre.
    userIdResponsible: vinculo.isNpc ? null : vinculo.activeForUserId,
    initiativeMod: vinculo.character.initiativeMod,
  }
}

export function deTemporario(temporario: RoomTempNpc): NovoParticipante {
  return {
    participantType: 'temp_npc',
    tempNpcId: temporario.id,
    label: temporario.label,
    initiativeMod: temporario.initiativeMod,
  }
}
