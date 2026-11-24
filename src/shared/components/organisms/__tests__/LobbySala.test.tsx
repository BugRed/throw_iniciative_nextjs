import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { AcoesLobby, LobbyDados, OpcoesLobby } from '@/shared/components/organisms/lobby-tipos'
import { LobbySala } from '@/shared/components/organisms/LobbySala'

const acao = () => vi.fn().mockResolvedValue({ ok: true })
const ACOES: AcoesLobby = {
  decidirPedido: acao(),
  expulsar: acao(),
  passarCargo: acao(),
  sair: acao(),
  destruir: acao(),
  anexarPersonagem: acao(),
  anexarNpc: acao(),
  removerNpc: acao(),
  instanciarNpc: acao(),
}
const OPCOES: OpcoesLobby = {
  personagens: [{ valor: 'c-1', rotulo: 'Julius' }],
  npcsFicha: [{ valor: 'n-1', rotulo: 'Vilão' }],
  moldes: [{ valor: 'm-1', rotulo: 'Goblin' }],
}
const BASE: LobbyDados = {
  sala: { id: 'r-1', name: 'Mesa de sexta', status: 'lobby', codigo: null },
  ehMestre: false,
  membros: [
    { userId: 'u-m', nome: 'Ana', papel: 'master', pj: null },
    {
      userId: 'u-j',
      nome: 'Bia',
      papel: 'player',
      pj: { nome: 'Julius', classe: 'Mago', nivel: 3 },
    },
    { userId: 'u-k', nome: 'Caio', papel: 'player', pj: null },
  ],
  pedidos: [],
  npcs: [{ id: 'n-1', rotulo: 'Vilão', tipo: 'persistente' }],
}
const COMO_MESTRE: LobbyDados = {
  ...BASE,
  sala: { ...BASE.sala, codigo: 'AB2CD3' },
  ehMestre: true,
  pedidos: [{ userId: 'u-p', nome: 'Duda' }],
  npcs: [
    {
      id: 'n-1',
      rotulo: 'Vilão',
      tipo: 'persistente',
      stats: { hpMax: 40, armorClass: 15, initiativeMod: 3 },
    },
    {
      id: 't-1',
      rotulo: 'Goblin #1',
      tipo: 'temporario',
      stats: { hpMax: 7, armorClass: 12, initiativeMod: -1 },
    },
  ],
}

describe('LobbySala para o jogador', () => {
  it('deve mostrar a mesa com o PJ de cada um e "Sem personagem" para quem não escolheu', () => {
    render(<LobbySala lobby={BASE} acoes={ACOES} opcoes={OPCOES} />)

    expect(screen.getByRole('heading', { name: 'Mesa de sexta' })).toBeInTheDocument()
    expect(screen.getByText('Julius · Mago nível 3')).toBeInTheDocument()
    expect(screen.getByText('Sem personagem')).toBeInTheDocument()
  })

  it('não deve mostrar código, stats de NPC, pedidos nem ações de mestre', () => {
    render(<LobbySala lobby={BASE} acoes={ACOES} opcoes={OPCOES} />)

    expect(screen.queryByText('AB2CD3')).not.toBeInTheDocument()
    expect(screen.getByText('Vilão')).toBeInTheDocument()
    expect(screen.queryByText(/PV \d+/)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Aceitar|Expulsar|Encerrar|Adicionar/ }),
    ).not.toBeInTheDocument()
  })

  it('deve oferecer a escolha do PJ e a saída da sala', () => {
    render(<LobbySala lobby={BASE} acoes={ACOES} opcoes={OPCOES} />)

    expect(screen.getByLabelText('Seu personagem na sala')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Usar este personagem' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sair da sala' })).toBeInTheDocument()
  })

  it('deve orientar a criar uma ficha quando não há personagem para anexar', () => {
    render(<LobbySala lobby={BASE} acoes={ACOES} opcoes={{ ...OPCOES, personagens: [] }} />)

    expect(screen.getByText(/ainda não tem personagem/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Usar este personagem' })).not.toBeInTheDocument()
  })
})

describe('LobbySala para o mestre', () => {
  it('deve mostrar o código de entrada e os pedidos com aceitar e recusar', () => {
    render(<LobbySala lobby={COMO_MESTRE} acoes={ACOES} opcoes={OPCOES} />)

    expect(screen.getByText('AB2CD3')).toBeInTheDocument()
    const pedidos = screen.getByRole('region', { name: 'Pedidos de entrada' })
    expect(within(pedidos).getByText('Duda')).toBeInTheDocument()
    expect(within(pedidos).getByRole('button', { name: 'Aceitar' })).toBeInTheDocument()
    expect(within(pedidos).getByRole('button', { name: 'Recusar' })).toBeInTheDocument()
  })

  it('deve mostrar os stats dos NPCs, com sinal na iniciativa', () => {
    render(<LobbySala lobby={COMO_MESTRE} acoes={ACOES} opcoes={OPCOES} />)

    expect(screen.getByText('PV 40 · CA 15 · Init +3')).toBeInTheDocument()
    expect(screen.getByText('PV 7 · CA 12 · Init -1')).toBeInTheDocument()
  })

  it('deve oferecer expulsar e passar o cargo só para jogadores, nunca para o mestre', () => {
    render(<LobbySala lobby={COMO_MESTRE} acoes={ACOES} opcoes={OPCOES} />)

    expect(screen.getAllByRole('button', { name: 'Expulsar' })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Passar o cargo' })).toHaveLength(2)
  })

  it('deve permitir adicionar NPC de ficha e monstros de molde, e esconder o que não tem opção', () => {
    const { rerender } = render(<LobbySala lobby={COMO_MESTRE} acoes={ACOES} opcoes={OPCOES} />)

    expect(screen.getByRole('button', { name: 'Adicionar NPC' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Adicionar monstros' })).toBeInTheDocument()

    rerender(
      <LobbySala
        lobby={COMO_MESTRE}
        acoes={ACOES}
        opcoes={{ ...OPCOES, npcsFicha: [], moldes: [] }}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Adicionar NPC' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Adicionar monstros' })).not.toBeInTheDocument()
  })

  it('deve oferecer encerrar a sala no lobby e pausar quando está em andamento', () => {
    const { rerender } = render(<LobbySala lobby={COMO_MESTRE} acoes={ACOES} opcoes={OPCOES} />)
    expect(screen.getByRole('button', { name: 'Encerrar sala' })).toBeInTheDocument()

    rerender(
      <LobbySala
        lobby={{ ...COMO_MESTRE, sala: { ...COMO_MESTRE.sala, status: 'active' } }}
        acoes={ACOES}
        opcoes={OPCOES}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Encerrar sala' })).not.toBeInTheDocument()
    expect(screen.getByText(/Pause a iniciativa/)).toBeInTheDocument()
    expect(screen.getByText('Em andamento')).toBeInTheDocument()
  })
})
