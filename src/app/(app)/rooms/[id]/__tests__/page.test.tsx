import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { lobbyMock, personagensMock, moldesMock, notFoundMock } = vi.hoisted(() => ({
  lobbyMock: { controlarLobby: vi.fn() },
  personagensMock: { controlarListagem: vi.fn() },
  moldesMock: { controlarMoldes: vi.fn() },
  notFoundMock: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
  useRouter: () => ({ refresh: vi.fn() }),
}))
vi.mock('@/server/salas/salas.controller', () => lobbyMock)
vi.mock('@/server/personagens/personagens.controller', () => personagensMock)
vi.mock('@/server/npcs/npcs.controller', () => moldesMock)
vi.mock('@/app/(app)/rooms/actions', () => ({
  acaoAnexarNpc: vi.fn(),
  acaoAnexarPersonagem: vi.fn(),
  acaoDecidirPedido: vi.fn(),
  acaoDestruirSala: vi.fn(),
  acaoExpulsar: vi.fn(),
  acaoInstanciarNpc: vi.fn(),
  acaoPassarCargo: vi.fn(),
  acaoRemoverNpc: vi.fn(),
  acaoSair: vi.fn(),
}))
vi.mock('@/shared/components/molecules/AtualizadorSala', () => ({
  AtualizadorSala: ({ roomId }: { roomId: string }) => <span data-sala={roomId} />,
}))

import SalaPage from '@/app/(app)/rooms/[id]/page'
import { AppError } from '@/server/http/errors'

const FICHAS = [
  { id: 'c-1', name: 'Julius', isNpc: false },
  { id: 'n-1', name: 'Vilão', isNpc: true },
]
const LOBBY = {
  sala: { id: 'r-1', name: 'Mesa', status: 'lobby', codigo: null },
  ehMestre: false,
  membros: [{ userId: 'u-m', nome: 'Ana', papel: 'master', pj: null }],
  pedidos: [],
  npcs: [],
}
const params = Promise.resolve({ id: 'r-1' })

beforeEach(() => {
  vi.clearAllMocks()
  personagensMock.controlarListagem.mockResolvedValue(FICHAS)
  moldesMock.controlarMoldes.mockResolvedValue([{ id: 'm-1', name: 'Goblin' }])
  lobbyMock.controlarLobby.mockResolvedValue(LOBBY)
})

describe('Página da sala', () => {
  it('deve dar só os PJs como opção ao jogador, sem buscar moldes', async () => {
    render(await SalaPage({ params }))

    const select = screen.getByLabelText('Seu personagem na sala')
    expect(select).toHaveTextContent('Julius')
    expect(select).not.toHaveTextContent('Vilão')
    expect(moldesMock.controlarMoldes).not.toHaveBeenCalled()
  })

  it('deve dar NPCs de ficha e moldes ao mestre, e nenhum seletor de PJ', async () => {
    lobbyMock.controlarLobby.mockResolvedValue({
      ...LOBBY,
      ehMestre: true,
      sala: { ...LOBBY.sala, codigo: 'AB2CD3' },
    })

    render(await SalaPage({ params }))

    expect(screen.getByLabelText('NPC Aventureiro')).toHaveTextContent('Vilão')
    expect(screen.getByLabelText('Molde')).toHaveTextContent('Goblin')
    expect(screen.queryByLabelText('Seu personagem na sala')).not.toBeInTheDocument()
  })

  it('deve manter a sala atualizada por SSE', async () => {
    const { container } = render(await SalaPage({ params }))

    expect(container.querySelector('[data-sala="r-1"]')).not.toBeNull()
  })

  it.each([404, 422])('deve responder 404 quando o controller devolve %s', async (status) => {
    lobbyMock.controlarLobby.mockRejectedValue(new AppError('x', status, 'X'))

    await expect(SalaPage({ params })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFoundMock).toHaveBeenCalled()
  })

  it('deve deixar erro inesperado subir, sem virar 404', async () => {
    lobbyMock.controlarLobby.mockRejectedValue(new Error('banco fora'))

    await expect(SalaPage({ params })).rejects.toThrow('banco fora')
    expect(notFoundMock).not.toHaveBeenCalled()
  })
})
