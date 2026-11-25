import { Badge } from '@/shared/components/atoms/Badge'
import { Select } from '@/shared/components/atoms/Select'
import { FormAcao } from '@/shared/components/molecules/FormAcao'
import {
  type AcoesLobby,
  type LobbyDados,
  type OpcoesLobby,
  ROTULO_STATUS_SALA,
} from '@/shared/components/organisms/lobby-tipos'
import { MembrosSala } from '@/shared/components/organisms/MembrosSala'
import { NpcsSala } from '@/shared/components/organisms/NpcsSala'
import { PedidosEntrada } from '@/shared/components/organisms/PedidosEntrada'

// Lobby da sala: o mesmo organismo serve mestre e jogador; o que muda é o que
// o servidor entregou (código, stats e pedidos só vêm para o mestre).

function CabecalhoSala({ lobby }: { lobby: LobbyDados }) {
  const { sala } = lobby
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-ink-900">{sala.name}</h1>
        <Badge variante="outline">{ROTULO_STATUS_SALA[sala.status] ?? sala.status}</Badge>
      </div>
      {sala.codigo && (
        <p className="font-sans text-sm text-ink-500">
          Código de entrada{' '}
          <span className="rounded-md bg-leather-800 px-3 py-1 font-mono text-lg tracking-widest text-gold-300">
            {sala.codigo}
          </span>
        </p>
      )}
    </header>
  )
}

function PersonagemAtivo({
  roomId,
  opcoes,
  acao,
}: {
  roomId: string
  opcoes: OpcoesLobby['personagens']
  acao: AcoesLobby['anexarPersonagem']
}) {
  if (opcoes.length === 0) {
    return (
      <p className="font-serif text-ink-500">
        Você ainda não tem personagem. Crie uma ficha para entrar na iniciativa.
      </p>
    )
  }
  return (
    <FormAcao acao={acao} rotulo="Usar este personagem" campos={{ roomId }}>
      <Select rotulo="Seu personagem na sala" name="characterId" opcoes={opcoes} />
    </FormAcao>
  )
}

function AcoesDaSala({
  lobby,
  acoes,
}: {
  lobby: LobbyDados
  acoes: Pick<AcoesLobby, 'sair' | 'destruir'>
}) {
  const campos = { roomId: lobby.sala.id }
  if (!lobby.ehMestre) {
    return (
      <FormAcao
        acao={acoes.sair}
        rotulo="Sair da sala"
        variante="ghost"
        campos={campos}
        confirmar="Sair desta sala?"
      />
    )
  }
  if (lobby.sala.status === 'active') {
    return (
      <p className="font-sans text-sm text-ink-500">
        Pause a iniciativa para poder encerrar a sala.
      </p>
    )
  }
  return (
    <FormAcao
      acao={acoes.destruir}
      rotulo="Encerrar sala"
      variante="danger"
      campos={campos}
      confirmar="Encerrar a sala? Todos os membros perdem o acesso."
    />
  )
}

export function LobbySala({
  lobby,
  acoes,
  opcoes,
}: {
  lobby: LobbyDados
  acoes: AcoesLobby
  opcoes: OpcoesLobby
}) {
  const roomId = lobby.sala.id
  return (
    <div className="flex flex-col gap-8">
      <CabecalhoSala lobby={lobby} />
      {lobby.ehMestre && (
        <PedidosEntrada roomId={roomId} pedidos={lobby.pedidos} acao={acoes.decidirPedido} />
      )}
      <MembrosSala
        roomId={roomId}
        membros={lobby.membros}
        ehMestre={lobby.ehMestre}
        acoes={acoes}
      />
      {!lobby.ehMestre && (
        <PersonagemAtivo
          roomId={roomId}
          opcoes={opcoes.personagens}
          acao={acoes.anexarPersonagem}
        />
      )}
      <NpcsSala
        roomId={roomId}
        npcs={lobby.npcs}
        ehMestre={lobby.ehMestre}
        npcsFicha={opcoes.npcsFicha}
        moldes={opcoes.moldes}
        acoes={acoes}
      />
      {lobby.ehMestre && lobby.sala.status === 'lobby' && acoes.abrirIniciativa && (
        <FormAcao
          acao={acoes.abrirIniciativa}
          rotulo="Iniciar iniciativa"
          variante="primary"
          tamanho="md"
          campos={{ roomId }}
        />
      )}
      <AcoesDaSala lobby={lobby} acoes={acoes} />
    </div>
  )
}
