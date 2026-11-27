import { Select } from '@/shared/components/atoms/Select'
import { FormAcao } from '@/shared/components/molecules/FormAcao'
import {
  type AcoesIniciativa,
  type CandidatoDados,
  type IniciativaDados,
  ROTULO_AVANCO,
} from '@/shared/components/organisms/iniciativa-tipos'

// Condução do combate pelo mestre: avançar a fase, adicionar no meio, pausar,
// cancelar (antes de ativar) ou finalizar (depois), sempre com confirmação no
// que não tem volta.

type Props = {
  roomId: string
  iniciativa: IniciativaDados
  candidatos: CandidatoDados[]
  acoes: Pick<
    AcoesIniciativa,
    'avancar' | 'cancelar' | 'finalizar' | 'adicionar' | 'pausar' | 'retomar'
  >
}

function Adicionar({ roomId, candidatos, acoes }: Omit<Props, 'iniciativa'>) {
  if (candidatos.length === 0) return null
  return (
    <FormAcao acao={acoes.adicionar} rotulo="Adicionar ao combate" campos={{ roomId }}>
      <Select
        rotulo="Entra no meio"
        name="entrante"
        opcoes={candidatos.map((c) => ({ valor: `${c.campo}:${c.id}`, rotulo: c.rotulo }))}
      />
    </FormAcao>
  )
}

function Encerrar({ roomId, iniciativa, acoes }: Omit<Props, 'candidatos'>) {
  const campos = { roomId }
  if (iniciativa.status !== 'active') {
    return (
      <FormAcao
        acao={acoes.cancelar}
        rotulo="Cancelar iniciativa"
        variante="ghost"
        campos={campos}
        confirmar="Cancelar a iniciativa? O combate é descartado e a sala volta ao lobby."
      />
    )
  }
  return (
    <>
      <FormAcao
        acao={iniciativa.pausada ? acoes.retomar : acoes.pausar}
        rotulo={iniciativa.pausada ? 'Retomar' : 'Pausar'}
        campos={campos}
      />
      <FormAcao
        acao={acoes.finalizar}
        rotulo="Finalizar combate"
        variante="danger"
        campos={campos}
        confirmar="Finalizar o combate? A iniciativa termina e a sala volta ao lobby."
      />
    </>
  )
}

export function PainelMestre({ roomId, iniciativa, candidatos, acoes }: Props) {
  const rotuloAvanco = ROTULO_AVANCO[iniciativa.status]
  const pausada = iniciativa.pausada
  return (
    <section aria-label="Painel do mestre" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        {rotuloAvanco && (
          <FormAcao
            acao={acoes.avancar}
            rotulo={rotuloAvanco}
            variante="primary"
            tamanho="md"
            campos={{ roomId }}
          />
        )}
        <Encerrar roomId={roomId} iniciativa={iniciativa} acoes={acoes} />
      </div>
      {!pausada && <Adicionar roomId={roomId} candidatos={candidatos} acoes={acoes} />}
    </section>
  )
}
