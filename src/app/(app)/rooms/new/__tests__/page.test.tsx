import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/app/(app)/rooms/actions', () => ({ acaoCriarSala: vi.fn(), acaoPedirEntrada: vi.fn() }))

import EntrarSalaPage from '@/app/(app)/rooms/join/page'
import NovaSalaPage from '@/app/(app)/rooms/new/page'

describe('Páginas de criar e entrar em sala', () => {
  it('deve avisar quem cria a sala que ninguém entra sem a sua aprovação', () => {
    render(<NovaSalaPage />)

    expect(screen.getByRole('heading', { name: 'Criar sala' })).toBeInTheDocument()
    expect(screen.getByText(/ninguém entra sem a sua aprovação/)).toBeInTheDocument()
    expect(screen.getByLabelText('Nome da sala')).toBeInTheDocument()
  })

  it('deve avisar quem entra que o mestre precisa aceitar o pedido', () => {
    render(<EntrarSalaPage />)

    expect(screen.getByRole('heading', { name: 'Entrar em uma sala' })).toBeInTheDocument()
    expect(screen.getByText(/precisa aceitar o seu pedido/)).toBeInTheDocument()
    expect(screen.getByLabelText('Código da sala')).toBeInTheDocument()
  })
})
