import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// vi.mock é içado acima dos imports: a referência precisa nascer em vi.hoisted
const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }))

vi.mock('@/server/auth/session', () => ({
  getSession: () => getSessionMock(),
}))

import Home from '@/app/(app)/page'

describe('Landing do Throw Iniciative', () => {
  it('renderiza o título do produto', async () => {
    getSessionMock.mockResolvedValue(null)
    render(await Home())
    expect(screen.getByRole('heading', { level: 1, name: /throw iniciative/i })).toBeInTheDocument()
  })

  describe('quando não há sessão', () => {
    it('oferece entrada e cadastro', async () => {
      getSessionMock.mockResolvedValue(null)
      render(await Home())
      expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
      expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/register')
    })
  })

  describe('quando há sessão', () => {
    it('oferece o atalho para o painel', async () => {
      getSessionMock.mockResolvedValue({
        session: { id: 's1' },
        user: {
          id: 'u1',
          name: 'Aria',
          email: 'aria@teste.dev',
          emailVerified: true,
          image: null,
        },
      })
      render(await Home())
      expect(screen.getByRole('link', { name: /ir para o painel/i })).toHaveAttribute(
        'href',
        '/dashboard',
      )
    })
  })

  it('apresenta os três destaques do produto', async () => {
    getSessionMock.mockResolvedValue(null)
    render(await Home())
    expect(screen.getByRole('heading', { name: 'Fila em tempo real' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Dado d20 do servidor' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Timer com passe automático' })).toBeInTheDocument()
  })
})
