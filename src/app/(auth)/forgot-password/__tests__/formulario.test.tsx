import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requestPasswordResetMock } = vi.hoisted(() => ({ requestPasswordResetMock: vi.fn() }))

vi.mock('@/shared/lib/auth-client', () => ({
  authClient: {
    requestPasswordReset: (...args: unknown[]) => requestPasswordResetMock(...args),
  },
}))

import { FormularioEsqueci } from '@/app/(auth)/forgot-password/formulario'

describe('Formulário de esqueci a senha', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('quando a solicitação é aceita', () => {
    it('deve pedir o e-mail e prometer o link de redefinição', async () => {
      requestPasswordResetMock.mockResolvedValue({ error: null })
      const user = userEvent.setup()

      render(<FormularioEsqueci />)
      await user.type(screen.getByLabelText(/e-mail da conta/i), 'aria@teste.dev')
      await user.click(screen.getByRole('button', { name: /enviar link/i }))

      expect(requestPasswordResetMock).toHaveBeenCalledWith({
        email: 'aria@teste.dev',
        redirectTo: expect.stringContaining('/reset-password'),
      })
      expect(await screen.findByText(/enviamos um link/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: '/dev/caixa-de-entrada' })).toHaveAttribute(
        'href',
        '/dev/caixa-de-entrada',
      )
    })
  })

  describe('quando a solicitação falha', () => {
    it('deve exibir o motivo sem prometer envio', async () => {
      requestPasswordResetMock.mockResolvedValue({ error: { message: 'Muitas tentativas' } })
      const user = userEvent.setup()

      render(<FormularioEsqueci />)
      await user.type(screen.getByLabelText(/e-mail da conta/i), 'aria@teste.dev')
      await user.click(screen.getByRole('button', { name: /enviar link/i }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Muitas tentativas')
      expect(screen.queryByText(/enviamos um link/i)).not.toBeInTheDocument()
    })
  })
})
