import { notFound } from 'next/navigation'

import {
  acaoAnexarNpc,
  acaoAnexarPersonagem,
  acaoDecidirPedido,
  acaoDestruirSala,
  acaoExpulsar,
  acaoInstanciarNpc,
  acaoPassarCargo,
  acaoRemoverNpc,
  acaoSair,
} from '@/app/(app)/rooms/actions'
import {
  acaoAbrirIniciativa,
  acaoAdicionarParticipante,
  acaoAvancarIniciativa,
  acaoCancelarIniciativa,
  acaoConcederInspiracao,
  acaoFinalizarIniciativa,
  acaoMarcarMorte,
  acaoModoRolagem,
  acaoPassarVez,
  acaoPausarSala,
  acaoRemoverDaFila,
  acaoRetomarSala,
  acaoRolarDesempate,
  acaoRolarMinha,
  acaoRolarNpcs,
  acaoUsarInspiracao,
} from '@/app/(app)/rooms/iniciativa-actions'
import { AppError } from '@/server/http/errors'
import { controlarPainel } from '@/server/iniciativa/iniciativa.controller'
import { controlarMoldes } from '@/server/npcs/npcs.controller'
import { controlarListagem } from '@/server/personagens/personagens.controller'
import { controlarLobby } from '@/server/salas/salas.controller'
import { AtualizadorSala } from '@/shared/components/molecules/AtualizadorSala'
import { CombateSala } from '@/shared/components/organisms/CombateSala'
import type { AcoesIniciativa } from '@/shared/components/organisms/iniciativa-tipos'
import { type AcoesLobby, type OpcoesLobby } from '@/shared/components/organisms/lobby-tipos'
import { LobbySala } from '@/shared/components/organisms/LobbySala'

export const dynamic = 'force-dynamic'

const ACOES: AcoesLobby = {
  decidirPedido: acaoDecidirPedido,
  expulsar: acaoExpulsar,
  passarCargo: acaoPassarCargo,
  sair: acaoSair,
  destruir: acaoDestruirSala,
  anexarPersonagem: acaoAnexarPersonagem,
  anexarNpc: acaoAnexarNpc,
  removerNpc: acaoRemoverNpc,
  instanciarNpc: acaoInstanciarNpc,
}

const ACOES_INICIATIVA: AcoesIniciativa = {
  abrir: acaoAbrirIniciativa,
  avancar: acaoAvancarIniciativa,
  cancelar: acaoCancelarIniciativa,
  rolarMinha: acaoRolarMinha,
  rolarNpcs: acaoRolarNpcs,
  usarInspiracao: acaoUsarInspiracao,
  rolarDesempate: acaoRolarDesempate,
  concederInspiracao: acaoConcederInspiracao,
  modoRolagem: acaoModoRolagem,
  removerDaFila: acaoRemoverDaFila,
  marcarMorte: acaoMarcarMorte,
  passarVez: acaoPassarVez,
  finalizar: acaoFinalizarIniciativa,
  adicionar: acaoAdicionarParticipante,
  pausar: acaoPausarSala,
  retomar: acaoRetomarSala,
}

// Quem não é membro (ou a sala não existe) recebe o mesmo 404: a página não
// confirma a existência de uma sala em que a pessoa não tem papel.
async function carregarLobby(roomId: string) {
  try {
    return await controlarLobby(roomId)
  } catch (erro) {
    if (erro instanceof AppError && (erro.status === 404 || erro.status === 422)) notFound()
    throw erro
  }
}

async function carregarOpcoes(ehMestre: boolean): Promise<OpcoesLobby> {
  const fichas = await controlarListagem()
  const moldes = ehMestre ? await controlarMoldes() : []
  return {
    personagens: fichas.filter((f) => !f.isNpc).map((f) => ({ valor: f.id, rotulo: f.name })),
    npcsFicha: fichas.filter((f) => f.isNpc).map((f) => ({ valor: f.id, rotulo: f.name })),
    moldes: moldes.map((m) => ({ valor: m.id, rotulo: m.name })),
  }
}

export default async function SalaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const lobby = await carregarLobby(id)
  const [opcoes, painel] = await Promise.all([
    carregarOpcoes(lobby.ehMestre),
    controlarPainel(lobby.sala.id),
  ])

  return (
    <main className="mx-auto flex max-w-4xl flex-1 flex-col gap-6 px-6 py-12">
      <AtualizadorSala roomId={lobby.sala.id} />
      <CombateSala
        roomId={lobby.sala.id}
        statusSala={lobby.sala.status}
        painel={painel}
        acoes={ACOES_INICIATIVA}
      />
      <LobbySala lobby={lobby} acoes={ACOES} opcoes={opcoes} />
    </main>
  )
}
