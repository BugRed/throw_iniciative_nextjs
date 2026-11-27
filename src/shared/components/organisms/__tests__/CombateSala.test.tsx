import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CombateSala } from '@/shared/components/organisms/CombateSala'
import type {
  AcoesIniciativa,
  IniciativaDados,
  PainelIniciativaDados,
  ParticipanteDados,
} from '@/shared/components/organisms/iniciativa-tipos'

const acao = () => vi.fn(async () => ({ ok: true as const }))

function acoes(): AcoesIniciativa {
  return {
    abrir: acao(),
    avancar: acao(),
    cancelar: acao(),
    rolarMinha: acao(),
    rolarNpcs: acao(),
    usarInspiracao: acao(),
    rolarDesempate: acao(),
    concederInspiracao: acao(),
    modoRolagem: acao(),
    removerDaFila: acao(),
    marcarMorte: acao(),
    passarVez: acao(),
    finalizar: acao(),
    adicionar: acao(),
    pausar: acao(),
    retomar: acao(),
  }
}

function p(id: string, extra: Partial<ParticipanteDados> = {}): ParticipanteDados {
  return {
    id,
    rotulo: id.toUpperCase(),
    tipo: 'pj',
    characterId: `c-${id}`,
    total: null,
    modificador: 0,
    rolou: false,
    jogou: false,
    modo: 'normal',
    inspiracao: false,
    desempatePendente: false,
    ehMeu: false,
    ...extra,
  }
}

function combate(extra: Partial<IniciativaDados> = {}): IniciativaDados {
  return {
    status: 'active',
    rodada: 2,
    pausada: false,
    participantes: [p('a', { total: 18 }), p('b', { tipo: 'npc', characterId: null })],
    daVezId: 'a',
    proximoId: 'b',
    ...extra,
  }
}

function renderizar(painel: Partial<PainelIniciativaDados>, statusSala = 'active') {
  const a = acoes()
  render(
    <CombateSala
      roomId="r-1"
      statusSala={statusSala}
      painel={{ ehMestre: false, atual: null, candidatos: [], ...painel }}
      acoes={a}
    />,
  )
  return a
}

