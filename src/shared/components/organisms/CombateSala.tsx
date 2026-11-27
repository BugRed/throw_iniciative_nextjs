import { AberturaIniciativa } from '@/shared/components/organisms/AberturaIniciativa'
import type {
  AcoesIniciativa,
  PainelIniciativaDados,
} from '@/shared/components/organisms/iniciativa-tipos'
import { MinhaVez } from '@/shared/components/organisms/MinhaVez'
import { PainelMestre } from '@/shared/components/organisms/PainelMestre'
import { QueueView } from '@/shared/components/organisms/QueueView'

// O combate da sala: sem iniciativa, o mestre abre (com a sala em lobby); com
// ela, todos veem a fila e o que lhes cabe fazer.

export function CombateSala({
  roomId,
  statusSala,
  painel,
  acoes,
}: {
  roomId: string
  statusSala: string
  painel: PainelIniciativaDados
  acoes: AcoesIniciativa
}) {
  const { atual, ehMestre, candidatos } = painel
  if (!atual) {
    if (!ehMestre || statusSala !== 'lobby') return null
    return <AberturaIniciativa roomId={roomId} candidatos={candidatos} acao={acoes.abrir} />
  }
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-ink-900/15 p-4">
      <QueueView roomId={roomId} iniciativa={atual} ehMestre={ehMestre} acoes={acoes} />
      <MinhaVez roomId={roomId} iniciativa={atual} ehMestre={ehMestre} acoes={acoes} />
      {ehMestre && (
        <PainelMestre roomId={roomId} iniciativa={atual} candidatos={candidatos} acoes={acoes} />
      )}
    </div>
  )
}
