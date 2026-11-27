import { FormAcao } from '@/shared/components/molecules/FormAcao'
import type {
  AcoesIniciativa,
  IniciativaDados,
  ParticipanteDados,
} from '@/shared/components/organisms/iniciativa-tipos'

// O que cabe a quem está olhando: rolar, gastar Inspiração, desempatar e passar
// a vez. "Meu" é o PJ do jogador ou, para o mestre, os NPCs.

type Props = {
  roomId: string
  iniciativa: IniciativaDados
  ehMestre: boolean
  acoes: Pick<
    AcoesIniciativa,
    'rolarMinha' | 'rolarNpcs' | 'usarInspiracao' | 'rolarDesempate' | 'passarVez'
  >
}

function Aviso({ titulo, texto, tom }: { titulo: string; texto: string; tom: 'vez' | 'proximo' }) {
  const cor = tom === 'vez' ? 'border-gold-500 bg-gold-500/15' : 'border-fire-500/40 bg-fire-500/10'
  return (
    <div role="status" className={`rounded-md border-2 px-4 py-3 ${cor}`}>
      <p className="font-display text-lg font-bold text-ink-900">{titulo}</p>
      <p className="font-serif text-sm text-ink-700">{texto}</p>
    </div>
  )
}

function Rolagens({ roomId, iniciativa, ehMestre, acoes }: Props) {
  const meus = iniciativa.participantes.filter((p) => p.ehMeu)
  const campos = { roomId }
  const rolando = iniciativa.status === 'rolling'
  const faltaRolar = rolando && meus.some((p) => !p.rolou)
  // A Inspiração se gasta depois de rolar; o mestre a concede, quem gasta é o jogador.
  const podeReRolar = rolando && !ehMestre && meus.some((p) => p.rolou && p.inspiracao)
  const desempate = iniciativa.status === 'ordered' && meus.some((p) => p.desempatePendente)
  return (
    <div className="flex flex-wrap gap-2">
      {faltaRolar && (
        <FormAcao
          acao={ehMestre ? acoes.rolarNpcs : acoes.rolarMinha}
          rotulo={ehMestre ? 'Rolar os NPCs' : 'Rolar iniciativa'}
          variante="primary"
          tamanho="md"
          campos={campos}
        />
      )}
      {podeReRolar && (
        <FormAcao acao={acoes.usarInspiracao} rotulo="Usar Inspiração (re-rolar)" campos={campos} />
      )}
      {desempate && (
        <FormAcao
          acao={acoes.rolarDesempate}
          rotulo="Rolar desempate"
          variante="primary"
          campos={campos}
        />
      )}
    </div>
  )
}

function Vez({ roomId, iniciativa, ehMestre, acoes }: Props) {
  const achar = (id: string | null): ParticipanteDados | undefined =>
    iniciativa.participantes.find((p) => p.id === id)
  const daVez = achar(iniciativa.daVezId)
  const proximo = achar(iniciativa.proximoId)
  if (!daVez) return null
  const minha = daVez.ehMeu
  // O mestre passa qualquer vez (destrava jogador ausente); em pausa, ninguém passa.
  const podePassar = (minha || ehMestre) && !iniciativa.pausada
  return (
    <div className="flex flex-col gap-3">
      {minha && <Aviso tom="vez" titulo="É a sua vez" texto={`${daVez.rotulo} age agora.`} />}
      {!minha && proximo?.ehMeu && (
        <Aviso tom="proximo" titulo="Prepare-se" texto={`${proximo.rotulo} é o próximo.`} />
      )}
      {!minha && <p className="font-serif text-ink-700">{`Vez de ${daVez.rotulo}.`}</p>}
      {podePassar && (
        <FormAcao
          acao={acoes.passarVez}
          rotulo="Passar a vez"
          variante="primary"
          tamanho="md"
          campos={{ roomId }}
        />
      )}
    </div>
  )
}

export function MinhaVez(props: Props) {
  if (props.iniciativa.status === 'active') return <Vez {...props} />
  return <Rolagens {...props} />
}
