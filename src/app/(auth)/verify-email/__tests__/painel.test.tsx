import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { verifyEmailMock, paramsMock } = vi.hoisted(() => ({
  verifyEmailMock: vi.fn(),
  paramsMock: { get: vi.fn() },
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => paramsMock,
}))

vi.mock('@/shared/lib/auth-client', () => ({
  authClient: {
    verifyEmail: (...args: unknown[]) => verifyEmailMock(...args),
  },
}))

import { PainelVerificacao } from '@/app/(auth)/verify-email/painel'

describe('Painel de verificação de e-mail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    paramsMock.get.mockImplementation((chave: string) => (chave === 'token' ? 'tok-1' : null))
  })

  describe('quando o token é válido', () => {
    it('deve confirmar a verificação e liberar o login', async () => {
      verifyEmailMock.mockResolvedValue({ error: null })

      render(<PainelVerificacao />)

      expect(verifyEmailMock).toHaveBeenCalledWith({ query: { token: 'tok-1' } })
      expect(await screen.findByText(/E-mail verificado!/)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
    })
  })

  describe('quando o token é recusado', () => {
    it('deve explicar link inválido ou expirado', async () => {
      verifyEmailMock.mockResolvedValue({ error: { message: 'Token expirado' } })

      render(<PainelVerificacao />)

      expect(await screen.findByText(/Link inválido ou expirado/i)).toBeInTheDocument()
    })
  })

  describe('quando o link não traz token', () => {
    it('deve mostrar link inválido sem chamar a verificação', () => {
      paramsMock.get.mockImplementation(() => null)

      render(<PainelVerificacao />)

      expect(screen.getByText(/Link inválido ou expirado/i)).toBeInTheDocument()
      expect(verifyEmailMock).not.toHaveBeenCalled()
    })
  })
})
