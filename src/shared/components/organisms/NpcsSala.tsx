import { Input } from '@/shared/components/atoms/Input'
import { type OpcaoSelect, Select } from '@/shared/components/atoms/Select'
import { FormAcao } from '@/shared/components/molecules/FormAcao'
import type { AcoesLobby, NpcLobbyDados } from '@/shared/components/organisms/lobby-tipos'

function descreverStats(stats: NonNullable<NpcLobbyDados['stats']>): string {
  const sinal = stats.initiativeMod >= 0 ? '+' : ''
  return `PV ${stats.hpMax} · CA ${stats.armorClass} · Init ${sinal}${stats.initiativeMod}`
}

function LinhaNpc({
  roomId,
  npc,
  ehMestre,
  acao,
}: {
  roomId: string
  npc: NpcLobbyDados
  ehMestre: boolean
  acao: AcoesLobby['removerNpc']
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-paper-300 px-4 py-2">
      <span className="font-serif text-ink-900">{npc.rotulo}</span>
      {/* Stats só existem no payload do mestre; o jogador recebe apenas o rótulo. */}
      {npc.stats && (
        <span className="font-mono text-sm text-ink-500">{descreverStats(npc.stats)}</span>
      )}
      {ehMestre && (
        <FormAcao
          acao={acao}
          rotulo="Remover"
          variante="ghost"
          campos={{ roomId, npcId: npc.id, tipo: npc.tipo }}
        />
      )}
    </li>
  )
}

function AdicionarNpcs({
  roomId,
  npcsFicha,
  moldes,
  acoes,
}: {
  roomId: string
  npcsFicha: OpcaoSelect[]
  moldes: OpcaoSelect[]
  acoes: Pick<AcoesLobby, 'anexarNpc' | 'instanciarNpc'>
}) {
  return (
    <div className="flex flex-col gap-4">
      {npcsFicha.length > 0 && (
        <FormAcao acao={acoes.anexarNpc} rotulo="Adicionar NPC" campos={{ roomId }}>
          <Select rotulo="NPC Aventureiro" name="characterId" opcoes={npcsFicha} />
        </FormAcao>
      )}
      {moldes.length > 0 && (
        <FormAcao acao={acoes.instanciarNpc} rotulo="Adicionar monstros" campos={{ roomId }}>
          <Select rotulo="Molde" name="moldeId" opcoes={moldes} />
          <Input
            rotulo="Quantidade"
            name="quantidade"
            type="number"
            min={1}
            max={20}
            defaultValue={1}
          />
        </FormAcao>
      )}
    </div>
  )
}

export function NpcsSala({
  roomId,
  npcs,
  ehMestre,
  npcsFicha,
  moldes,
  acoes,
}: {
  roomId: string
  npcs: NpcLobbyDados[]
  ehMestre: boolean
  npcsFicha: OpcaoSelect[]
  moldes: OpcaoSelect[]
  acoes: Pick<AcoesLobby, 'anexarNpc' | 'instanciarNpc' | 'removerNpc'>
}) {
  return (
    <section aria-label="NPCs" className="flex flex-col gap-3">
      <h2 className="font-display text-lg text-ink-900">NPCs</h2>
      {npcs.length === 0 ? (
        <p className="font-serif text-ink-500">Nenhum NPC na sala ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {npcs.map((npc) => (
            <LinhaNpc
              key={`${npc.tipo}-${npc.id}`}
              roomId={roomId}
              npc={npc}
              ehMestre={ehMestre}
              acao={acoes.removerNpc}
            />
          ))}
        </ul>
      )}
      {ehMestre && (
        <AdicionarNpcs roomId={roomId} npcsFicha={npcsFicha} moldes={moldes} acoes={acoes} />
      )}
    </section>
  )
}
