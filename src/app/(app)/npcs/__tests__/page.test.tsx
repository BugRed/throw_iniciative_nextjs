import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { controllerMock } = vi.hoisted(() => ({
  controllerMock: { controlarCatalogo: vi.fn(), controlarMoldes: vi.fn() },
}))

vi.mock('@/server/npcs/npcs.controller', () => controllerMock)
vi.mock('@/app/(app)/npcs/actions', () => ({ acaoExcluirMolde: vi.fn() }))

import NpcsPage from '@/app/(app)/npcs/page'

describe('Página de NPCs de respawn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve mostrar moldes do usuário e o catálogo do SRD com link para editar', async () => {
    controllerMock.controlarMoldes.mockResolvedValue([
      { id: 'm-1', name: 'Goblin forte', hpMax: 12, armorClass: 13, initiativeMod: 2 },
    ])
    controllerMock.controlarCatalogo.mockResolvedValue([
      {
        id: 'x',
        slug: 'goblin-minion',
        name: 'Goblin Minion',
        challengeRating: 0.125,
        type: 'fey',
      },
    ])

    render(await NpcsPage())

    expect(screen.getByText('Goblin forte')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Goblin Minion/ })).toHaveAttribute(
      'href',
      '/npcs/new?monstro=goblin-minion',
    )
    expect(screen.getByRole('link', { name: 'Molde do zero' })).toHaveAttribute('href', '/npcs/new')
  })

  it('deve orientar quando ainda não há moldes', async () => {
    controllerMock.controlarMoldes.mockResolvedValue([])
    controllerMock.controlarCatalogo.mockResolvedValue([])

    render(await NpcsPage())

    expect(screen.getByText(/Nenhum molde ainda/u)).toBeInTheDocument()
  })
})
