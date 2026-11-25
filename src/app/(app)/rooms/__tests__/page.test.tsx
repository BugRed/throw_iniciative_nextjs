import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { controllerMock, iniciativaMock } = vi.hoisted(() => ({
  controllerMock: { controlarMinhasSalas: vi.fn() },
  iniciativaMock: { controlarSalaAtiva: vi.fn(), controlarPedidoDePause: vi.fn() },
}))

vi.mock('@/server/salas/salas.controller', () => controllerMock)
vi.mock('@/server/iniciativa/iniciativa.controller', () => iniciativaMock)

import SalasPage from '@/app/(app)/rooms/page'

beforeEach(() => {
  vi.clearAllMocks()
  iniciativaMock.controlarSalaAtiva.mockResolvedValue(null)
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

  it('deve oferecer "Solicitar pause" só a quem está em combate em outra sala', async () => {
    controllerMock.controlarMinhasSalas.mockResolvedValue([])
    iniciativaMock.controlarSalaAtiva.mockResolvedValue({
      id: 'r-9',
      nome: 'Mesa 9',
      masterUserId: 'm',
    })

    render(await SalasPage())

    expect(screen.getByText('Mesa 9')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Solicitar pause' })).toBeInTheDocument()
  })

  it('não deve mostrar o aviso de combate a quem não está em sala ativa', async () => {
    controllerMock.controlarMinhasSalas.mockResolvedValue([])

    render(await SalasPage())

    expect(screen.queryByRole('button', { name: 'Solicitar pause' })).not.toBeInTheDocument()
  })
})
