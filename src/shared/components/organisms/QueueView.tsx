import { Badge } from '@/shared/components/atoms/Badge'
import { ControlesParticipante } from '@/shared/components/organisms/ControlesParticipante'
import {
  type AcoesIniciativa,
  type IniciativaDados,
  type ParticipanteDados,
  ROTULO_MODO,
  ROTULO_STATUS_INICIATIVA,
} from '@/shared/components/organisms/iniciativa-tipos'

// A fila do combate, igual para todos da sala (mesa aberta: ordem e totais
// visíveis). O que muda por papel são os controles do mestre em cada linha.

type Props = {
  roomId: string
  iniciativa: IniciativaDados
  ehMestre: boolean
  acoes: AcoesIniciativa
}

function Resultado({ participante }: { participante: ParticipanteDados }) {
  if (participante.total !== null) {
    return <span className="font-mono text-lg font-bold text-ink-900">{participante.total}</span>
  }
  return <span className="font-sans text-xs text-ink-500">não rolou</span>
}

function Marcas({
  participante,
  iniciativa,
}: {
  participante: ParticipanteDados
  iniciativa: IniciativaDados
}) {
  return (
    <span className="flex flex-wrap gap-1">
      {participante.id === iniciativa.daVezId && <Badge variante="gold">Na vez</Badge>}
      {participante.id === iniciativa.proximoId && <Badge variante="fire">Prepare-se</Badge>}
      {participante.jogou && <Badge variante="ash">Já jogou</Badge>}
      {participante.inspiracao && <Badge variante="moss">Inspiração</Badge>}
      {participante.modo !== 'normal' && (
        <Badge variante="outline">{ROTULO_MODO[participante.modo]}</Badge>
      )}
      {participante.desempatePendente && <Badge variante="wine">Desempate</Badge>}
      {participante.ehMeu && <Badge variante="outline">Seu</Badge>}
    </span>
  )
}

function Cabecalho({ iniciativa }: { iniciativa: IniciativaDados }) {
  return (
    <header className="flex flex-wrap items-center gap-2">
      <h2 className="font-display text-xl font-bold text-ink-900">Iniciativa</h2>
      <Badge variante="outline">{ROTULO_STATUS_INICIATIVA[iniciativa.status]}</Badge>
      {iniciativa.status === 'active' && (
        <Badge variante="gold">{`Rodada ${iniciativa.rodada}`}</Badge>
      )}
      {iniciativa.pausada && <Badge variante="fire">Pausada</Badge>}
    </header>
  )
}

export function QueueView({ roomId, iniciativa, ehMestre, acoes }: Props) {
  return (
    <section aria-label="Fila de iniciativa" className="flex flex-col gap-3">
      <Cabecalho iniciativa={iniciativa} />
      <ol className="flex flex-col gap-2">
        {iniciativa.participantes.map((p, indice) => (
          <li
            key={p.id}
            aria-current={p.id === iniciativa.daVezId ? 'step' : undefined}
            className={`flex flex-col gap-2 rounded-md border px-4 py-3 ${
              p.id === iniciativa.daVezId
                ? 'border-gold-500 bg-gold-500/10'
                : 'border-ink-900/15 bg-paper-50'
            }`}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="w-6 font-mono text-sm text-ink-500">{indice + 1}.</span>
              <span className="font-serif text-ink-900">{p.rotulo}</span>
              <Resultado participante={p} />
              <Marcas participante={p} iniciativa={iniciativa} />
            </div>
            {ehMestre && (
              <ControlesParticipante
                roomId={roomId}
                status={iniciativa.status}
                participante={p}
                acoes={acoes}
              />
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
