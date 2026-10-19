import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { resetPasswordMock, paramsMock } = vi.hoisted(() => ({
  resetPasswordMock: vi.fn(),
  paramsMock: { get: vi.fn() },
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => paramsMock,
}))

vi.mock('@/shared/lib/auth-client', () => ({
  authClient: {
    resetPassword: (...args: unknown[]) => resetPasswordMock(...args),
  },
}))

import { PainelRedefinicao } from '@/app/(auth)/reset-password/painel'

describe('Painel de redefinição de senha', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    paramsMock.get.mockImplementation((chave: string) => (chave === 'token' ? 'tok-1' : null))
  })

  describe('quando o link traz token válido', () => {
    it('deve redefinir a senha e liberar o login', async () => {
      resetPasswordMock.mockResolvedValue({ error: null })
      const user = userEvent.setup()

      render(<PainelRedefinicao />)
      await user.type(screen.getByLabelText(/nova senha/i), 'nova-senha-segura')
      await user.click(screen.getByRole('button', { name: /redefinir senha/i }))

      expect(resetPasswordMock).toHaveBeenCalledWith({
        newPassword: 'nova-senha-segura',
        token: 'tok-1',
      })
      expect(await screen.findByText('Senha redefinida!')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /entrar com a nova senha/i })).toHaveAttribute(
        'href',
        '/login',
      )
    })

    it('deve exibir o motivo quando o token é recusado', async () => {
      resetPasswordMock.mockResolvedValue({ error: { message: 'Token expirado' } })
      const user = userEvent.setup()

      render(<PainelRedefinicao />)
      await user.type(screen.getByLabelText(/nova senha/i), 'nova-senha-segura')
      await user.click(screen.getByRole('button', { name: /redefinir senha/i }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Token expirado')
    })
  })

  describe('quando o link não traz token', () => {
    it('deve recusar o envio apontando nova solicitação', async () => {
      paramsMock.get.mockImplementation(() => null)
      const user = userEvent.setup()

      render(<PainelRedefinicao />)
      await user.type(screen.getByLabelText(/nova senha/i), 'nova-senha-segura')
      await user.click(screen.getByRole('button', { name: /redefinir senha/i }))

      expect(await screen.findByRole('alert')).toHaveTextContent(/Link inválido/)
      expect(resetPasswordMock).not.toHaveBeenCalled()
    })
  })
})
