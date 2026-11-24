import type { InitiativeParticipant } from '@prisma/client'

import { ordenarIniciativa } from '@/server/iniciativa/iniciativa.ordem'
import { type Cliente, naFila } from '@/server/iniciativa/iniciativa.regras'

// Reatribui `position` de quem está na fila pela ordem oficial. Devolve os que
// ainda precisam rolar o desempate.
export async function reposicionar(
  cliente: Cliente,
  participantes: InitiativeParticipant[],
): Promise<string[]> {
  const rolados = naFila(participantes).filter((p) => p.hasRolled && p.rollResult !== null)
  const { ordem, pendentesDesempate } = ordenarIniciativa(
    rolados.map((p) => ({ ...p, rollResult: p.rollResult as number })),
  )
  await Promise.all(
    ordem.map((p, posicao) =>
      cliente.initiativeParticipant.update({ where: { id: p.id }, data: { position: posicao } }),
    ),
  )
  return pendentesDesempate
}