const botao = (nome: string) => screen.queryByRole('button', { name: nome })

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('CombateSala — abertura', () => {
  it('deve dar ao mestre a lista pré-marcada para desmarcar quem fica de fora', () => {
    renderizar(
      {
        ehMestre: true,
        candidatos: [
          { id: 'c-1', rotulo: 'Aria', campo: 'characterId' },
          { id: 't-1', rotulo: 'Goblin', campo: 'tempNpcId' },
        ],
      },
      'lobby',
    )

    expect(screen.getByRole('checkbox', { name: 'Aria' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Goblin' })).toBeChecked()
    expect(botao('Iniciar iniciativa')).toBeInTheDocument()
  })

  it('não deve mostrar nada ao jogador sem combate, nem ao mestre fora do lobby', () => {
    const { container } = render(
      <CombateSala
        roomId="r-1"
        statusSala="lobby"
        painel={{ ehMestre: false, atual: null, candidatos: [] }}
        acoes={acoes()}
      />,
    )
    expect(container).toBeEmptyDOMElement()

    renderizar({ ehMestre: true }, 'paused')
    expect(botao('Iniciar iniciativa')).not.toBeInTheDocument()
  })
})

describe('CombateSala — a vez', () => {
  it('deve avisar "É a sua vez" e deixar o jogador passar', async () => {
    const a = renderizar({ atual: combate({ participantes: [p('a', { ehMeu: true }), p('b')] }) })

    expect(screen.getByRole('status')).toHaveTextContent('É a sua vez')
    await userEvent.click(botao('Passar a vez') as HTMLElement)
    expect(a.passarVez).toHaveBeenCalledTimes(1)
  })

  it('deve avisar "Prepare-se" ao próximo, sem deixá-lo passar a vez alheia', () => {
    renderizar({ atual: combate({ participantes: [p('a'), p('b', { ehMeu: true })] }) })

    expect(screen.getByRole('status')).toHaveTextContent('Prepare-se')
    expect(screen.getByText('Vez de A.')).toBeInTheDocument()
    expect(botao('Passar a vez')).not.toBeInTheDocument()
  })

  it('deve mostrar a rodada e a vez marcada na fila', () => {
    renderizar({ atual: combate() })

    expect(screen.getByText('Rodada 2')).toBeInTheDocument()
    const fila = screen.getByRole('list')
    expect(within(fila).getAllByRole('listitem')[0]).toHaveAttribute('aria-current', 'step')
    expect(within(fila).getByText('18')).toBeInTheDocument()
  })

  it('não deve deixar ninguém passar com a sala pausada', () => {
    renderizar({
      ehMestre: true,
      atual: combate({ pausada: true, participantes: [p('a', { ehMeu: true }), p('b')] }),
    })

    expect(screen.getByText('Pausada')).toBeInTheDocument()
    expect(botao('Passar a vez')).not.toBeInTheDocument()
    expect(botao('Retomar')).toBeInTheDocument()
    expect(screen.queryByLabelText('Entra no meio')).not.toBeInTheDocument()
  })
})

describe('CombateSala — rolagens', () => {
  it('deve oferecer ao jogador rolar uma vez e, com Inspiração, re-rolar', () => {
    renderizar({ atual: combate({ status: 'rolling', participantes: [p('a', { ehMeu: true })] }) })
    expect(botao('Rolar iniciativa')).toBeInTheDocument()
  })

  it('deve trocar "rolar" por "usar Inspiração" depois que o jogador rolou com ela', () => {
    const meu = p('a', { ehMeu: true, rolou: true, total: 12, inspiracao: true })
    renderizar({ atual: combate({ status: 'rolling', participantes: [meu] }) })

    expect(botao('Rolar iniciativa')).not.toBeInTheDocument()
    expect(botao('Usar Inspiração (re-rolar)')).toBeInTheDocument()
  })

  it('deve dar ao mestre o botão dos NPCs e o de desempate só a quem o deve', () => {
    renderizar({
      ehMestre: true,
      atual: combate({ status: 'rolling', participantes: [p('n', { tipo: 'npc', ehMeu: true })] }),
    })
    expect(botao('Rolar os NPCs')).toBeInTheDocument()
  })

  it('deve pedir o desempate em `ordered` a quem está empatado', () => {
    const meu = p('a', { ehMeu: true, rolou: true, total: 15, desempatePendente: true })
    renderizar({ atual: combate({ status: 'ordered', daVezId: null, participantes: [meu] }) })

    expect(botao('Rolar desempate')).toBeInTheDocument()
  })
})

describe('CombateSala — painel do mestre', () => {
  it.each([
    ['draft', 'Abrir rolagens'],
    ['rolling', 'Ordenar'],
    ['ordered', 'Começar combate'],
  ] as const)('deve nomear o avanço de `%s` como "%s" e permitir cancelar', (status, rotulo) => {
    renderizar({ ehMestre: true, atual: combate({ status, daVezId: null }) })

    expect(botao(rotulo)).toBeInTheDocument()
    expect(botao('Cancelar iniciativa')).toBeInTheDocument()
    expect(botao('Finalizar combate')).not.toBeInTheDocument()
  })

  it('deve pedir confirmação antes de finalizar e não enviar se o mestre desistir', async () => {
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const a = renderizar({ ehMestre: true, atual: combate() })

    await userEvent.click(botao('Finalizar combate') as HTMLElement)

    expect(confirmar).toHaveBeenCalledWith(expect.stringContaining('Finalizar o combate?'))
    expect(a.finalizar).not.toHaveBeenCalled()
  })

  it('deve oferecer a entrada no meio com os candidatos', () => {
    renderizar({
      ehMestre: true,
      atual: combate(),
      candidatos: [{ id: 't-9', rotulo: 'Lobo', campo: 'tempNpcId' }],
    })

    expect(screen.getByLabelText('Entra no meio')).toHaveTextContent('Lobo')
  })

  it('deve marcar modo só antes de rolar e morte só de PJ', () => {
    renderizar({ ehMestre: true, atual: combate({ status: 'rolling', daVezId: null }) })

    expect(screen.getAllByRole('button', { name: 'Marcar modo' })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Marcar morte' })).toHaveLength(1)
  })

  it('não deve dar controles de participante ao jogador', () => {
    renderizar({ atual: combate() })

    expect(botao('Remover')).not.toBeInTheDocument()
    expect(botao('Marcar morte')).not.toBeInTheDocument()
  })
})
