import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { controllerMock } = vi.hoisted(() => ({ controllerMock: { controlarMinhasSalas: vi.fn() } }))

vi.mock('@/server/salas/salas.controller', () => controllerMock)

import SalasPage from '@/app/(app)/rooms/page'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Página de salas', () => {
  it('deve listar as salas do usuário com o estado de cada uma e link para o lobby', async () => {
    controllerMock.controlarMinhasSalas.mockResolvedValue([
      { id: 'r-1', name: 'Mesa de sexta', status: 'lobby' },
      { id: 'r-2', name: 'One-shot', status: 'paused' },
    ])

    render(await SalasPage())

    expect(screen.getByRole('link', { name: /Mesa de sexta/ })).toHaveAttribute(
      'href',
      '/rooms/r-1',
    )
    expect(screen.getByText('Pausada')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Criar sala' })).toHaveAttribute('href', '/rooms/new')
    expect(screen.getByRole('link', { name: 'Entrar com código' })).toHaveAttribute(
      'href',
      '/rooms/join',
    )
  })

  it('deve orientar quando o usuário ainda não está em nenhuma sala', async () => {
    controllerMock.controlarMinhasSalas.mockResolvedValue([])

    render(await SalasPage())

    expect(screen.getByText(/ainda não está em nenhuma sala/)).toBeInTheDocument()
  })
})
