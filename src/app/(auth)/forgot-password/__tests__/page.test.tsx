import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import ForgotPasswordPage from '@/app/(auth)/forgot-password/page'

describe('Página de esqueci a senha', () => {
  it('deve renderizar a solicitação de redefinição', () => {
    render(<ForgotPasswordPage />)

    expect(screen.getByLabelText(/e-mail da conta/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enviar link/i })).toBeInTheDocument()
  })
})
