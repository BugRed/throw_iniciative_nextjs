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
import { AppError } from '@/server/http/errors'
import { controlarMoldes } from '@/server/npcs/npcs.controller'
import { controlarListagem } from '@/server/personagens/personagens.controller'
import { controlarLobby } from '@/server/salas/salas.controller'
import { AtualizadorSala } from '@/shared/components/molecules/AtualizadorSala'
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
  const opcoes = await carregarOpcoes(lobby.ehMestre)

  return (
    <main className="mx-auto flex max-w-4xl flex-1 flex-col gap-6 px-6 py-12">
      <AtualizadorSala roomId={lobby.sala.id} />
      <LobbySala lobby={lobby} acoes={ACOES} opcoes={opcoes} />
    </main>
  )
}
