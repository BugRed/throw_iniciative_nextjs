import type { InitiativeParticipant } from '@prisma/client'

import { ordenarIniciativa } from '@/server/iniciativa/iniciativa.ordem'
import { type Cliente, naFila } from '@/server/iniciativa/iniciativa.regras'

// Reatribui `position` de quem está na fila: primeiro os que rolaram, pela ordem
// oficial; depois quem entrou no fim sem rolar, na ordem em que entrou.
// Devolve os que ainda precisam rolar o desempate.
export async function reposicionar(
  cliente: Cliente,
  participantes: InitiativeParticipant[],
): Promise<string[]> {
  const fila = naFila(participantes)
  const rolados = fila.filter(
    (p) => p.addedMode !== 'append' && p.hasRolled && p.rollResult !== null,
  )
  const anexados = fila.filter((p) => p.addedMode === 'append')
  const { ordem, pendentesDesempate } = ordenarIniciativa(
    rolados.map((p) => ({ ...p, rollResult: p.rollResult as number })),
  )
  await Promise.all(
    [...ordem, ...anexados].map((p, posicao) =>
      cliente.initiativeParticipant.update({ where: { id: p.id }, data: { position: posicao } }),
    ),
  )
  return pendentesDesempate
}

// A vez voltou ao topo: começa a rodada seguinte e ninguém jogou nela ainda.
export async function zerarJogadas(cliente: Cliente, initiativeId: string): Promise<void> {
  await cliente.initiativeParticipant.updateMany({
    where: { initiativeId },
    data: { hasPlayed: false },
  })
}
