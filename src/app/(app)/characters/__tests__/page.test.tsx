import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { controllerMock } = vi.hoisted(() => ({
  controllerMock: { controlarListagem: vi.fn() },
}))

vi.mock('@/server/personagens/personagens.controller', () => controllerMock)

import CharactersPage from '@/app/(app)/characters/page'

const FICHA = {
  id: 'p-1',
  name: 'Bree',
  level: 3,
  isNpc: false,
  isVisibleToMaster: true,
  hpMax: 25,
  hpCurrent: 18,
  armorClass: 12,
  initiativeMod: 2,
  proficiencyBonus: 2,
  species: { name: 'Human' },
  srdClass: { name: 'Fighter' },
}

describe('Lista de personagens', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deve listar as fichas do usuário com link para cada uma', async () => {
    controllerMock.controlarListagem.mockResolvedValue([FICHA])

    render(await CharactersPage())

    expect(screen.getByRole('heading', { name: 'Seus personagens' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Bree/ })).toHaveAttribute('href', '/characters/p-1')
    expect(screen.getByRole('link', { name: 'Nova ficha' })).toHaveAttribute(
      'href',
      '/characters/new',
    )
  })

  it('deve convidar à primeira ficha quando a lista está vazia', async () => {
    controllerMock.controlarListagem.mockResolvedValue([])

    render(await CharactersPage())

    expect(screen.getByText(/Nenhuma ficha ainda/u)).toBeInTheDocument()
  })
})
