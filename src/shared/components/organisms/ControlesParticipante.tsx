import { Select } from '@/shared/components/atoms/Select'
import { FormAcao } from '@/shared/components/molecules/FormAcao'
import {
  type AcoesIniciativa,
  type IniciativaDados,
  type ModoRolagem,
  type ParticipanteDados,
  ROTULO_MODO,
} from '@/shared/components/organisms/iniciativa-tipos'

// O que o mestre faz com um participante da fila. Cada botão só aparece na
// fase em que o servidor aceita a operação (docs/negocio/iniciativa.md).

const OPCOES_MODO = (Object.keys(ROTULO_MODO) as ModoRolagem[]).map((modo) => ({
  valor: modo,
  rotulo: ROTULO_MODO[modo],
}))

type Props = {
  roomId: string
  status: IniciativaDados['status']
  participante: ParticipanteDados
  acoes: Pick<
    AcoesIniciativa,
    'modoRolagem' | 'concederInspiracao' | 'removerDaFila' | 'marcarMorte'
  >
}

function AntesDeRolar({ roomId, participante, acoes }: Omit<Props, 'status'>) {
  const campos = { roomId, participantId: participante.id }
  return (
    <>
      {!participante.rolou && (
        <FormAcao acao={acoes.modoRolagem} rotulo="Marcar modo" campos={campos}>
          <Select
            rotulo={`Modo de ${participante.rotulo}`}
            name="modo"
            id={`modo-${participante.id}`}
            opcoes={OPCOES_MODO}
            defaultValue={participante.modo}
          />
        </FormAcao>
      )}
      {!participante.inspiracao && (
        <FormAcao acao={acoes.concederInspiracao} rotulo="Conceder Inspiração" campos={campos} />
      )}
    </>
  )
}

export function ControlesParticipante({ roomId, status, participante, acoes }: Props) {
  const antesDeRolar = status === 'draft' || status === 'rolling'
  return (
    <div className="flex flex-wrap items-end gap-2">
      {antesDeRolar && <AntesDeRolar roomId={roomId} participante={participante} acoes={acoes} />}
      <FormAcao
        acao={acoes.removerDaFila}
        rotulo="Remover"
        variante="ghost"
        campos={{ roomId, participantId: participante.id }}
        confirmar={`Remover ${participante.rotulo} deste combate? Não dá para voltar.`}
      />
      {participante.tipo === 'pj' && participante.characterId && (
        <FormAcao
          acao={acoes.marcarMorte}
          rotulo="Marcar morte"
          variante="danger"
          campos={{ roomId, characterId: participante.characterId }}
          confirmar={`Marcar a morte de ${participante.rotulo} nesta sala?`}
        />
      )}
    </div>
  )
}
